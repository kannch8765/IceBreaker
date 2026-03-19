# Technical Specification: Animal Icon Generator

Detailed blueprint for the modular Python pipeline using Google Imagen (Vertex AI).

## 1. Directory Structure

```text
/scripts/icon-generator/
├── main.py            # Entry point, orchestration logic
├── config.py          # Configuration & Constants (Animal list, styles)
├── client.py          # Vertex AI / Imagen API wrapper
├── processor.py       # Image post-processing (PIL)
└── .env               # API Credentials (local only)
```

## 2. Component Design

### 2.1 API Wrapper (`client.py`)
- **Library:** `google-cloud-aiplatform`
- **Method:** `ImageGenerationModel.from_pretrained("image-generation@006")`
- **Function:** `generate_images(prompt: str, number_of_images: int = 4)`
- **Retry Logic:** 
  - Implementation using `tenacity`.
  - Handle `ResourceExhausted` (Rate Limit) with exponential backoff.
  - Initial delay: 2s, Max delay: 60s, Max attempts: 5.

### 2.2 Orchestration (`main.py`)
- **`batch_generate()`**:
  - Load animal list from `config.py`.
  - Iterate through animals.
  - For each animal, iterate through "mood" style variations.
  - Save metadata (prompt, seed, timestamp) alongside images for reproducibility.

### 2.3 Post-Processor (`processor.py`)
- **Transparency:** Optional background removal if "white background" is inconsistent.
- **Resizing:** Ensure uniform 512x512 output.
- **Format:** Ensure standard PNG with optimized compression.

## 3. Style & Prompting Specification

### 3.1 Prompt Template
```python
PROMPT_TEMPLATE = (
    "Minimalist flat vector icon of a {animal}, "
    "style: {style}, {palette} color palette, "
    "no outlines, no shadows, white background, "
    "high quality, UI icon kit style."
)
```

### 3.2 Style Variations
| Style Name | Description | Palette Example |
|---|---|---|
| **Lilac Fusion** | Soft, modern, light | Pastel Purples, Cyans |
| **Dark Forest** | Deep, high-contrast | Emerald, Black, Dark Grey |
| **Solar Flare** | Warm, energetic | Golden Yellow, Burnt Orange |
| **Earth Tone** | Neutral, grounded | Terracotta, Olive, Sand |

## 4. Rate Limiting & Quota Management
- Google Cloud Vertex AI typically has a QPM (Queries Per Minute) limit. 
- **Implementation:** Add `time.sleep(x)` between batches or use a semaphore-based rate limiter if running asynchronously.

## ## 6. Optional Improvements & Advanced Controls

- **Seed Control:** Allow passing a specific seed to the `generate_images` function to "lock" a style that works well for one animal and apply it to others.
- **Alpha Channel Optimization:** Use a Python library like `rembg` (Remove Background) to automatically convert the "white background" from Imagen into a proper transparent PNG.
- **Style Locking:** Store the prompt and seed for the "perfect" icon in a `manifest.json` file, allowing for easy regeneration of individual icons if the style needs to be tweaked.
- **Batch Resizing:** Automatically generate multiple sizes (128x128, 256x256, 512x512) for better performance in the Next.js app.
