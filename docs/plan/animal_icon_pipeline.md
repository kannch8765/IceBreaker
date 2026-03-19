# Proposed Plan: Batch Animal Icon Generation Pipeline

Design a robust, scalable, and reproducible pipeline for generating a consistent set of minimalist animal icons using Google Imagen API.

## User Review Required

> [!IMPORTANT]
> - Ensure your Vertex AI quota is sufficient for generating ~100 images (24 animals * 4 variations).
> - Verify that the `/public/icons/` directory is the intended location for frontend assets in this Next.js project.

## Proposed Changes

### 1. Project Structure & Environment
- **Script Folder:** `/scripts/icon-generator/`
  - `main.py`: Main execution script.
  - `utils.py`: API wrappers and retries.
  - `config.yaml`: Configuration (animal list, styles).
- **Output:** `/public/icons/{animal}/`
- **Dependency Management:** Use `uv` for a fast, reproducible Python environment.

### 2. Improved Prompt Template
To ensure consistency, we will use a structured prompt:
`Minimalist flat vector icon of a {animal}, muted colors, {mood} palette, UI icon style, no outlines, no shadows, white background, high quality.`

- **Variation Key:** `{mood}` (e.g., pastel, earth-tones, vibrant, dark-mode-optimized).

### 3. Neutral & UI-Friendly Animal List (24)
1. Fox 
2. Rabbit 
3. Bear 
4. Owl 
5. Deer 
6. Koala 
7. Panda 
8. Penguin 
9. Lion 
10. Tiger 
11. Elephant 
12. Giraffe 
13. Cat 
14. Dog 
15. Turtle 
16. Hedgehog 
17. Octopus 
18. Dolphin 
19. Squirrel 
20. Sloth 
21. Raccoon 
22. Monkey 
23. Frog 
24. Bird 

### 4. Modular Python Script Architecture
- **`generate_icon(animal, variation)`**: Wraps Imagen API call.
- **`retry_strategy`**: Use `tenacity` library for exponential backoff on 429 errors.
- **`batch_process()`**: Iterates through animal list and variations.
- **`image_cleanup()`**: Basic PIL cleanup (transparency masking).

### 5. Output & Selection Workflow
- Each animal gets a folder: `/public/icons/fox/`
- Files named: `fox-01.png`, `fox-02.png`, etc.
- **Selection:** A simple HTML viewer or Next.js page `/admin/icons` (if needed) to preview all variantions.

## Verification Plan

### Automated Tests
- Script validation (mocking Imagen API).
- File structure check after generation.

### Manual Verification
- Visual inspection of generated icons for style consistency.
