import type { ExtensionSettings, CalendarEvent, EventGroup } from './types';

const CALBLEND_CLASSES = [
  'calblend-sidebar-collapsed',
  'calblend-sidebar-parent',
  'calblend-header-hidden',
  'calblend-timeline',
  'calblend-timeline-dot',
  'calblend-secondary-event',
  'calblend-next-event',
  'calblend-conflict',
  'calblend-conflict-badge',
] as const;

const CALBLEND_SELECTOR = CALBLEND_CLASSES.map((c) => `.${c}`).join(',');
const REMOVABLE_CLASSES = new Set<string>(['calblend-conflict-badge', 'calblend-timeline-dot']);

/**
 * Remove all CalBlend feature classes and injected elements from the DOM.
 */
export function cleanupFeatures(): void {
  const elements = document.querySelectorAll(CALBLEND_SELECTOR);
  for (const el of elements) {
    for (const cls of CALBLEND_CLASSES) {
      if (el.classList.contains(cls)) {
        el.classList.remove(cls);
        if (REMOVABLE_CLASSES.has(cls)) {
          el.remove();
          break;
        }
      }
    }
  }
}

/**
 * Find the sidebar element (contains mini calendar, sits beside [role='main']).
 */
function findSidebar(): HTMLElement | null {
  const main = document.querySelector<HTMLElement>('[role="main"]');
  if (!main?.parentElement) return null;

  const siblings = Array.from(main.parentElement.children);
  for (const sibling of siblings) {
    if (
      sibling !== main &&
      sibling instanceof HTMLElement &&
      sibling.querySelector('div[data-month]')
    ) {
      return sibling;
    }
  }
  return null;
}

/**
 * Auto-collapse sidebar, reveal on hover.
 */
export function applyCleanSidebar(): void {
  const sidebar = findSidebar();
  if (!sidebar) return;

  sidebar.classList.add('calblend-sidebar-collapsed');
  sidebar.parentElement?.classList.add('calblend-sidebar-parent');
}

/**
 * Find and hide non-essential header elements (settings, support, apps icons).
 * Keeps: logo, date navigation, view switcher.
 */
export function applyCleanHeader(): void {
  // Google Calendar header buttons that aren't navigation:
  // settings gear, support icon, other apps grid, side panel toggle
  const selectors = [
    'a[href*="settings"]',           // Settings link
    '[data-tooltip*="Settings"]',    // Settings button
    '[data-tooltip*="Support"]',     // Support button
    '[aria-label*="Settings"]',      // Settings by aria
    '[aria-label*="Support"]',       // Support by aria
    '[aria-label*="Google apps"]',   // Apps grid
    '[aria-label*="Side panel"]',    // Side panel toggle
  ];

  for (const selector of selectors) {
    const els = document.querySelectorAll<HTMLElement>(selector);
    for (const el of els) {
      // Only hide if it's in the header area (top 80px of page)
      const rect = el.getBoundingClientRect();
      if (rect.top < 80) {
        el.classList.add('calblend-header-hidden');
      }
    }
  }
}

/**
 * Restyle the current time indicator (red line) with a refined look.
 */
export function applyRefinedTimeLine(): void {
  const main = document.querySelector<HTMLElement>('[role="main"]');
  if (!main) return;

  // The time indicator is a thin, absolutely positioned element with a red background.
  const candidates = main.querySelectorAll<HTMLElement>('div[aria-hidden="true"]');

  for (const el of candidates) {
    const bg = el.style.backgroundColor || '';
    const height = parseInt(el.style.height || '0', 10);

    const isRed = /rgb\(\s*2[0-2]\d\s*,\s*[0-5]\d\s*,\s*[0-5]\d\s*\)/.test(bg) ||
                  bg.includes('209, 68, 20') ||
                  bg.includes('234, 67, 53') ||
                  bg.includes('217, 48, 37');

    if (isRed && height <= 4 && el.style.position === 'absolute') {
      el.classList.add('calblend-timeline');
      el.style.backgroundColor = 'transparent';

      if (!el.querySelector('.calblend-timeline-dot')) {
        const dot = document.createElement('div');
        dot.className = 'calblend-timeline-dot';
        el.appendChild(dot);
      }
      break;
    }
  }
}

/**
 * Determine the primary calendar color (most frequent color among events).
 */
function getPrimaryColor(events: CalendarEvent[]): string | null {
  const colorCounts = new Map<string, number>();
  for (const event of events) {
    if (!event.color) continue;
    const count = colorCounts.get(event.color) ?? 0;
    colorCounts.set(event.color, count + 1);
  }

  let maxCount = 0;
  let primaryColor: string | null = null;
  for (const [color, count] of colorCounts) {
    if (count > maxCount) {
      maxCount = count;
      primaryColor = color;
    }
  }
  return primaryColor;
}

/**
 * Dim events from secondary calendars (non-primary color).
 */
export function applyFocusMode(events: CalendarEvent[]): void {
  const primaryColor = getPrimaryColor(events);
  if (!primaryColor) return;

  for (const event of events) {
    if (event.color && event.color !== primaryColor) {
      event.element.classList.add('calblend-secondary-event');
    }
  }
}

/**
 * Highlight the next upcoming event with a glow effect.
 * Uses the vertical position of events relative to the current time indicator.
 */
export function applyHighlightNextEvent(container: HTMLElement): void {
  // Find all timed events (have color = positioned in the time grid)
  const events = container.querySelectorAll<HTMLElement>(
    '[data-eventid][role="button"], [data-eventid] > [role="button"]',
  );
  if (events.length === 0) return;

  // Find the time indicator position
  const timeIndicator = container.querySelector<HTMLElement>('.calblend-timeline, div[aria-hidden="true"]');
  if (!timeIndicator) return;

  const timeY = timeIndicator.getBoundingClientRect().top;
  let closestEvent: HTMLElement | null = null;
  let closestDistance = Infinity;

  for (const event of events) {
    const rect = event.getBoundingClientRect();
    // Only consider events that start after the current time
    const distance = rect.top - timeY;
    if (distance > 0 && distance < closestDistance) {
      closestDistance = distance;
      closestEvent = event;
    }
  }

  if (closestEvent) {
    closestEvent.classList.add('calblend-next-event');
  }
}

/**
 * Add conflict indicators to overlapping events that weren't merged.
 * An event is conflicting if it overlaps with another event in the same day
 * and they weren't grouped together.
 */
export function applyConflictIndicator(groups: EventGroup[]): void {
  // Build event → groupKey lookup and positionKey → group keys map
  const eventGroupKey = new Map<CalendarEvent, string>();
  const positionMap = new Map<string, CalendarEvent[]>();

  for (const group of groups) {
    for (const event of group.events) {
      eventGroupKey.set(event, group.key);
      if (!event.positionKey) continue;
      const existing = positionMap.get(event.positionKey) ?? [];
      existing.push(event);
      positionMap.set(event.positionKey, existing);
    }
  }

  // Find events that share position but are in different groups
  for (const [, events] of positionMap) {
    if (events.length <= 1) continue;

    const groupKeys = new Set<string>();
    for (const event of events) {
      const key = eventGroupKey.get(event);
      if (key) groupKeys.add(key);
    }

    if (groupKeys.size > 1) {
      for (const event of events) {
        event.element.classList.add('calblend-conflict');
        if (!event.element.querySelector('.calblend-conflict-badge')) {
          const badge = document.createElement('div');
          badge.className = 'calblend-conflict-badge';
          badge.textContent = '!';
          event.element.style.position = 'relative';
          event.element.appendChild(badge);
        }
      }
    }
  }
}

/**
 * Apply all enabled DOM-based features.
 */
export function applyFeatures(
  settings: ExtensionSettings,
  container: HTMLElement,
  events: CalendarEvent[],
  groups: EventGroup[],
): void {
  if (settings.cleanSidebar) applyCleanSidebar();
  if (settings.cleanHeader) applyCleanHeader();
  if (settings.refinedTimeLine) applyRefinedTimeLine();
  if (settings.focusMode) applyFocusMode(events);
  if (settings.highlightNextEvent) applyHighlightNextEvent(container);
  if (settings.conflictIndicator) applyConflictIndicator(groups);
}
