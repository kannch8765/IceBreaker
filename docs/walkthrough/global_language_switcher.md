# Walkthrough: Global Language Switcher

## Overview
This document tracks the changes made to `README.md` to shift from section-based language tabs to a single, global language switcher at the top of the file. This provides a cleaner UI experience, avoiding repetitive clicking.

## Technical Details

### 1. Unified CSS Logic
- **[MODIFY] [README.md](file:///d:/Github_Repos/IceBreaker/README.md)**
  - Dropped the `.tabs` class iteration and `.tab-content` classes.
  - Implemented `.lang-en` and `.lang-jp` wrapper variables.
  - Sibling combinator (`~`) connects the top-level inputs (`#en:checked`, `#jp:checked`) directly to every `.lang-en` and `.lang-jp` div block throughout the entire document natively without JavaScript.
  - Updated color variables to a cleaner GitHub UI standard (`#0969da` blue for active toggles).

### 2. Markdown Header Retention
- Extracted Headers: To prevent GitHub's automatic Table of Contents from duplicating anchor links (which would occur if both translated headers were stored in hidden DOM blocks), standard markdown headers (`##`) are kept outside the language wraps.
- Text Content toggling: Only the underlying content toggles between English / Japanese based on the switch state.

### 3. File Verification
- Document verified inside `docs/walkthrough/global_language_switcher.md` complying strictly with standard `GEMINI.md` file taxonomy requirements.
