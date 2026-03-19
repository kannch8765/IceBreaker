# Infinite Re-render Audit 

## 1. Problematic Component(s)
- **Component:** `src/components/mobile/ProcessingStep.tsx`
- **Context Provider:** `src/context/OnboardingContext.tsx`

## 2. Problematic `useEffect`(s)
**In `ProcessingStep.tsx`:**
```typescript
useEffect(() => {
  if (uiState === 'profile_ready') {
    nextStep();
  }
}, [uiState, nextStep]);
```
**Why it fails:** This `useEffect` continuously re-runs because one of its dependencies, the `nextStep` function, changes its memory reference upon every top-level state change (every render) in `OnboardingProvider`.

---

## 3. Loop Mechanism (Step-by-Step)
1. **The Trigger:** The Firestore state listener pulls down the `ready` signal, updating `useParticipantStatus` to output `uiState === 'profile_ready'`.
2. **First Run:** `ProcessingStep.tsx` evaluates its `useEffect`, sees the ready state, and executes `nextStep()`.
3. **State Mutation:** `nextStep()` runs `setStep((s) => s + 1)`, incrementing `step` from `5` to `6`.
4. **Provider Re-render:** The `OnboardingProvider` detects the `step` change and re-renders to pass the new value to its children. 
5. **Reference Recreation:** During this re-render, `OnboardingProvider` executes its body: `const nextStep = () => setStep((s) => s + 1);`. Because it is not wrapped in `useCallback`, a **brand new memory reference** is created for `nextStep`.
6. **Animation Delay:** `StepManager.tsx` begins conditionally mapping `step === 6` to mount the `ResultStep`. At the same time, it begins unmounting `ProcessingStep`. **However**, because the component is wrapped in `<AnimatePresence mode="wait">`, `ProcessingStep` survives in the DOM to play its fade-out exit animation.
7. **The Fatal Trap:** While `ProcessingStep` is animating its exit, React triggers a re-evaluation of its hooks (since it is still technically mounted). React compares the `useEffect` dependencies: `uiState` is the same, but the `nextStep` dependency reference has changed!
8. **The Loop:** The `useEffect` fires *again*. It calls `nextStep()` again. `step` increments to `7`. The Provider generates a new reference, forcing the `useEffect` to fire again for `8`, `9`, `10`... until React violently crashes with the "Maximum update depth exceeded" limit.

---

## 4. Role of `useSearchParams`
In `OnboardingContext.tsx`, `useSearchParams()` is used within a `useEffect` to seed the `roomId` state:
```typescript
useEffect(() => {
  ...
  const room = searchParams.get('room');
  if (room) setRoomId(room);
}, [initialRoomId, searchParams]);
```
Although it is a common suspect for infinite loops, `useSearchParams()` actually returns a read-only object that maintains referential stability as long as the URL remains statically identical. Furthermore, even if it did trigger `setRoomId(room)` repeatedly, React's state bail-out optimization (checking if the primitive string value changed) aborts the render cycle. **`useSearchParams` is entirely innocent in the Result view crash.**

---

## 5. Root Cause Summary
The root cause is a toxic combination of three frontend mechanisms:
1. **Unmemoized Context Callbacks:** The `OnboardingProvider` fails to memoize its context functions (`nextStep`, `prevStep`, `updateFormData`).
2. **State-Driven Multi-Mounting:** Framer Motion's `AnimatePresence` intentionally artificially prolongs the lifecycle of components that are reacting to step changes.
3. **Auto-Executing Side-Effects:** A `useEffect` automatically triggers a top-level unmemoized mutation based on a static system state (`profile_ready`).

A simple `useCallback` caching the `nextStep` function in the context provider breaks this destructive chain entirely.
