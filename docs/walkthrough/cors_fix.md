# Walkthrough: Firebase Storage CORS Fix

## 🎯 The Problem
The `uploadBytes` Promise hangs indefinitely, and the browser console throws a **CORS error**: `"Response to preflight request doesn't pass access control check"`.
By default, Firebase/Google Cloud Storage buckets reject client-side uploads originating directly from an external web domain like `https://gdg-hackathon-2026-aquila314.web.app`.

## 🛠 The Fix
We need to explicitly whitelist the production domain in the bucket's internal CORS policies. I have generated a `cors.json` configuration file at the root of the project to do this.

**`cors.json` Contents:**
```json
[
  {
    "origin": ["https://gdg-hackathon-2026-aquila314.web.app"],
    "method": ["GET", "POST", "PUT"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type"]
  }
]
```

## 🚀 Execution Command
Open an authenticated terminal (Google Cloud SDK / gsutil) and run exactly:

```bash
gsutil cors set cors.json gs://gdg-hackathon-2026-aquila314.firebasestorage.app
```

## 🧪 Verification Steps
Once the command registers successfully, test the deployed URL again:

1. **Upload Execution:** Click "Use Photo" in the camera experience.
2. **Network Check:** The browser `OPTIONS` preflight request will now return a `200 OK` payload.
3. **Console Logs:** You will definitively see the `STEP 3: upload success` trace log. `uploadBytes` will resolve successfully instead of blocking the promise.
4. **UI Recovery:** The loading spinner will disappear properly as the flow continues to Firestore generation.
