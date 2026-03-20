# 🔍 ResultStep Topic Crash Audit

## 1. Identify Mismatch

**What `topic` actually is at runtime:**
Due to the multi-lingual payload structure coming from Firestore, each element in the `aiTopics` array is fundamentally a localized dictionary object structured as: `{ en: "string", cn: "string", jp: "string" }`.

**What React expects:**
When rendering a variable directly into the DOM (e.g., `<p>{topic}</p>`), React expects valid rendering primitives such as strings, numbers, or React Elements.

**Why rendering fails:**
React natively blocks the rendering of raw JavaScript objects to prevent unintended data leaks and unsafe object serialization. When the engine encounters the `{en, cn, jp}` object, it aborts the render tree immediately and throws Minified React Error #31.

---

## 2. Reject False Hypotheses

- **NOT caused by array length:** The `.map()` function iterates perfectly. The size of the `aiTopics` array is irrelevant to the crash.
- **NOT caused by parsing failure:** The Firestore payload successfully transmitted and parsed perfectly valid JavaScript objects. There is no corrupt JSON data.
- **NOT caused by translation system:** The `t()` function context and `translations.ts` dictionary are completely intact, functionally correct, and entirely disconnected from this specific crash.

---

## 3. Root Cause

The crash is strictly a runtime data shape vs. render mismatch. The `topic` iterator is yielding an object, but React absolutely cannot render objects as JSX text children. To successfully render the UI, a primitive string must be explicitly extracted from the object before being placed in the DOM.

---

## 4. Fix Direction

To resolve the crash without altering the backend, the `ResultStep.tsx` rendering logic must be adjusted to explicitly extract the correct localized string:

- **Selecting the correct language:** Inject the current `language` state from `useOnboardingStore`. Instead of rendering `{topic}`, use brackets to index the object based on the active language (e.g., render the value of `topic[language]`).
- **Handling missing languages safely:** Use a logical OR operator to gracefully fall back to English if the specific language key is missing from the payload (e.g., `topic[language] || topic.en`).

---

## 5. Optional Robustness

Because the backend payload could theoretically change (e.g., returning simple strings in legacy rooms, or Vertex AI failing to format the localization JSON), you can guard the UI against all unexpected shapes using a runtime type check:

Check if `typeof topic === 'string'`. 
- If true, the system gracefully renders `topic` directly. 
- If false, the system assumes it is the multi-lingual JSON object and extracts the localized string via the `language` key fallback. 

This simple guard ensures the UI becomes bulletproof against any backend payload variations.
