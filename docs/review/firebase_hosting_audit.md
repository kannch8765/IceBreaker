# Firebase Hosting Configuration Audit

## 1. Root Cause Analysis

### The Problem: Over-aggressive Catch-all Rewrite
The current `firebase.json` contains a global catch-all rewrite:
```json
"rewrites": [
  {
    "source": "**",
    "destination": "/index.html"
  }
]
```

### Impact on Static Assets (`_next/static`)
When Next.js attempts to load a dynamic chunk (e.g., `_next/static/chunks/123.js`) and that file is either missing, has a mismatched hash after a new deployment, or is otherwise not found by the server, Firebase Hosting applies the rewrite rule.
- **Expected**: A 404 error (which the client-side router can sometimes handle) or the actual JS file.
- **Actual**: Firebase Hosting serves the content of `/index.html` with a `200 OK` status for the `.js` path.
- **Result**: The browser attempts to parse the HTML (`<!DOCTYPE html>...`) as JavaScript. Since `<` is not valid JS syntax at the start of a file, it throws:
  > `Uncaught SyntaxError: Unexpected token '<'`
- **ChunkLoadError**: Because the returned "script" is invalid, the component fails to mount, leading to a `ChunkLoadError`.

### Impact on Client-Side Routing
Next.js static export generates a specific directory structure. With `trailingSlash: true` in `next.config.ts`, it creates directories like `out/hall/index.html`. 
The `**` rewrite forces every single request to load the root `index.html`. This bypasses the benefit of pre-rendered HTML for sub-pages and forces the browser to re-render everything from the root on every hard refresh, even though the specific HTML for that route exists in the `out/` folder.

## 2. Identified Risks

1. **Cache Poisoning**: Browsers or CDNs might cache the `index.html` response under a `.js` path if not careful, causing persistent breakages for returning users after a deployment.
2. **SEO Degradation**: Crawlers visiting `/hall/` will receive the root homepage HTML instead of the pre-rendered content for the hall, potentially indexing incorrect metadata.
3. **Production Stability**: Any slight delay in deployment synchronization (where some assets are uploaded but not all) will immediately crash the app for users instead of showing a standard 404 or a "Loading..." state.

## 3. Proposed Configuration

### Fixed `firebase.json` (Hosting Section)

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "cleanUrls": true,
    "trailingSlash": true,
    "rewrites": [
      {
        "source": "!@(_next|images|favicon.ico)/**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Why this works:
1. **`cleanUrls: true`**: Automatically handles `.html` extension stripping and redirecting.
2. **`trailingSlash: true`**: Aligns with `next.config.ts`. Next.js ensures `/hall/` is the canonical path.
3. **Surgical Rewrite**: The `!@(_next|images|favicon.ico)/**` pattern specifically **excludes** static assets and internal Next.js files from the catch-all. If a JS chunk is missing, Firebase will return a 404 (standard behavior) instead of hijacking it with `index.html`.

## 4. Implementation Plan

### Step 1: Update Configuration
Modify `firebase.json` in the root directory to match the proposed config above.

### Step 2: Build & Export
Run the standard Next.js build and export process to ensure the `out/` directory is fresh and matches the expected structure.
```powershell
npm run build
```

### Step 3: Deploy to Firebase
Deploy the hosting configuration and the static files.
```powershell
firebase deploy --only hosting
```

### Step 4: Verification
1. **Initial Load**: Visit the root URL. Check the Network tab to ensure all `_next/static` assets return `200 OK` with `Content-Type: application/javascript`.
2. **Sub-page Direct Navigation**: Visit `/hall/` directly in the browser. Verify the response is the specific HTML for the hall, not a rewrite of the root index.
3. **404 Check**: Attempt to visit a non-existent JS file (e.g., `/_next/static/non-existent.js`). Verify the server returns a `404` error instead of the `index.html` content.

## 5. Validation Checklist

- [ ] `_next/static` assets return `application/javascript` (not `text/html`).
- [ ] Direct navigation to `/hall/` shows correct pre-rendered content.
- [ ] No `Unexpected token '<'` errors in console.
- [ ] `ChunkLoadError` is resolved on navigation.
- [ ] `cleanUrls` is active (visiting `/hall` redirects to `/hall/` or vice versa correctly).
