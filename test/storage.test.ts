import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/types';

// Mock chrome.storage.sync
const mockStorage: Record<string, unknown> = {};
const mockListeners: Array<(changes: Record<string, unknown>) => void> = [];

const chromeMock = {
  storage: {
    sync: {
      get: vi.fn((key: string, cb: (result: Record<string, unknown>) => void) => {
        cb(mockStorage);
      }),
      set: vi.fn((data: Record<string, unknown>, cb?: () => void) => {
        Object.assign(mockStorage, data);
        cb?.();
      }),
    },
    onChanged: {
      addListener: vi.fn((cb: (changes: Record<string, unknown>) => void) => {
        mockListeners.push(cb);
      }),
    },
  },
};

vi.stubGlobal('chrome', chromeMock);

// Import after mocking
const { loadSettings, saveSettings, onSettingsChanged } = await import('../src/storage');

describe('loadSettings', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
    vi.clearAllMocks();
  });

  it('returns defaults when nothing is stored', async () => {
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('merges stored values with defaults', async () => {
    mockStorage.settings = { gradientOpacity: 0.5 };
    const settings = await loadSettings();
    expect(settings.gradientOpacity).toBe(0.5);
    expect(settings.enabled).toBe(true); // default
    expect(settings.weekendsEnabled).toBe(true); // default
  });
});

describe('saveSettings', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
    vi.clearAllMocks();
  });

  it('saves partial settings merged with current', async () => {
    await saveSettings({ gradientOpacity: 0.5 });
    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          gradientOpacity: 0.5,
          enabled: true,
        }),
      }),
      expect.any(Function),
    );
  });
});

describe('onSettingsChanged', () => {
  it('calls callback when settings change', () => {
    const cb = vi.fn();
    onSettingsChanged(cb);
    expect(chromeMock.storage.onChanged.addListener).toHaveBeenCalled();
  });
});
