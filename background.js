const MENU_ID = 'rightClickTranslate';
const DEFAULT_OPTIONS = {
  targetLang: 'en',
  openMode: 'newTab' // newTab | currentTab
};

const getOptions = () =>
  new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_OPTIONS, resolve);
  });

const createOrUpdateMenu = async () => {
  const { targetLang } = await getOptions();
  const title = `Translate selection → ${targetLang}`;

  chrome.contextMenus.update(
    MENU_ID,
    { title },
    () => {
      if (chrome.runtime.lastError) {
        chrome.contextMenus.create({
          id: MENU_ID,
          title,
          contexts: ['selection']
        });
      }
    }
  );
};

const openTranslation = async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) {
    return;
  }

  const selected = info.selectionText.trim();
  if (!selected) return;

  const { targetLang, openMode } = await getOptions();
  const query = encodeURIComponent(selected);
  const url = `https://translate.google.com/?sl=auto&tl=${targetLang}&text=${query}&op=translate`;

  if (openMode === 'currentTab' && tab?.id) {
    chrome.tabs.update(tab.id, { url });
  } else {
    chrome.tabs.create({ url });
  }
};

const ensureDefaultsOnInstall = async () => {
  const options = await getOptions();
  const needsUpdate =
    options.targetLang === undefined || options.openMode === undefined;

  if (needsUpdate) {
    await new Promise((resolve) => {
      chrome.storage.sync.set(DEFAULT_OPTIONS, resolve);
    });
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaultsOnInstall();
  createOrUpdateMenu();
});

chrome.runtime.onStartup.addListener(() => {
  createOrUpdateMenu();
});

chrome.contextMenus.onClicked.addListener(openTranslation);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.targetLang || changes.openMode)) {
    createOrUpdateMenu();
  }
});
