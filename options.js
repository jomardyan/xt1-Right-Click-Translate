const LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' }
];

const DEFAULT_OPTIONS = {
  sourceLang: 'auto',
  targetLanguages: ['en', 'es'],
  provider: 'google',
  openMode: 'newTab',
  previewEnabled: true,
  saveHistory: true,
  themeMode: 'auto'
};

const elements = {};

function getFormValues() {
  return {
    sourceLang: elements.sourceLang.value,
    targetLanguages: elements.targetLanguages.slice(),
    provider: elements.provider.value,
    openMode: elements.openMode.value,
    previewEnabled: elements.previewEnabled.checked,
    saveHistory: elements.saveHistory.checked,
    themeMode: elements.themeMode.value
  };
}

function setStatus(message) {
  const status = elements.status;
  status.textContent = message;
  setTimeout(() => {
    status.textContent = '';
  }, 2000);
}

function renderSelect(selectEl, includeAuto = false) {
  selectEl.innerHTML = '';
  LANGUAGES.filter((lang) => includeAuto || lang.code !== 'auto').forEach((lang) => {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = `${lang.name} (${lang.code})`;
    selectEl.appendChild(opt);
  });
}

function renderTargets() {
  const container = elements.targetsList;
  container.innerHTML = '';
  elements.targetLanguages.forEach((code) => {
    const lang = LANGUAGES.find((l) => l.code === code);
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = lang ? `${lang.name} (${code})` : code;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Remove';
    btn.addEventListener('click', () => {
      elements.targetLanguages = elements.targetLanguages.filter((c) => c !== code);
      renderTargets();
    });
    chip.appendChild(btn);
    container.appendChild(chip);
  });
}

function addTargetLanguage() {
  const code = elements.targetSelect.value;
  if (!code) return;
  if (elements.targetLanguages.includes(code)) {
    setStatus('Already added');
    return;
  }
  elements.targetLanguages.push(code);
  renderTargets();
  setStatus('Added');
}

async function restoreOptions() {
  const options = await new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_OPTIONS, resolve);
  });

  elements.sourceLang.value = options.sourceLang || DEFAULT_OPTIONS.sourceLang;
  elements.provider.value = options.provider || DEFAULT_OPTIONS.provider;
  elements.openMode.value = options.openMode || DEFAULT_OPTIONS.openMode;
  elements.previewEnabled.checked = options.previewEnabled ?? DEFAULT_OPTIONS.previewEnabled;
  elements.saveHistory.checked = options.saveHistory ?? DEFAULT_OPTIONS.saveHistory;
  elements.themeMode.value = options.themeMode || DEFAULT_OPTIONS.themeMode;

  elements.targetLanguages = Array.isArray(options.targetLanguages) && options.targetLanguages.length
    ? options.targetLanguages
    : DEFAULT_OPTIONS.targetLanguages.slice();
  renderTargets();
  applyTheme(elements.themeMode.value);
}

async function saveOptions(event) {
  event.preventDefault();
  const options = getFormValues();

  await new Promise((resolve) => {
    chrome.storage.sync.set(options, resolve);
  });

  setStatus('Saved');
}

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.dataset.theme = 'dark';
  } else if (mode === 'light') {
    root.dataset.theme = 'light';
  } else {
    delete root.dataset.theme;
  }
}

function initElements() {
  elements.sourceLang = document.getElementById('sourceLang');
  elements.provider = document.getElementById('provider');
  elements.openMode = document.getElementById('openMode');
  elements.previewEnabled = document.getElementById('previewEnabled');
  elements.saveHistory = document.getElementById('saveHistory');
  elements.themeMode = document.getElementById('themeMode');
  elements.targetSelect = document.getElementById('targetSelect');
  elements.targetsList = document.getElementById('targetsList');
  elements.status = document.getElementById('status');
  elements.targetLanguages = [];
}

document.addEventListener('DOMContentLoaded', () => {
  initElements();
  renderSelect(elements.sourceLang, true);
  renderSelect(elements.targetSelect, false);
  restoreOptions();

  document.getElementById('options-form').addEventListener('submit', saveOptions);
  document.getElementById('addTarget').addEventListener('click', addTargetLanguage);
  elements.themeMode.addEventListener('change', (e) => applyTheme(e.target.value));
});
