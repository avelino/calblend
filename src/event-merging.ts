import type { CalendarEvent, EventGroup, ExtensionSettings } from './types';
import { stripesGradient, getMergeBorderColor, isDarkMode } from './colors';

interface OriginalStyle {
  backgroundImage: string;
  backgroundSize: string;
  backgroundColor: string;
  left: string;
  right: string;
  visibility: string;
  width: string;
  border: string;
}

// Store original state before any modifications
const originalStyles = new WeakMap<HTMLElement, OriginalStyle>();
const originalColors = new WeakMap<HTMLElement, string>();
// Track all elements we've modified so we can restore them
const modifiedElements = new Set<HTMLElement>();

function saveOriginalState(el: HTMLElement, color: string): void {
  if (originalStyles.has(el)) return; // already saved
  originalStyles.set(el, {
    backgroundImage: el.style.backgroundImage,
    backgroundSize: el.style.backgroundSize,
    backgroundColor: el.style.backgroundColor,
    left: el.style.left,
    right: el.style.right,
    visibility: el.style.visibility,
    width: el.style.width,
    border: el.style.border,
  });
  originalColors.set(el, color);
}

function restoreElement(el: HTMLElement): void {
  const saved = originalStyles.get(el);
  if (!saved) return;
  el.style.backgroundImage = saved.backgroundImage;
  el.style.backgroundSize = saved.backgroundSize;
  el.style.backgroundColor = saved.backgroundColor;
  el.style.left = saved.left;
  el.style.right = saved.right;
  el.style.visibility = saved.visibility;
  el.style.width = saved.width;
  el.style.border = saved.border;
  originalStyles.delete(el);
  originalColors.delete(el);
}

/**
 * Restore ALL modified elements to their original state.
 * Must be called before re-detecting events so we read clean DOM values.
 */
export function restoreAll(): void {
  for (const el of modifiedElements) {
    restoreElement(el);
  }
  modifiedElements.clear();
}

function mergeTimedEvents(
  events: CalendarEvent[],
  settings: ExtensionSettings,
  darkMode: boolean,
): void {
  // Sort: non-busy first (keep real event title visible), then by drag type
  events.sort((a, b) => {
    const busyDiff = (a.isBusy ? 1 : 0) - (b.isBusy ? 1 : 0);
    if (busyDiff !== 0) return busyDiff;
    const aType = parseInt(a.element.dataset.dragsourceType ?? '0', 10);
    const bType = parseInt(b.element.dataset.dragsourceType ?? '0', 10);
    return aType - bType;
  });

  // Save original state for all events in this group
  for (const event of events) {
    saveOriginalState(event.element, event.color);
    modifiedElements.add(event.element);
  }

  const colors = events.map((e) => originalColors.get(e.element) ?? e.color);

  // Calculate positions from current (clean) DOM state
  const positions = events.map((e) => e.position);

  const kept = events[0]!;
  const hidden = events.slice(1);

  // Hide duplicate events
  for (const event of hidden) {
    event.element.style.visibility = 'hidden';
  }

  // Apply merged gradient style
  kept.element.style.backgroundImage = stripesGradient(
    colors,
    10,
    45,
    settings.gradientOpacity,
  );
  kept.element.style.backgroundSize = 'cover';
  kept.element.style.backgroundColor = 'unset';
  kept.element.style.left =
    Math.min(...positions.map((p) => p.left)) + 'px';
  kept.element.style.right =
    Math.min(...positions.map((p) => p.right)) + 'px';
  kept.element.style.visibility = 'visible';
  kept.element.style.width = '';
  kept.element.style.border = `solid 1px ${getMergeBorderColor(darkMode)}`;
}

function mergeDotEvents(
  events: CalendarEvent[],
  settings: ExtensionSettings,
): void {
  for (const event of events) {
    saveOriginalState(event.element, event.color);
    modifiedElements.add(event.element);
  }

  const colors = events.map((e) => originalColors.get(e.element) ?? e.color);
  const kept = events[0]!;
  const hidden = events.slice(1);

  for (const event of hidden) {
    event.element.style.visibility = 'hidden';
  }

  const dots = kept.element.querySelector<HTMLElement>(
    '[role="button"] div:first-child',
  );
  const dot = dots?.querySelector<HTMLElement>('div');
  if (dot) {
    dot.style.backgroundImage = stripesGradient(colors, 4, 90, settings.gradientOpacity);
    dot.style.width = colors.length * 4 + 'px';
    dot.style.borderWidth = '0';
    dot.style.height = '8px';
  }
}

/**
 * Apply visual merging to event groups.
 * Call restoreAll() before findEvents() + groupEvents() to ensure clean DOM state.
 */
export function applyMerge(
  groups: EventGroup[],
  settings: ExtensionSettings,
): void {
  const darkMode = isDarkMode(
    settings.theme,
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : undefined,
  );

  for (const group of groups) {
    if (group.events.length > 1) {
      const firstColor = group.events[0]!.color;
      if (firstColor) {
        mergeTimedEvents(group.events, settings, darkMode);
      } else {
        mergeDotEvents(group.events, settings);
      }
    }
  }
}
