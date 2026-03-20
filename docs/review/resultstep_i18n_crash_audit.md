# 🔍 ResultStep UI Crash Audit

## 1. EXACT Failure Identification

**The crash is NOT caused by `t()`!** The assumption that `t('key')` is returning an object is a red herring.

The React Minified Error #31 ("Objects are not valid as a React child... object with keys {en, cn, jp}") is actually occurring inside the `aiTopics` mapping loop. 

**What is happening:**
The backend Vertex AI pipeline is generating personalized ice-breaker topics. To support your multi-lingual app, the backend is returning each topic as a nested JSON object containing the translations, exactly structured as:
`{ en: "...", jp: "...", cn: "..." }`

When `useParticipant` pulls this from Firestore, it blindly loads these objects into the `aiTopics` array. React then attempts to render this object directly into the DOM as text, which triggers the fatal crash.

---

## 2. Translation System Inspection

- **TRANSLATIONS Structure:** The static translation dictionaries (`en`, `jp`, `cn`) in `src/lib/translations.ts` are perfectly formatted. The keys map directly to primitive strings.
- **`t()` Implementation:** `t()` works flawlessly. It correctly resolves strings via `TRANSLATIONS[language]?.[key]`.
- **The Red Herring:** Because the error explicitly complained about `{en, cn, jp}`, it naturally looked like a translation dictionary leak. However, the backend explicitly mirrored your language keys for dynamic content payload.

---

## 3. Mismatch Confirmation

- **What the UI expected:** `topic` to be a `string` (e.g., `"What is your favorite book?"`)
- **What the UI actually received:** `topic` is an object: `{ en: "What is your favorite...", jp: "一番好きな...", cn: "你最喜欢的..." }`

---

## 4. ALL Affected Lines

**File:** `src/components/mobile/ResultStep.tsx`

The crash happens precisely on **Line 94**:
```tsx
91: {aiTopics.length > 0 ? aiTopics.map((topic, i) => (
92:   <div key={i} className="...">
93:     <p className="...">
94:       {topic}  // <--- FATAL CRASH: Trying to render the {en, jp, cn} object as text
95:     </p>
96:   </div>
```

---

## 5. Minimal Fix Direction (NO CODE)

- **What `t()` should return:** Leave `t()` entirely alone. It is working correctly.
- **What is wrong:** The `aiTopics` array state is typed globally as `string[]`, but at runtime, Firestore injects it as an array of objects. 
- **Where to fix:** 
  1. Fix the rendering logic strictly inside `ResultStep.tsx`. Instead of rendering `{topic}`, you must dynamically extract the string using the active language instance (e.g., dynamically accessing the key like `topic[language]`).
  2. For safety forwards-compatibility (in case backend sometimes returns a string fallback), the component should assert `typeof topic === 'string' ? topic : topic[language]`.
  3. Optionally, update `OnboardingContext.tsx` to define `aiTopics` as `({ en: string, jp: string, cn: string } | string)[]` so TypeScript can warn you about this in the future.
