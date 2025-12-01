const MENU_ID = 'rightClickTranslate';
const MENU_LANG_PREFIX = 'rightClickTranslateLang_';

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

const DEFAULT_OPTIONS = {
  sourceLang: 'auto',
  targetLanguages: ['en', 'es'],
  provider: 'google', // google | deepl | bing | yandex | microsoft
  openMode: 'newTab', // newTab | currentTab
  previewEnabled: true,
  saveHistory: true,
  translationHistory: []
};

const MAX_HISTORY = 20;

const getOptions = () =>
  new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_OPTIONS, resolve);
  });

const setOptions = (values) =>
  new Promise((resolve) => {
    chrome.storage.sync.set(values, resolve);
  });

const removeAllMenus = () =>
  new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => resolve());
  });

const safeCreateMenu = (createProps) =>
  new Promise((resolve) => {
    chrome.contextMenus.create(createProps, () => {
      // Ignore duplicate errors; they'll be cleared on next rebuild.
      // eslint-disable-next-line no-unused-expressions
      chrome.runtime.lastError;
      resolve();
    });
  });

const getLanguageLabel = (code) => {
  const name = LANGUAGE_LABELS[code];
  return name ? `${name} (${code})` : code;
};

const getProviderLabel = (provider) => {
  switch (provider) {
    case 'deepl':
      return 'DeepL';
    case 'bing':
      return 'Bing';
    case 'yandex':
      return 'Yandex';
    case 'microsoft':
      return 'Microsoft';
    default:
      return 'Google';
  }
};

const buildUrl = (provider, sourceLang, targetLang, query) => {
  const source = sourceLang || 'auto';
  switch (provider) {
    case 'deepl':
      return `https://www.deepl.com/translator#${encodeURIComponent(source)}/${encodeURIComponent(targetLang)}/${query}`;
    case 'bing':
      return `https://www.bing.com/translator?text=${query}&from=${encodeURIComponent(source)}&to=${encodeURIComponent(targetLang)}`;
    case 'yandex':
      return `https://translate.yandex.com/?source_lang=${encodeURIComponent(source)}&target_lang=${encodeURIComponent(targetLang)}&text=${query}`;
    case 'microsoft':
      return `https://www.bing.com/translator?text=${query}&from=${encodeURIComponent(source)}&to=${encodeURIComponent(targetLang)}`;
    default:
      return `https://translate.google.com/?sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(targetLang)}&text=${query}&op=translate`;
  }
};

const recordHistory = async ({ text, sourceLang, targetLang, provider }) => {
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
};

const getTopLanguages = async (fallbackTargets) => {
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

  return merged.slice(0, 6);
};

let menuQueue = Promise.resolve();

const createOrUpdateMenu = async () => {
  menuQueue = menuQueue
    .then(async () => {
      const { targetLanguages = [], provider } = await getOptions();
      const primaryTarget = targetLanguages[0] || 'en';
      const providerLabel = getProviderLabel(provider);
      const title = `Translate selection -> ${getLanguageLabel(primaryTarget)} (${providerLabel})`;
      const languages = await getTopLanguages(targetLanguages.length ? targetLanguages : ['en']);

      await removeAllMenus();

      await safeCreateMenu({
        id: MENU_ID,
        title,
        contexts: ['selection']
      });

      await safeCreateMenu({
        id: `${MENU_ID}_submenu`,
        title: 'Translate to...',
        contexts: ['selection']
      });

      await Promise.all(
        languages.map((code) =>
          safeCreateMenu({
            id: `${MENU_LANG_PREFIX}${code}`,
            parentId: `${MENU_ID}_submenu`,
            title: getLanguageLabel(code),
            contexts: ['selection']
          })
        )
      );
    })
    .catch(() => {
      // Swallow menu rebuild errors; next change will retry.
    });
};

const showPreviewNotification = async (provider, targetLang, resultText) => {
  const providerLabel = getProviderLabel(provider);
  const targetLabel = getLanguageLabel(targetLang);
  const message = resultText.slice(0, 180);

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `Preview (${providerLabel} -> ${targetLabel})`,
    message
  });
};

const fetchPreview = async (sourceLang, targetLang, text) => {
  const source = sourceLang === 'auto' ? 'auto' : sourceLang;
  const pair = `${source}|${targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.responseData?.translatedText || null;
};

const handleTranslation = async ({ text, targetLang, tab }) => {
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
      .catch(() => {});
  }

  if (openMode === 'currentTab' && tab?.id) {
    chrome.tabs.update(tab.id, { url });
  } else {
    chrome.tabs.create({ url });
  }

  recordHistory({ text, sourceLang, targetLang, provider });
};

const onMenuClick = async (info, tab) => {
  if (!info.selectionText) return;
  const selected = info.selectionText.trim();
  if (!selected) return;

  const { targetLanguages = [] } = await getOptions();
  let target = targetLanguages[0] || 'en';

  if (info.menuItemId.startsWith(MENU_LANG_PREFIX)) {
    target = info.menuItemId.replace(MENU_LANG_PREFIX, '');
  }

  handleTranslation({ text: selected, targetLang: target, tab });
};

const onCommand = async (command) => {
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
};

const ensureDefaultsOnInstall = async () => {
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
};

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaultsOnInstall();
  createOrUpdateMenu();
});

chrome.runtime.onStartup.addListener(() => {
  createOrUpdateMenu();
});

chrome.contextMenus.onClicked.addListener(onMenuClick);
chrome.commands.onCommand.addListener(onCommand);

chrome.storage.onChanged.addListener((changes, area) => {
  if (
    area === 'sync' &&
    (changes.targetLanguages || changes.openMode || changes.provider || changes.translationHistory)
  ) {
    createOrUpdateMenu();
  }
});
