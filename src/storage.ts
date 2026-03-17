import { DEFAULT_SETTINGS, type ExtensionSettings } from './types';

const STORAGE_KEY = 'settings';

export function loadSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const stored = (result[STORAGE_KEY] as Partial<ExtensionSettings>) ?? {};
      resolve({ ...DEFAULT_SETTINGS, ...stored });
    });
  });
}

export function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  return new Promise((resolve) => {
    loadSettings().then((current) => {
      chrome.storage.sync.set(
        { [STORAGE_KEY]: { ...current, ...settings } },
        resolve,
      );
    });
  });
}

export function onSettingsChanged(
  callback: (settings: ExtensionSettings) => void,
): void {
  chrome.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEY]) {
      const newSettings = changes[STORAGE_KEY].newValue as ExtensionSettings;
      callback({ ...DEFAULT_SETTINGS, ...newSettings });
    }
  });
}
