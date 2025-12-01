const DEFAULT_OPTIONS = {
  targetLang: 'en',
  openMode: 'newTab'
};

function getFormValues() {
  return {
    targetLang: document.getElementById('targetLang').value.trim() || DEFAULT_OPTIONS.targetLang,
    openMode: document.getElementById('openMode').value
  };
}

function setStatus(message) {
  const status = document.getElementById('status');
  status.textContent = message;
  setTimeout(() => {
    status.textContent = '';
  }, 2000);
}

async function restoreOptions() {
  const options = await new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_OPTIONS, resolve);
  });

  document.getElementById('targetLang').value = options.targetLang || DEFAULT_OPTIONS.targetLang;
  document.getElementById('openMode').value = options.openMode || DEFAULT_OPTIONS.openMode;
}

async function saveOptions(event) {
  event.preventDefault();
  const options = getFormValues();

  await new Promise((resolve) => {
    chrome.storage.sync.set(options, resolve);
  });

  setStatus('Saved');
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('options-form').addEventListener('submit', saveOptions);
