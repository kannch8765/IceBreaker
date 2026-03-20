# Diagnostic Guide: Firestore Recording Issues

If your Firestore is not recording answers during `npm run dev`, it is likely due to one of the following two reasons:

## 1. Firestore Rules are not Deployed
Even if the frontend is running locally, it communicates with the **Live Firestore Cloud instance**. If you haven't deployed the security rules, the cloud will reject all writes from your local machine.

**Action**: Run this command to deploy the rules from your local `firestore.rules` file:
```bash
firebase deploy --only firestore:rules
```
*Note: Ensure you are logged in (`firebase login`) and have the correct project selected (`firebase use default`).*

## 2. The Backend Worker is not Running
The "Answer Recording" flow follows this pipeline:
1. **Frontend**: Writes the answers (the `qa` field) to Firestore and sets the status to `waiting_for_ai`.
2. **Backend Worker**: Listens for `waiting_for_ai`, processes the answers with Gemini, and updates the status to `ready`.

If the `firestore_worker.py` is not running, the document will be stuck in a "pending" state. It might *look* like it didn't record if you are waiting for the UI to change, but the data might actually be there in the `qa` field!

**Action**: Start the Python backend worker in a separate terminal:
```bash
# Ensure you have the service account JSON file and it's set in your environment
python firestore_worker.py
```

## How to Check what's Wrong
1. **Check Browser Console (F12)**: If you see "Permission Denied" errors when clicking "Generate Card", it's definitely the **Rules** (Reason #1).
2. **Check Firestore Console**: Look at the participant document in `rooms/{roomId}/participants/{id}`. 
    - If the `qa` field exists but `status` is still `waiting_for_ai`, the problem is the **Worker** (Reason #2).
    - If the `qa` field is completely missing, it's a **Frontend Write / Rule** issue.
