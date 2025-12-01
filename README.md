# Right-click Translate

Translate selected text from any page via a simple context menu.

(c) 2025 Hayk Jomardyan. All rights reserved.

## What it does
- Adds a "Translate selection -> {language}" item and a "Translate to..." submenu for saved languages.
- Supports multiple providers: Google, DeepL, Bing, Yandex, Microsoft.
- Lets you choose source language (auto or fixed), multiple targets, and whether to open in a new tab or the current tab.
- Offers a quick preview notification of the translation (when available) without leaving the page.
- Provides a keyboard shortcut (Alt+Shift+T by default) to translate the current selection.

## How to use
1. Select text on any page.
2. Right-click and choose **Translate selection -> ...** or pick a language from **Translate to...**.
3. Your chosen provider opens with your selection prefilled.

## Options
- Source language: auto-detect or pick a fixed source.
- Target languages: maintain a list for quick access in the context menu.
- Provider: choose Google, DeepL, Bing, Yandex, or Microsoft.
- Open translation: **New tab** or **Current tab**.
- Preview: show a quick notification preview (when available) before opening.
- History: keep recent translations to surface frequent languages.
- Theme: auto/light/dark for the options page.

## Permissions
- `contextMenus`: add the right-click menu entry.
- `tabs`: open or replace the page with the translation provider.
- `storage`: save options, targets, and history across devices.
- `scripting` + `activeTab`: capture the current selection for the keyboard shortcut.
- `notifications`: show quick preview messages.
- Host permissions: `https://api.mymemory.translated.net/*` for optional preview translations.

## Known behavior
- Context menus rebuild safely on changes; duplicate menu errors are handled internally.

## Privacy
No personal data is collected or sent by the extension itself. Selected text is only sent to the chosen provider when you trigger a translation. Preview translations use a public API (MyMemory) and can be disabled in options.

## Release notes
- 1.3.0: Multiple targets, provider expansion, keyboard shortcut, quick preview, history-informed submenu, and dark mode for options.
- 1.2.0: Provider selection (Google or DeepL); menu title reflects provider and target language.
- 1.1.0: Options page, configurable target language, and open-mode selection; menu title reflects chosen language.
- 1.0.0: Initial release with right-click translate to English.
