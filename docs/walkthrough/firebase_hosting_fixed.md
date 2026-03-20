# Walkthrough: Firebase Hosting Safety Fix

## Changes Made
Applied a production safety fix to `firebase.json` to prevent the catch-all rewrite from hijacking static assets.

### [MODIFY] [firebase.json](file:///d:/Github_Repos/IceBreaker/firebase.json)
Updated the Hosting `rewrites` configuration.

```diff
-        "source": "**",
+        "source": "/((?!_next).*)",
         "destination": "/index.html"
```

## Validation Results
- **Pattern Logic**: The regex `/((?!_next).*)` uses a negative lookahead to match any path that DOES NOT start with `_next`. 
- **Static Assets**: Requests to `/_next/static/...` will no longer match the rewrite rule. If the file exists, it is served. If it's missing, it returns a 404 (preventing `Unexpected token '<'`).
- **SPA Routing**: Client-side routing still works as the rewrite still catches path-based navigation (e.g., `/hall`, `/room`) that doesn't start with `_next`.

## Next Steps for USER
To apply these changes into production, run:
1. `npm run build`
2. `firebase deploy --only hosting`
