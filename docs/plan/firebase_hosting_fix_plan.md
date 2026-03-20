# Implementation Plan: Firebase Hosting Configuration Optimization

This plan outlines the steps to resolve the "Unexpected token '<'" and `ChunkLoadError` issues by refining the Firebase Hosting configuration for the static Next.js export.

## User Review Required

> [!IMPORTANT]
> This change modifies how the server handles missing files. Instead of falling back to `index.html` for every path (which was causing JS errors), it will now return a 404 for missing static assets (`_next/**`, `images/**`). This is the correct behavior for production stability but assumes all required assets are correctly deployed in the `out/` folder.

## Proposed Changes

### Firebase Configuration

#### [MODIFY] [firebase.json](file:///d:/Github_Repos/IceBreaker/firebase.json)
Update the `hosting` section to include:
- `cleanUrls: true` for SEO-friendly URLs.
- `trailingSlash: true` to align with Next.js static export.
- Negative lookahead rewrite pattern to protect static assets from being hijacked by the SPA root.

## Verification Plan

### Automated Verification
1. **Lint Check**: Ensure the `firebase.json` is valid JSON.
2. **Build Verification**: Run `npm run build` to ensure the `out/` directory and `_next` structure are generated correctly.

### Manual Verification
1. **Asset Integrity Test**: 
   - Open the deployed site.
   - Using the Browser Network Tab, confirm that all `.js` and `.css` files have exactly the `application/javascript` or `text/css` content-type.
   - Verify that no static assets are being returned as `text/html`.
2. **Routing Test**:
   - Navigate to `/hall/` and `/room/` via the UI.
   - Perform a hard refresh (Ctrl+F5) on `/hall/`. Verify the page loads correctly without a flash of the homepage or console errors.
3. **404 Fallback Test**:
   - Manually type a non-existent URL like `/this-page-does-not-exist`.
   - Verify it redirects/rewrites to the main `index.html` (SPA fallback) or shows the custom 404 page if configured.
   - Manually request a non-existent chunk like `/_next/static/chunks/missing.js`. Verify it returns a **404**, NOT the homepage HTML.
