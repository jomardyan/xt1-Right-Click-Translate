const MENU_ID = 'rightClickTranslate';
const MENU_LANG_PREFIX = 'rightClickTranslateLang_';
const MENU_OPTIONS_ID = `${MENU_ID}_openOptions`;
const MAX_HISTORY = 20;
const PREVIEW_TEXT_LIMIT = 180;
const PREVIEW_API_URL = 'https://api.mymemory.translated.net/get';

const LANGUAGE_LABELS = {
  auto: 'Auto-detect',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  'zh-CN': 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  pl: 'Polish',
  tr: 'Turkish',
  ar: 'Arabic',
  hi: 'Hindi',
  nl: 'Dutch',
  sv: 'Swedish'
};

const PROVIDERS = {
  google: 'Google',
  deepl: 'DeepL',
  bing: 'Bing',
  yandex: 'Yandex',
  microsoft: 'Microsoft'
};

const DEFAULT_OPTIONS = {
  sourceLang: 'auto',
  targetLanguages: ['en', 'es', 'pl'],
  provider: 'google',
  openMode: 'newTab',
  previewEnabled: true,
  saveHistory: true,
  translationHistory: []
};

/**
 * Promisified Chrome Storage API
 */
const getOptions = () =>
  new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_OPTIONS, resolve);
  });

const setOptions = (values) =>
  new Promise((resolve) => {
    chrome.storage.sync.set(values, resolve);
  });

/**
 * Promisified Chrome Context Menu API
 */
const removeAllMenus = () =>
  new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => resolve());
  });

const safeCreateMenu = (createProps) =>
  new Promise((resolve) => {
    chrome.contextMenus.create(createProps, () => {
      // Ignore duplicate errors; they'll be cleared on next rebuild.
      chrome.runtime.lastError;
      resolve();
    });
  });

/**
 * Get display label for language code
 */
const getLanguageLabel = (code) => {
  const name = LANGUAGE_LABELS[code];
  return name ? `${name} (${code})` : code;
};

/**
 * Get display label for provider
 */
const getProviderLabel = (provider) => PROVIDERS[provider] || PROVIDERS.google;

/**
 * Build translation URL for the selected provider
 */
const buildUrl = (provider, sourceLang, targetLang, query) => {
  const source = sourceLang || 'auto';
  const providers = {
    deepl: () => `https://www.deepl.com/translator#${encodeURIComponent(source)}/${encodeURIComponent(targetLang)}/${query}`,
    bing: () => `https://www.bing.com/translator?text=${query}&from=${encodeURIComponent(source)}&to=${encodeURIComponent(targetLang)}`,
    yandex: () => `https://translate.yandex.com/?source_lang=${encodeURIComponent(source)}&target_lang=${encodeURIComponent(targetLang)}&text=${query}`,
    microsoft: () => `https://www.bing.com/translator?text=${query}&from=${encodeURIComponent(source)}&to=${encodeURIComponent(targetLang)}`,
    google: () => `https://translate.google.com/?sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(targetLang)}&text=${query}&op=translate`
  };
  return (providers[provider] || providers.google)();
};

/**
 * Record translation in history
 */
const recordHistory = async ({ text, sourceLang, targetLang, provider }) => {
  try {
    const { translationHistory = [], saveHistory } = await getOptions();
    if (!saveHistory) return;

    const entry = {
      text,
      sourceLang,
      targetLang,
      provider,
      at: Date.now()
    };
    const next = [entry, ...translationHistory].slice(0, MAX_HISTORY);
    await setOptions({ translationHistory: next });
  } catch (error) {
    console.error('Failed to record translation history:', error);
  }
};

/**
 * Get top languages from history, merged with fallback targets
 */
const getTopLanguages = async (fallbackTargets) => {
  try {
    const { translationHistory = [] } = await getOptions();
    const counts = {};
    translationHistory.forEach(({ targetLang }) => {
      if (!targetLang) return;
      counts[targetLang] = (counts[targetLang] || 0) + 1;
    });

    const sortedHistory = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code);

    const merged = [...fallbackTargets];
    sortedHistory.forEach((code) => {
      if (!merged.includes(code)) merged.push(code);
    });

    return merged;
  } catch (error) {
    console.error('Failed to get top languages:', error);
    return fallbackTargets;
  }
};

let menuQueue = Promise.resolve();

/**
 * Create or update context menu items
 */
const createOrUpdateMenu = async () => {
  menuQueue = menuQueue
    .then(async () => {
      try {
        const { targetLanguages = [], provider } = await getOptions();
        const primaryTarget = targetLanguages[0] || 'en';
        const providerLabel = getProviderLabel(provider);
        const title = `Translate selection → ${getLanguageLabel(primaryTarget)} (${providerLabel})`;
        const languages = await getTopLanguages(targetLanguages.length ? targetLanguages : ['en']);

        await removeAllMenus();

        await safeCreateMenu({
          id: MENU_ID,
          title,
          contexts: ['selection']
        });

        await Promise.all(
          languages.map((code) =>
            safeCreateMenu({
              id: `${MENU_LANG_PREFIX}${code}`,
              parentId: MENU_ID,
              title: getLanguageLabel(code),
              contexts: ['selection']
            })
          )
        );

        await safeCreateMenu({
          id: MENU_OPTIONS_ID,
          title: 'Open options',
          parentId: MENU_ID,
          contexts: ['selection']
        });
      } catch (error) {
        console.error('Failed to create or update menu:', error);
      }
    });
};

/**
 * Show preview notification
 */
const showPreviewNotification = (provider, targetLang, resultText) => {
  try {
    const providerLabel = getProviderLabel(provider);
    const targetLabel = getLanguageLabel(targetLang);
    const message = resultText.slice(0, PREVIEW_TEXT_LIMIT);

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `Preview (${providerLabel} → ${targetLabel})`,
      message
    });
  } catch (error) {
    console.error('Failed to show preview notification:', error);
  }
};

/**
 * Fetch preview from MyMemory API
 */
const fetchPreview = async (sourceLang, targetLang, text) => {
  try {
    const source = sourceLang === 'auto' ? 'auto' : sourceLang;
    const pair = `${source}|${targetLang}`;
    const url = `${PREVIEW_API_URL}?q=${encodeURIComponent(text)}&langpair=${pair}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.responseData?.translatedText || null;
  } catch (error) {
    console.warn('Failed to fetch preview:', error);
    return null;
  }
};

/**
 * Handle translation request
 */
const handleTranslation = async ({ text, targetLang, tab }) => {
  try {
    const { provider, openMode, sourceLang, previewEnabled } = await getOptions();
    const query = encodeURIComponent(text);
    const url = buildUrl(provider, sourceLang, targetLang, query);

    if (previewEnabled) {
      fetchPreview(sourceLang, targetLang, text)
        .then((result) => {
          if (result) {
            showPreviewNotification(provider, targetLang, result);
          }
        })
        .catch((error) => {
          console.warn('Preview error (non-blocking):', error);
        });
    }

    if (openMode === 'currentTab' && tab?.id) {
      await chrome.tabs.update(tab.id, { url });
    } else {
      await chrome.tabs.create({ url });
    }

    recordHistory({ text, sourceLang, targetLang, provider });
  } catch (error) {
    console.error('Failed to handle translation:', error);
  }
};

/**
 * Handle context menu click
 */
const onMenuClick = async (info, tab) => {
  try {
    if (info.menuItemId === MENU_OPTIONS_ID) {
      chrome.runtime.openOptionsPage();
      return;
    }

    if (!info.selectionText) return;
    const selected = info.selectionText.trim();
    if (!selected) return;

    const { targetLanguages = [] } = await getOptions();
    let target = targetLanguages[0] || 'en';

    if (info.menuItemId.startsWith(MENU_LANG_PREFIX)) {
      target = info.menuItemId.replace(MENU_LANG_PREFIX, '');
    }

    handleTranslation({ text: selected, targetLang: target, tab });
  } catch (error) {
    console.error('Failed to handle menu click:', error);
  }
};

/**
 * Handle keyboard shortcut command
 */
const onCommand = async (command) => {
  try {
    if (command !== 'translate-selection') return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || ''
    });

    const selected = (result && result[0]?.result?.trim()) || '';
    if (!selected) return;

    const { targetLanguages = [] } = await getOptions();
    const target = targetLanguages[0] || 'en';
    handleTranslation({ text: selected, targetLang: target, tab });
  } catch (error) {
    console.error('Failed to handle command:', error);
  }
};

/**
 * Ensure default options are set on install
 */
const ensureDefaultsOnInstall = async () => {
  try {
    const options = await getOptions();
    const next = { ...DEFAULT_OPTIONS };

    if (Array.isArray(options.targetLanguages) && options.targetLanguages.length) {
      next.targetLanguages = options.targetLanguages;
    } else if (options.targetLang) {
      next.targetLanguages = [options.targetLang];
    }

    next.provider = options.provider ?? DEFAULT_OPTIONS.provider;
    next.openMode = options.openMode ?? DEFAULT_OPTIONS.openMode;
    next.sourceLang = options.sourceLang ?? DEFAULT_OPTIONS.sourceLang;
    next.previewEnabled = options.previewEnabled ?? DEFAULT_OPTIONS.previewEnabled;
    next.saveHistory = options.saveHistory ?? DEFAULT_OPTIONS.saveHistory;
    next.translationHistory = options.translationHistory ?? DEFAULT_OPTIONS.translationHistory;

    await setOptions(next);
  } catch (error) {
    console.error('Failed to ensure defaults on install:', error);
  }
};

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaultsOnInstall();
  createOrUpdateMenu();
});

/**
 * Re-initialize menu on browser startup
 */
chrome.runtime.onStartup.addListener(() => {
  createOrUpdateMenu();
});

/**
 * Listen for context menu clicks
 */
chrome.contextMenus.onClicked.addListener(onMenuClick);

/**
 * Listen for keyboard shortcut commands
 */
chrome.commands.onCommand.addListener(onCommand);

/**
 * Open options when toolbar icon is clicked
 */
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

/**
 * Update menu when settings change
 */
chrome.storage.onChanged.addListener((changes, area) => {
  if (
    area === 'sync' &&
    (changes.targetLanguages || changes.openMode || changes.provider || changes.translationHistory)
  ) {
    createOrUpdateMenu();
  }
});
