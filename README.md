# Right-click Translate

Translate selected text from any page via a simple context menu.

© 2025 Hayk Jomardyan. All rights reserved.

## What it does
- Adds a “Translate selection → {language}” item to the right-click menu.
- Opens Google Translate with auto-detected source language.
- Lets you choose your target language and whether to open in a new tab or the current tab.

## How to use
1. Select text on any page.
2. Right-click and choose **Translate selection → …**.
3. Google Translate opens with your selection prefilled.

## Options
- Target language: set your preferred language code (e.g., `en`, `es`, `fr`).
- Open translation: choose **New tab** or **Current tab**.

## Permissions
- `contextMenus`: add the right-click menu entry.
- `tabs`: open or replace the page with Google Translate.
- `storage`: save your options across devices.

## Privacy
No data is collected or sent anywhere by the extension itself. Selected text is only passed to Google Translate when you trigger a translation.

## Release notes
- 1.1.0: Added options page, configurable target language, and open-mode selection. Menu title now reflects the current target language.
- 1.0.0: Initial release with right-click translate to English.
