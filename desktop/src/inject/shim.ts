/**
 * Chrome Extension API shim for desktop (Tauri) environment.
 * Implements chrome.storage.sync using localStorage and
 * chrome.runtime.getURL as a no-op (logo replacement disabled in desktop).
 */

type StorageCallback = (result: Record<string, unknown>) => void;
type ChangeCallback = (changes: Record<string, { oldValue?: unknown; newValue: unknown }>) => void;

const STORAGE_PREFIX = 'calblend_';
const changeListeners: ChangeCallback[] = [];

function storageGet(key: string, callback: StorageCallback): void {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    const value = raw ? JSON.parse(raw) : undefined;
    callback({ [key]: value });
  } catch {
    callback({});
  }
}

function storageSet(data: Record<string, unknown>, callback?: () => void): void {
  for (const [key, value] of Object.entries(data)) {
    const oldRaw = localStorage.getItem(STORAGE_PREFIX + key);
    const oldValue = oldRaw ? JSON.parse(oldRaw) : undefined;

    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));

    // Notify listeners
    const changes: Record<string, { oldValue?: unknown; newValue: unknown }> = {
      [key]: { oldValue, newValue: value },
    };
    for (const listener of changeListeners) {
      try {
        listener(changes);
      } catch (e) {
        console.error('[CalBlend] Storage change listener error:', e);
      }
    }
  }
  callback?.();
}

// Listen for storage changes from other windows (settings window)
window.addEventListener('storage', (e) => {
  if (!e.key?.startsWith(STORAGE_PREFIX)) return;
  const key = e.key.slice(STORAGE_PREFIX.length);
  const oldValue = e.oldValue ? JSON.parse(e.oldValue) : undefined;
  const newValue = e.newValue ? JSON.parse(e.newValue) : undefined;
  const changes = { [key]: { oldValue, newValue } };
  for (const listener of changeListeners) {
    try {
      listener(changes);
    } catch (err) {
      console.error('[CalBlend] Storage change listener error:', err);
    }
  }
});

// Install global chrome shim
(window as any).chrome = {
  storage: {
    sync: {
      get: storageGet,
      set: storageSet,
    },
    onChanged: {
      addListener: (callback: ChangeCallback) => {
        changeListeners.push(callback);
      },
      removeListener: (callback: ChangeCallback) => {
        const idx = changeListeners.indexOf(callback);
        if (idx !== -1) changeListeners.splice(idx, 1);
      },
    },
  },
  runtime: {
    getURL: (path: string) => path,
  },
  action: {
    setIcon: () => {},
  },
  i18n: {
    getMessage: (key: string) => {
      // Minimal English translations for the desktop app
      const messages: Record<string, string> = {
        popupEnableExtension: 'Enable CalBlend',
        popupEnableWeekends: 'Color weekends',
        popupGradientOpacity: 'Gradient opacity',
        popupThemeSelect: 'Theme',
        popupThemeSystem: 'System',
        popupThemeLight: 'Light',
        popupThemeDark: 'Dark',
        popupLightThemeColor: 'Light weekend color',
        popupDarkThemeColor: 'Dark weekend color',
        popupColorCustom: 'Custom',
        popupColorDefaultBlue: 'Default Blue',
        popupColorLightGray: 'Light Gray',
        popupColorWarmBeige: 'Warm Beige',
        popupColorSoftPurple: 'Soft Purple',
        popupColorMintGreen: 'Mint Green',
        popupColorDefaultDark: 'Default Dark',
        popupColorSoftBlack: 'Soft Black',
        popupColorBlueGray: 'Blue Gray',
        popupColorNavyDark: 'Navy Dark',
        popupColorCharcoal: 'Charcoal',
        popupSectionVisual: 'Visual',
        popupSectionLayout: 'Layout',
        popupSectionSmart: 'Smart',
        popupSectionMerge: 'Merge',
        popupSectionTheme: 'Theme',
        popupRoundedEvents: 'Rounded events',
        popupEventShadow: 'Event shadows',
        popupSmoothAnimations: 'Smooth animations',
        popupImprovedTypography: 'Better typography',
        popupRefinedColors: 'Refined colors',
        popupRefinedTimeLine: 'Refined timeline',
        popupSoftGrid: 'Soft grid',
        popupModernUI: 'Modern UI',
        popupCleanSidebar: 'Clean sidebar',
        popupCleanHeader: 'Clean header',
        popupDimMiniCalendar: 'Dim mini calendar',
        popupFocusMode: 'Focus mode',
        popupHighlightNextEvent: 'Highlight next',
        popupConflictIndicator: 'Conflict indicator',
      };
      return messages[key] ?? key;
    },
  },
};
