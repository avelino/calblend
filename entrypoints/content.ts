import { loadSettings, onSettingsChanged } from '@/src/storage';
import { findEvents } from '@/src/event-detection';
import { groupEvents } from '@/src/event-grouping';
import { applyMerge, restoreAll } from '@/src/event-merging';
import { colorWeekends, colorMiniCalendar } from '@/src/weekend';
import { getWeekendColor } from '@/src/colors';
import { createCalendarObserver } from '@/src/observer';
import { injectStyles, removeStyles } from '@/src/styles';
import { applyFeatures, cleanupFeatures } from '@/src/features';

export default defineContentScript({
  matches: [
    'https://www.google.com/calendar/*',
    'https://calendar.google.com/*',
  ],
  runAt: 'document_end',

  async main() {
    let settings = await loadSettings();
    if (!settings.enabled) return;

    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Replace Google Calendar logo with CalBlend logo.
    // Google Calendar re-renders the header and resets the src, so we need to
    // persist our change by watching the img element for attribute mutations.
    const calblendLogoUrl = chrome.runtime.getURL('icon-large.png');
    let logoGuard: MutationObserver | null = null;

    function applyLogo(logo: HTMLImageElement): void {
      logo.src = calblendLogoUrl;
      logo.srcset = '';
    }

    function watchLogo(logo: HTMLImageElement): void {
      if (logoGuard) return; // already watching
      applyLogo(logo);
      logoGuard = new MutationObserver(() => {
        if (logo.src !== calblendLogoUrl) applyLogo(logo);
      });
      logoGuard.observe(logo, { attributes: true, attributeFilter: ['src'] });
    }

    function findAndWatchLogo(): boolean {
      const logo = document.querySelector<HTMLImageElement>(
        'img[src*="calendar/images/dynamiclogo"], img[src*="icon-large.png"]',
      );
      if (!logo) return false;
      watchLogo(logo);
      return true;
    }

    // Try immediately, then wait for header to render
    if (!findAndWatchLogo()) {
      const logoFinder = new MutationObserver(() => {
        if (findAndWatchLogo()) logoFinder.disconnect();
      });
      logoFinder.observe(document.body, { childList: true, subtree: true });
    }

    // Inject CSS-based features
    injectStyles(settings);

    function processMainCalendar(node: HTMLElement): void {
      // Restore all modified elements to clean DOM state before re-detecting.
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

      // Apply DOM-based features (focus mode, highlight, conflicts, etc.)
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

    // Re-process when settings change (no reload needed)
    onSettingsChanged((newSettings) => {
      settings = newSettings;
      if (!settings.enabled) {
        stop();
        cleanupFeatures();
        removeStyles();
        restoreAll();
        return;
      }
      // Update CSS features
      injectStyles(settings);
      // Disconnect, process, reconnect — same pattern as the observer itself
      stop();
      processAll();
      start();
    });
  },
});
