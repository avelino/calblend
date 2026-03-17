import { describe, it, expect, beforeEach } from 'vitest';
import { buildStylesheet, injectStyles, removeStyles } from '../src/styles';
import type { ExtensionSettings } from '../src/types';
import { DEFAULT_SETTINGS } from '../src/types';

function makeSettings(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

/** Settings with all CSS features disabled. */
function disabledFeatures(): Partial<ExtensionSettings> {
  return {
    roundedEvents: false,
    eventShadow: false,
    smoothAnimations: false,
    softGrid: false,
    modernUI: false,
    dimMiniCalendar: false,
    improvedTypography: false,
    refinedColors: false,
    cleanSidebar: false,
    cleanHeader: false,
    refinedTimeLine: false,
    focusMode: false,
    highlightNextEvent: false,
    conflictIndicator: false,
  };
}

describe('buildStylesheet', () => {
  it('returns empty string when extension is disabled', () => {
    const settings = makeSettings({ enabled: false });
    expect(buildStylesheet(settings)).toBe('');
  });

  it('returns empty string when enabled is false even if features are on', () => {
    const settings = makeSettings({ enabled: false, roundedEvents: true, eventShadow: true });
    expect(buildStylesheet(settings)).toBe('');
  });

  it('includes CSS for each enabled feature', () => {
    const settings = makeSettings({
      ...disabledFeatures(),
      roundedEvents: true,
      eventShadow: true,
    });
    const css = buildStylesheet(settings);

    expect(css).toContain('border-radius: 8px');
    expect(css).toContain('box-shadow');
  });

  it('excludes CSS for disabled features', () => {
    const settings = makeSettings({
      ...disabledFeatures(),
      roundedEvents: true,
    });
    const css = buildStylesheet(settings);

    expect(css).toContain('border-radius: 8px');
    // eventShadow is off, so no box-shadow rule
    expect(css).not.toContain('box-shadow');
  });

  it('returns empty string when all features are disabled but extension is enabled', () => {
    const settings = makeSettings({ enabled: true, ...disabledFeatures() });
    expect(buildStylesheet(settings)).toBe('');
  });

  it('includes cleanSidebar CSS when enabled', () => {
    const settings = makeSettings({ ...disabledFeatures(), cleanSidebar: true });
    const css = buildStylesheet(settings);
    expect(css).toContain('calblend-sidebar-collapsed');
  });

  it('includes cleanHeader CSS when enabled', () => {
    const settings = makeSettings({ ...disabledFeatures(), cleanHeader: true });
    const css = buildStylesheet(settings);
    expect(css).toContain('calblend-header-hidden');
  });

  it('includes refinedTimeLine CSS when enabled', () => {
    const settings = makeSettings({ ...disabledFeatures(), refinedTimeLine: true });
    const css = buildStylesheet(settings);
    expect(css).toContain('calblend-timeline');
  });

  it('includes focusMode CSS when enabled', () => {
    const settings = makeSettings({ ...disabledFeatures(), focusMode: true });
    const css = buildStylesheet(settings);
    expect(css).toContain('calblend-secondary-event');
  });

  it('includes highlightNextEvent CSS when enabled', () => {
    const settings = makeSettings({ ...disabledFeatures(), highlightNextEvent: true });
    const css = buildStylesheet(settings);
    expect(css).toContain('calblend-next-event');
  });

  it('includes conflictIndicator CSS when enabled', () => {
    const settings = makeSettings({ ...disabledFeatures(), conflictIndicator: true });
    const css = buildStylesheet(settings);
    expect(css).toContain('calblend-conflict-badge');
  });

  it('includes smoothAnimations CSS when enabled', () => {
    const settings = makeSettings({ ...disabledFeatures(), smoothAnimations: true });
    const css = buildStylesheet(settings);
    expect(css).toContain('transition');
    expect(css).toContain('translateY');
  });

  it('includes dimMiniCalendar CSS when enabled', () => {
    const settings = makeSettings({ ...disabledFeatures(), dimMiniCalendar: true });
    const css = buildStylesheet(settings);
    expect(css).toContain('data-month');
    expect(css).toContain('opacity: 0.4');
  });

  it('includes improvedTypography CSS when enabled', () => {
    const settings = makeSettings({ ...disabledFeatures(), improvedTypography: true });
    const css = buildStylesheet(settings);
    expect(css).toContain('font-weight: 500');
    expect(css).toContain('letter-spacing');
  });

  it('includes refinedColors CSS when enabled', () => {
    const settings = makeSettings({ ...disabledFeatures(), refinedColors: true });
    const css = buildStylesheet(settings);
    expect(css).toContain('saturate');
    expect(css).toContain('brightness');
  });

  it('includes all features when all are enabled', () => {
    const settings = makeSettings();
    const css = buildStylesheet(settings);

    expect(css).toContain('border-radius: 8px');
    expect(css).toContain('box-shadow');
    expect(css).toContain('transition');
    expect(css).toContain('data-month');
    expect(css).toContain('font-weight: 500');
    expect(css).toContain('saturate');
    expect(css).toContain('calblend-sidebar-collapsed');
    expect(css).toContain('calblend-header-hidden');
    expect(css).toContain('calblend-timeline');
    expect(css).toContain('calblend-secondary-event');
    expect(css).toContain('calblend-next-event');
    expect(css).toContain('calblend-conflict-badge');
  });
});

describe('injectStyles', () => {
  beforeEach(() => {
    // Clean up any injected style elements
    document.getElementById('calblend-styles')?.remove();
  });

  it('creates a style element in document head', () => {
    const settings = makeSettings({ ...disabledFeatures(), roundedEvents: true });
    injectStyles(settings);

    const el = document.getElementById('calblend-styles');
    expect(el).not.toBeNull();
    expect(el?.tagName).toBe('STYLE');
    expect(el?.parentElement).toBe(document.head);
    expect(el?.textContent).toContain('border-radius: 8px');
  });

  it('updates existing style element on subsequent calls', () => {
    const settings1 = makeSettings({ ...disabledFeatures(), roundedEvents: true });
    injectStyles(settings1);

    const el1 = document.getElementById('calblend-styles');
    expect(el1?.textContent).toContain('border-radius');
    expect(el1?.textContent).not.toContain('box-shadow');

    const settings2 = makeSettings({ ...disabledFeatures(), eventShadow: true });
    injectStyles(settings2);

    const el2 = document.getElementById('calblend-styles');
    // Same element, updated content
    expect(el2).toBe(el1);
    expect(el2?.textContent).toContain('box-shadow');
    expect(el2?.textContent).not.toContain('border-radius');
  });

  it('removes style element when extension is disabled', () => {
    // First inject
    injectStyles(makeSettings({ ...disabledFeatures(), roundedEvents: true }));
    expect(document.getElementById('calblend-styles')).not.toBeNull();

    // Disable extension
    injectStyles(makeSettings({ enabled: false }));
    expect(document.getElementById('calblend-styles')).toBeNull();
  });

  it('removes style element when all features are disabled', () => {
    injectStyles(makeSettings({ ...disabledFeatures(), roundedEvents: true }));
    expect(document.getElementById('calblend-styles')).not.toBeNull();

    injectStyles(makeSettings({ enabled: true, ...disabledFeatures() }));
    expect(document.getElementById('calblend-styles')).toBeNull();
  });

  it('does not create element when there is no CSS to inject', () => {
    injectStyles(makeSettings({ enabled: false }));
    expect(document.getElementById('calblend-styles')).toBeNull();
  });
});

describe('removeStyles', () => {
  beforeEach(() => {
    document.getElementById('calblend-styles')?.remove();
  });

  it('removes the injected style element', () => {
    injectStyles(makeSettings({ ...disabledFeatures(), roundedEvents: true }));
    expect(document.getElementById('calblend-styles')).not.toBeNull();

    removeStyles();
    expect(document.getElementById('calblend-styles')).toBeNull();
  });

  it('is safe to call when no style element exists', () => {
    expect(() => removeStyles()).not.toThrow();
  });

  it('is idempotent', () => {
    injectStyles(makeSettings({ ...disabledFeatures(), roundedEvents: true }));
    removeStyles();
    removeStyles();
    expect(document.getElementById('calblend-styles')).toBeNull();
  });
});
