/**
 * Language codes and display names
 */
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

/**
 * Default extension settings
 */
const DEFAULT_OPTIONS = {
  sourceLang: 'auto',
  targetLanguages: ['en', 'es', 'pl'],
  provider: 'google',
  openMode: 'newTab',
  previewEnabled: true,
  saveHistory: true,
  themeMode: 'auto'
};

/**
 * DOM element cache
 */
const elements = {};

/**
 * Get current form values as options object
 */
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

/**
 * Show temporary status message
 */
function setStatus(message) {
  elements.status.textContent = message;
  elements.status.setAttribute('aria-live', 'polite');
  if (elements.statusTimeout) clearTimeout(elements.statusTimeout);
  elements.statusTimeout = setTimeout(() => {
    elements.status.textContent = '';
  }, 2000);
}

/**
 * Render language options in a select element
 */
function renderSelect(selectEl, includeAuto = false) {
  selectEl.innerHTML = '';
  LANGUAGES
    .filter((lang) => includeAuto || lang.code !== 'auto')
    .forEach((lang) => {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = `${lang.name} (${lang.code})`;
      selectEl.appendChild(opt);
    });
}

/**
 * Render target language chips
 */
function renderTargets() {
  const container = elements.targetsList;
  container.innerHTML = '';

  if (elements.targetLanguages.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'empty-message';
    emptyMsg.textContent = 'No target languages added yet';
    container.appendChild(emptyMsg);
    return;
  }

  elements.targetLanguages.forEach((code) => {
    const lang = LANGUAGES.find((l) => l.code === code);
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.setAttribute('data-lang-code', code);

    const label = document.createElement('span');
    label.textContent = lang ? `${lang.name} (${code})` : code;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-remove';
    btn.textContent = '✕';
    btn.setAttribute('aria-label', `Remove ${code}`);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      elements.targetLanguages = elements.targetLanguages.filter((c) => c !== code);
      renderTargets();
    });

    chip.appendChild(label);
    chip.appendChild(btn);
    container.appendChild(chip);
  });
}

/**
 * Validate language code format
 */
function isValidLanguageCode(code) {
  // Allow codes like: en, es, pt-BR, zh-CN, etc.
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(code);
}

/**
 * Add language from predefined list
 */
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

/**
 * Add custom language code
 */
function addCustomLanguage() {
  const code = elements.customLangCode.value.trim().toLowerCase();

  if (!code) {
    setStatus('Please enter a language code');
    return;
  }

  if (!isValidLanguageCode(code)) {
    setStatus('Invalid format. Use: en, pt-BR, zh-CN, etc.');
    return;
  }

  if (elements.targetLanguages.includes(code)) {
    setStatus('Already added');
    return;
  }

  elements.targetLanguages.push(code);
  elements.customLangCode.value = '';
  elements.customLangCode.focus();
  renderTargets();
  setStatus('Custom language added');
}

/**
 * Load options from Chrome storage
 */
async function restoreOptions() {
  try {
    const options = await new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULT_OPTIONS, resolve);
    });

    elements.sourceLang.value = options.sourceLang || DEFAULT_OPTIONS.sourceLang;
    elements.provider.value = options.provider || DEFAULT_OPTIONS.provider;
    elements.openMode.value = options.openMode || DEFAULT_OPTIONS.openMode;
    elements.previewEnabled.checked = options.previewEnabled ?? DEFAULT_OPTIONS.previewEnabled;
    elements.saveHistory.checked = options.saveHistory ?? DEFAULT_OPTIONS.saveHistory;
    elements.themeMode.value = options.themeMode || DEFAULT_OPTIONS.themeMode;

    elements.targetLanguages =
      Array.isArray(options.targetLanguages) && options.targetLanguages.length
        ? options.targetLanguages
        : DEFAULT_OPTIONS.targetLanguages.slice();

    renderTargets();
    applyTheme(elements.themeMode.value);
  } catch (error) {
    console.error('Failed to restore options:', error);
  }
}

/**
 * Save options to Chrome storage
 */
async function saveOptions(event) {
  event.preventDefault();

  if (elements.targetLanguages.length === 0) {
    setStatus('Add at least one target language');
    return;
  }

  try {
    const options = getFormValues();
    await new Promise((resolve) => {
      chrome.storage.sync.set(options, resolve);
    });
    setStatus('Settings saved successfully');
  } catch (error) {
    console.error('Failed to save options:', error);
    setStatus('Error saving settings');
  }
}

/**
 * Apply theme to document
 */
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

/**
 * Cache DOM elements
 */
function initElements() {
  elements.sourceLang = document.getElementById('sourceLang');
  elements.provider = document.getElementById('provider');
  elements.openMode = document.getElementById('openMode');
  elements.previewEnabled = document.getElementById('previewEnabled');
  elements.saveHistory = document.getElementById('saveHistory');
  elements.themeMode = document.getElementById('themeMode');
  elements.targetSelect = document.getElementById('targetSelect');
  elements.targetsList = document.getElementById('targetsList');
  elements.customLangCode = document.getElementById('customLangCode');
  elements.status = document.getElementById('status');
  elements.targetLanguages = [];
}

/**
 * Initialize options page
 */
document.addEventListener('DOMContentLoaded', () => {
  initElements();
  renderSelect(elements.sourceLang, true);
  renderSelect(elements.targetSelect, false);
  restoreOptions();

  // Event listeners
  document.getElementById('options-form').addEventListener('submit', saveOptions);
  document.getElementById('addTarget').addEventListener('click', addTargetLanguage);
  document.getElementById('addCustomLang').addEventListener('click', addCustomLanguage);
  elements.customLangCode.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addCustomLanguage();
    }
  });
  elements.themeMode.addEventListener('change', (e) => applyTheme(e.target.value));
});
