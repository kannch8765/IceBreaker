# i18n Frontend Audit Review

## Overview
An audit of all UI-related frontend files was conducted to ensure every user-facing string is properly internationalized using the existing `t()` function. Hardcoded strings were found in several components and have been replaced with proper i18n keys.

## List of Newly Added Translation Keys
The following keys were added to `src/lib/translations.ts` across `en`, `jp`, and `cn` locales:

- `egName`: "e.g. Alex"
- `maxChars`: "Max 15 characters"
- `selectDropdown`: "Select"
- `cameraError`: "Could not access camera. Please allow permissions."
- `imageCaptureFailed`: "Image capture failed. Please retake."
- `roomIdMissing`: "Room ID missing. Cannot upload."
- `failedToUpload`: "Failed to upload image. Please try again."
- `failedToAttach`: "Failed to attach image to room context."
- `captureYourVibe`: "Capture your vibe"
- `goBack`: "Go Back"
- `uploadingVibe`: "Uploading visual vibe..."
- `connecting`: "Connecting..."
- `oops`: "Oops!"
- `forgingProfileError`: "An error occurred while forging your profile."
- `retryAnalysis`: "Retry Analysis"
- `stillWorkingAI`: "Still working... Vertex AI is taking a moment to craft your perfect topics."
- `takingLonger`: "Taking a bit longer than expected..."
- `generatingIceBreakersError`: "An error occurred while generating your ice-breaker questions."
- `retryConnection`: "Retry Connection"
- `yourAnswer`: "Your answer..."
- `anonymous`: "Anonymous"
- `mysterious`: "Mysterious"
- `noTopicsGenerated`: "No topics generated."

## Modified Files (BEFORE → AFTER)

### 1. `src/components/mobile/IdentityStep.tsx`
```diff
- <input placeholder="e.g. Alex" />
+ <input placeholder={t('egName')} />

- <p>Max 15 characters</p>
+ <p>{t('maxChars')}</p>

- <option value="" disabled>Select</option>
+ <option value="" disabled>{t('selectDropdown')}</option>
```

### 2. `src/components/mobile/MoodStep.tsx`
```diff
- const errorMsg = (t as any)('cameraError') || "Could not access camera. Please allow permissions.";
+ const errorMsg = t('cameraError');

- setCameraError("Image capture failed. Please retake.");
+ setCameraError(t('imageCaptureFailed'));

- setCameraError("Room ID missing. Cannot upload.");
+ setCameraError(t('roomIdMissing'));

- setCameraError("Failed to attach image to room context.");
+ setCameraError(t('failedToAttach'));

- setCameraError(err.message || "Failed to upload image. Please try again.");
+ setCameraError(err.message || t('failedToUpload'));

- {(t as any)('snapVibe') || "Capture your vibe"}
+ {t('captureYourVibe')}

- <Button>Go Back</Button>
+ <Button>{t('goBack')}</Button>

- {isUploading ? "Uploading visual vibe..." : "Connecting..."}
+ {isUploading ? t('uploadingVibe') : t('connecting')}
```

### 3. `src/components/mobile/ProcessingStep.tsx`
```diff
- {uiState === 'error' ? "Oops!" : t('analyzingProfile')}
+ {uiState === 'error' ? t('oops') : t('analyzingProfile')}

- <p className="text-red-500 font-medium">An error occurred while forging your profile.</p>
+ <p className="text-red-500 font-medium">{t('forgingProfileError')}</p>

- {isRetrying ? <Loader2 ... /> : "Retry Analysis"}
+ {isRetrying ? <Loader2 ... /> : t('retryAnalysis')}

- Still working... Vertex AI is taking a moment to craft your perfect topics.
+ {t('stillWorkingAI')}
```

### 4. `src/components/mobile/QuestionsStep.tsx`
```diff
- Taking a bit longer than expected...
+ {t('takingLonger')}

- <h2 className="text-2xl font-bold mb-2 text-red-500">Oops!</h2>
+ <h2 className="text-2xl font-bold mb-2 text-red-500">{t('oops')}</h2>

- {error || "An error occurred while generating your ice-breaker questions."}
+ {error || t('generatingIceBreakersError')}

- {isRetrying ? <Loader2 ... /> : "Retry Connection"}
+ {isRetrying ? <Loader2 ... /> : t('retryConnection')}

- <textarea placeholder="Your answer..." />
+ <textarea placeholder={t('yourAnswer')} />
```

### 5. `src/components/mobile/ResultStep.tsx`
```diff
- {formData.username || "Anonymous"}
+ {formData.username || t('anonymous')}

- {t('vibe')}: {formData.mood || "Mysterious"}
+ {t('vibe')}: {formData.mood || t('mysterious')}

- <p className="text-xs text-gray-400 italic">No topics generated.</p>
+ <p className="text-xs text-gray-400 italic">{t('noTopicsGenerated')}</p>
```

### 6. `src/components/hall/LobbyClient.tsx`
```diff
- <span>{p.username || 'Anonymous'}</span>
+ <span>{p.username || t('anonymous')}</span>
```

## Ambiguous Strings Requiring Clarification

During the translation extraction process, a few strings were mapped that may require human review to ensure they match the application's intended "tone and vibe" across different locales:

1. **`anonymous` ("Anonymous")**:
   - Used as a fallback when a user hasn't provided a resulting username. We mapped this to "匿名" in JP. Is it too formal? Consider "ゲスト" (Guest) or "名無し" (Nameless) if the vibe should be more playful.

2. **`mysterious` ("Mysterious")**:
   - Used as a fallback mood when none is provided. Mapped to "ミステリアス" in JP. Does this fit the fun atmosphere, or should it be "ひみつ" (Secret)?

3. **`oops` ("Oops!")**:
   - Used for error states. Mapped to "おっと！" in JP. Ensure this sounds natural in context with the rest of the application's error handling.
   
4. **`captureYourVibe` ("Capture your vibe")**:
   - Mapped to "今の雰囲気を写真でシェア" (Share your current vibe with a photo). This is slightly descriptive but fits the UI context well.
