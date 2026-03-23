/**
 * CalBlend Desktop - Content script entry point.
 * Replaces the WXT defineContentScript wrapper with direct execution.
 * Injected into Google Calendar via Tauri initialization_script.
 */

// Shim must be loaded first (bundled before this via esbuild)
import './shim';

import { findEvents } from '@calblend/event-detection';
import { groupEvents } from '@calblend/event-grouping';
import { applyMerge, restoreAll } from '@calblend/event-merging';
import { colorWeekends, colorMiniCalendar } from '@calblend/weekend';
import { getWeekendColor } from '@calblend/colors';
import { createCalendarObserver } from '@calblend/observer';
import { injectStyles, removeStyles } from '@calblend/styles';
import { applyFeatures, cleanupFeatures } from '@calblend/features';
import { loadSettings, onSettingsChanged } from '@calblend/storage';
import { DEFAULT_SETTINGS } from '@calblend/types';
import type { ExtensionSettings } from '@calblend/types';
import { initNotifications } from './notifications';
import { initTrayEvents } from './tray-events';
import { initBranding } from './branding';

async function initCalBlend(): Promise<void> {
  let settings: ExtensionSettings;
  try {
    settings = await loadSettings();
  } catch {
    console.warn('[CalBlend] Failed to load settings, using defaults');
    settings = { ...DEFAULT_SETTINGS };
  }

  if (!settings.enabled) return;

  const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // Inject CSS-based features
  injectStyles(settings);

  function processMainCalendar(node: HTMLElement): void {
    restoreAll();
    cleanupFeatures();

    const events = findEvents(node);
    const groups = groupEvents(events);
    applyMerge(groups, settings);

    if (settings.weekendsEnabled) {
      const color = getWeekendColor(
        settings.theme,
        settings.lightThemeColor,
        settings.darkThemeColor,
        darkMediaQuery,
      );
      colorWeekends(node, color);
    }

    applyFeatures(settings, node, events, groups);
  }

  function processMiniCalendar(node: HTMLElement): void {
    if (!settings.weekendsEnabled) return;
    const color = getWeekendColor(
      settings.theme,
      settings.lightThemeColor,
      settings.darkThemeColor,
      darkMediaQuery,
    );
    colorMiniCalendar(node, color);
  }

  function processAll(): void {
    document
      .querySelectorAll<HTMLElement>("[role='main']")
      .forEach(processMainCalendar);
    document
      .querySelectorAll<HTMLElement>('div[data-month], div[data-ical]')
      .forEach(processMiniCalendar);
  }

  const { start, stop } = createCalendarObserver(
    processMainCalendar,
    processMiniCalendar,
  );

  start();

  // Re-process when settings change (from settings window via localStorage)
  onSettingsChanged((newSettings) => {
    settings = newSettings;
    if (!settings.enabled) {
      stop();
      cleanupFeatures();
      removeStyles();
      restoreAll();
      return;
    }
    injectStyles(settings);
    stop();
    processAll();
    start();
  });

  // Initialize native OS features
  initBranding();
  initNotifications();
  initTrayEvents();

  console.log('[CalBlend] Desktop injection active');
}

// Wait for DOM to be ready, then initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initCalBlend());
} else {
  initCalBlend();
}
