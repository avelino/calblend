import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cleanupFeatures,
  applyCleanSidebar,
  applyCleanHeader,
  applyRefinedTimeLine,
  applyFocusMode,
  applyHighlightNextEvent,
  applyConflictIndicator,
  applyFeatures,
} from '../src/features';
import type { CalendarEvent, EventGroup, ExtensionSettings } from '../src/types';
import { DEFAULT_SETTINGS } from '../src/types';

function makeElement(tag = 'div'): HTMLElement {
  return document.createElement(tag);
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    element: makeElement(),
    title: 'Test Event',
    titleKey: '0_TestEvent_40px',
    positionKey: null,
    isBusy: false,
    color: 'rgb(255, 0, 0)',
    position: { left: 0, right: 0 },
    ...overrides,
  };
}

function makeGroup(events: CalendarEvent[], key = 'group1'): EventGroup {
  return { key, events };
}

function makeSettings(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

/** All DOM features disabled. */
function allFeaturesOff(): Partial<ExtensionSettings> {
  return {
    cleanSidebar: false,
    cleanHeader: false,
    refinedTimeLine: false,
    focusMode: false,
    highlightNextEvent: false,
    conflictIndicator: false,
  };
}

describe('cleanupFeatures', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('removes all calblend classes from elements', () => {
    const el1 = makeElement();
    el1.classList.add('calblend-sidebar-collapsed');
    const el2 = makeElement();
    el2.classList.add('calblend-header-hidden');
    const el3 = makeElement();
    el3.classList.add('calblend-next-event');
    document.body.append(el1, el2, el3);

    cleanupFeatures();

    expect(el1.classList.contains('calblend-sidebar-collapsed')).toBe(false);
    expect(el2.classList.contains('calblend-header-hidden')).toBe(false);
    expect(el3.classList.contains('calblend-next-event')).toBe(false);
  });

  it('removes injected badge elements from the DOM', () => {
    const parent = makeElement();
    const badge = makeElement();
    badge.classList.add('calblend-conflict-badge');
    parent.appendChild(badge);
    document.body.appendChild(parent);

    cleanupFeatures();

    expect(parent.querySelector('.calblend-conflict-badge')).toBeNull();
  });

  it('removes injected timeline dot elements from the DOM', () => {
    const parent = makeElement();
    const dot = makeElement();
    dot.classList.add('calblend-timeline-dot');
    parent.appendChild(dot);
    document.body.appendChild(parent);

    cleanupFeatures();

    expect(parent.querySelector('.calblend-timeline-dot')).toBeNull();
  });

  it('is safe to call when no calblend elements exist', () => {
    expect(() => cleanupFeatures()).not.toThrow();
  });

  it('handles multiple elements with the same class', () => {
    const el1 = makeElement();
    el1.classList.add('calblend-secondary-event');
    const el2 = makeElement();
    el2.classList.add('calblend-secondary-event');
    document.body.append(el1, el2);

    cleanupFeatures();

    expect(el1.classList.contains('calblend-secondary-event')).toBe(false);
    expect(el2.classList.contains('calblend-secondary-event')).toBe(false);
  });
});

describe('applyCleanSidebar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('collapses the sidebar element', () => {
    // Build a DOM structure: parent > [main, sidebar]
    const parent = makeElement();
    const main = makeElement();
    main.setAttribute('role', 'main');
    const sidebar = makeElement();
    const miniCal = makeElement();
    miniCal.setAttribute('data-month', '2024-01');
    sidebar.appendChild(miniCal);
    parent.append(main, sidebar);
    document.body.appendChild(parent);

    applyCleanSidebar();

    expect(sidebar.classList.contains('calblend-sidebar-collapsed')).toBe(true);
    expect(parent.classList.contains('calblend-sidebar-parent')).toBe(true);
  });

  it('does nothing when no main element exists', () => {
    expect(() => applyCleanSidebar()).not.toThrow();
  });

  it('does nothing when no sidebar with data-month exists', () => {
    const parent = makeElement();
    const main = makeElement();
    main.setAttribute('role', 'main');
    const sidebar = makeElement(); // No data-month child
    parent.append(main, sidebar);
    document.body.appendChild(parent);

    applyCleanSidebar();

    expect(sidebar.classList.contains('calblend-sidebar-collapsed')).toBe(false);
  });
});

describe('applyCleanHeader', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('hides header elements matching known selectors', () => {
    const settingsLink = document.createElement('a');
    settingsLink.href = 'https://calendar.google.com/settings';
    document.body.appendChild(settingsLink);

    // Mock getBoundingClientRect to return a position in the header area
    settingsLink.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 10, left: 0, right: 100, bottom: 40, width: 100, height: 30,
    });

    applyCleanHeader();

    expect(settingsLink.classList.contains('calblend-header-hidden')).toBe(true);
  });

  it('does not hide elements outside the header area', () => {
    const settingsLink = document.createElement('a');
    settingsLink.href = 'https://calendar.google.com/settings';
    document.body.appendChild(settingsLink);

    settingsLink.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 200, left: 0, right: 100, bottom: 240, width: 100, height: 30,
    });

    applyCleanHeader();

    expect(settingsLink.classList.contains('calblend-header-hidden')).toBe(false);
  });

  it('hides elements with aria-label containing Settings', () => {
    const btn = makeElement();
    btn.setAttribute('aria-label', 'Settings');
    document.body.appendChild(btn);

    btn.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 10, left: 0, right: 40, bottom: 40, width: 40, height: 30,
    });

    applyCleanHeader();

    expect(btn.classList.contains('calblend-header-hidden')).toBe(true);
  });

  it('hides elements with aria-label containing Support', () => {
    const btn = makeElement();
    btn.setAttribute('aria-label', 'Support');
    document.body.appendChild(btn);

    btn.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 10, left: 0, right: 40, bottom: 40, width: 40, height: 30,
    });

    applyCleanHeader();

    expect(btn.classList.contains('calblend-header-hidden')).toBe(true);
  });

  it('is safe to call when no matching elements exist', () => {
    expect(() => applyCleanHeader()).not.toThrow();
  });
});

describe('applyRefinedTimeLine', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('styles the time indicator element', () => {
    const main = makeElement();
    main.setAttribute('role', 'main');
    const indicator = makeElement();
    indicator.setAttribute('aria-hidden', 'true');
    indicator.style.backgroundColor = 'rgb(234, 67, 53)';
    indicator.style.height = '2px';
    indicator.style.position = 'absolute';
    main.appendChild(indicator);
    document.body.appendChild(main);

    applyRefinedTimeLine();

    expect(indicator.classList.contains('calblend-timeline')).toBe(true);
    expect(indicator.style.backgroundColor).toBe('transparent');
    expect(indicator.querySelector('.calblend-timeline-dot')).not.toBeNull();
  });

  it('does not add duplicate dots on repeated calls', () => {
    const main = makeElement();
    main.setAttribute('role', 'main');
    const indicator = makeElement();
    indicator.setAttribute('aria-hidden', 'true');
    indicator.style.backgroundColor = 'rgb(234, 67, 53)';
    indicator.style.height = '2px';
    indicator.style.position = 'absolute';
    main.appendChild(indicator);
    document.body.appendChild(main);

    applyRefinedTimeLine();
    // Restore bg so second call can match (it checks bg color)
    indicator.style.backgroundColor = 'rgb(234, 67, 53)';
    indicator.classList.remove('calblend-timeline');
    applyRefinedTimeLine();

    const dots = indicator.querySelectorAll('.calblend-timeline-dot');
    expect(dots.length).toBe(1);
  });

  it('does nothing when no main element exists', () => {
    expect(() => applyRefinedTimeLine()).not.toThrow();
  });

  it('does nothing when no red indicator is found', () => {
    const main = makeElement();
    main.setAttribute('role', 'main');
    const el = makeElement();
    el.setAttribute('aria-hidden', 'true');
    el.style.backgroundColor = 'rgb(0, 0, 255)';
    el.style.height = '2px';
    el.style.position = 'absolute';
    main.appendChild(el);
    document.body.appendChild(main);

    applyRefinedTimeLine();

    expect(el.classList.contains('calblend-timeline')).toBe(false);
  });

  it('ignores tall elements (not a time indicator)', () => {
    const main = makeElement();
    main.setAttribute('role', 'main');
    const el = makeElement();
    el.setAttribute('aria-hidden', 'true');
    el.style.backgroundColor = 'rgb(234, 67, 53)';
    el.style.height = '50px';
    el.style.position = 'absolute';
    main.appendChild(el);
    document.body.appendChild(main);

    applyRefinedTimeLine();

    expect(el.classList.contains('calblend-timeline')).toBe(false);
  });
});

describe('applyFocusMode', () => {
  it('dims events with non-primary colors', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e3 = makeEvent({ color: 'rgb(0, 0, 255)' });

    applyFocusMode([e1, e2, e3]);

    // Primary color is red (most frequent)
    expect(e1.element.classList.contains('calblend-secondary-event')).toBe(false);
    expect(e2.element.classList.contains('calblend-secondary-event')).toBe(false);
    expect(e3.element.classList.contains('calblend-secondary-event')).toBe(true);
  });

  it('does nothing when all events have the same color', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(255, 0, 0)' });

    applyFocusMode([e1, e2]);

    expect(e1.element.classList.contains('calblend-secondary-event')).toBe(false);
    expect(e2.element.classList.contains('calblend-secondary-event')).toBe(false);
  });

  it('does nothing with empty events array', () => {
    expect(() => applyFocusMode([])).not.toThrow();
  });

  it('handles events with no color', () => {
    const e1 = makeEvent({ color: '' });
    const e2 = makeEvent({ color: '' });

    expect(() => applyFocusMode([e1, e2])).not.toThrow();
    expect(e1.element.classList.contains('calblend-secondary-event')).toBe(false);
  });

  it('determines primary color by frequency', () => {
    const e1 = makeEvent({ color: 'rgb(0, 255, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });
    const e3 = makeEvent({ color: 'rgb(0, 0, 255)' });
    const e4 = makeEvent({ color: 'rgb(0, 0, 255)' });

    applyFocusMode([e1, e2, e3, e4]);

    // Blue is the most frequent
    expect(e1.element.classList.contains('calblend-secondary-event')).toBe(true);
    expect(e2.element.classList.contains('calblend-secondary-event')).toBe(false);
  });
});

describe('applyHighlightNextEvent', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('highlights the next event after the time indicator', () => {
    const container = makeElement();

    // Time indicator
    const timeIndicator = makeElement();
    timeIndicator.setAttribute('aria-hidden', 'true');
    container.appendChild(timeIndicator);

    // Events
    const event1 = makeElement();
    event1.setAttribute('data-eventid', '1');
    event1.setAttribute('role', 'button');
    container.appendChild(event1);

    const event2 = makeElement();
    event2.setAttribute('data-eventid', '2');
    event2.setAttribute('role', 'button');
    container.appendChild(event2);

    document.body.appendChild(container);

    // Mock positions: time indicator at y=100, event1 at y=80 (past), event2 at y=150 (future)
    timeIndicator.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100 });
    event1.getBoundingClientRect = vi.fn().mockReturnValue({ top: 80 });
    event2.getBoundingClientRect = vi.fn().mockReturnValue({ top: 150 });

    applyHighlightNextEvent(container);

    expect(event1.classList.contains('calblend-next-event')).toBe(false);
    expect(event2.classList.contains('calblend-next-event')).toBe(true);
  });

  it('highlights the closest future event when multiple exist', () => {
    const container = makeElement();

    const timeIndicator = makeElement();
    timeIndicator.setAttribute('aria-hidden', 'true');
    container.appendChild(timeIndicator);

    const event1 = makeElement();
    event1.setAttribute('data-eventid', '1');
    event1.setAttribute('role', 'button');
    container.appendChild(event1);

    const event2 = makeElement();
    event2.setAttribute('data-eventid', '2');
    event2.setAttribute('role', 'button');
    container.appendChild(event2);

    document.body.appendChild(container);

    timeIndicator.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100 });
    event1.getBoundingClientRect = vi.fn().mockReturnValue({ top: 120 }); // closer
    event2.getBoundingClientRect = vi.fn().mockReturnValue({ top: 200 }); // farther

    applyHighlightNextEvent(container);

    expect(event1.classList.contains('calblend-next-event')).toBe(true);
    expect(event2.classList.contains('calblend-next-event')).toBe(false);
  });

  it('does nothing when no events exist', () => {
    const container = makeElement();
    document.body.appendChild(container);

    expect(() => applyHighlightNextEvent(container)).not.toThrow();
  });

  it('does nothing when no time indicator exists', () => {
    const container = makeElement();
    const event1 = makeElement();
    event1.setAttribute('data-eventid', '1');
    event1.setAttribute('role', 'button');
    container.appendChild(event1);
    document.body.appendChild(container);

    applyHighlightNextEvent(container);

    expect(event1.classList.contains('calblend-next-event')).toBe(false);
  });

  it('does nothing when all events are in the past', () => {
    const container = makeElement();

    const timeIndicator = makeElement();
    timeIndicator.setAttribute('aria-hidden', 'true');
    container.appendChild(timeIndicator);

    const event1 = makeElement();
    event1.setAttribute('data-eventid', '1');
    event1.setAttribute('role', 'button');
    container.appendChild(event1);

    document.body.appendChild(container);

    timeIndicator.getBoundingClientRect = vi.fn().mockReturnValue({ top: 300 });
    event1.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100 });

    applyHighlightNextEvent(container);

    expect(event1.classList.contains('calblend-next-event')).toBe(false);
  });
});

describe('applyConflictIndicator', () => {
  it('adds conflict badge to events sharing position across different groups', () => {
    const e1 = makeEvent({ positionKey: 'pos_a' });
    const e2 = makeEvent({ positionKey: 'pos_a' });

    const group1 = makeGroup([e1], 'g1');
    const group2 = makeGroup([e2], 'g2');

    applyConflictIndicator([group1, group2]);

    expect(e1.element.classList.contains('calblend-conflict')).toBe(true);
    expect(e2.element.classList.contains('calblend-conflict')).toBe(true);
    expect(e1.element.querySelector('.calblend-conflict-badge')).not.toBeNull();
    expect(e2.element.querySelector('.calblend-conflict-badge')).not.toBeNull();
    expect(e1.element.querySelector('.calblend-conflict-badge')?.textContent).toBe('!');
  });

  it('does not mark events in the same group as conflicts', () => {
    const e1 = makeEvent({ positionKey: 'pos_a' });
    const e2 = makeEvent({ positionKey: 'pos_a' });

    const group1 = makeGroup([e1, e2], 'g1');

    applyConflictIndicator([group1]);

    expect(e1.element.classList.contains('calblend-conflict')).toBe(false);
    expect(e2.element.classList.contains('calblend-conflict')).toBe(false);
  });

  it('does not mark events with no positionKey', () => {
    const e1 = makeEvent({ positionKey: null });
    const e2 = makeEvent({ positionKey: null });

    applyConflictIndicator([makeGroup([e1], 'g1'), makeGroup([e2], 'g2')]);

    expect(e1.element.classList.contains('calblend-conflict')).toBe(false);
    expect(e2.element.classList.contains('calblend-conflict')).toBe(false);
  });

  it('does not add duplicate badges on repeated calls', () => {
    const e1 = makeEvent({ positionKey: 'pos_a' });
    const e2 = makeEvent({ positionKey: 'pos_a' });

    const groups = [makeGroup([e1], 'g1'), makeGroup([e2], 'g2')];

    applyConflictIndicator(groups);
    applyConflictIndicator(groups);

    const badges = e1.element.querySelectorAll('.calblend-conflict-badge');
    expect(badges.length).toBe(1);
  });

  it('is safe to call with empty groups', () => {
    expect(() => applyConflictIndicator([])).not.toThrow();
  });

  it('sets position relative on conflicting elements', () => {
    const e1 = makeEvent({ positionKey: 'pos_a' });
    const e2 = makeEvent({ positionKey: 'pos_a' });

    applyConflictIndicator([makeGroup([e1], 'g1'), makeGroup([e2], 'g2')]);

    expect(e1.element.style.position).toBe('relative');
    expect(e2.element.style.position).toBe('relative');
  });
});

describe('applyFeatures', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('calls individual features based on settings', () => {
    // Set up a minimal DOM for cleanSidebar
    const parent = makeElement();
    const main = makeElement();
    main.setAttribute('role', 'main');
    const sidebar = makeElement();
    const miniCal = makeElement();
    miniCal.setAttribute('data-month', '2024-01');
    sidebar.appendChild(miniCal);
    parent.append(main, sidebar);
    document.body.appendChild(parent);

    const container = makeElement();
    document.body.appendChild(container);

    const settings = makeSettings({
      ...allFeaturesOff(),
      cleanSidebar: true,
    });

    applyFeatures(settings, container, [], []);

    expect(sidebar.classList.contains('calblend-sidebar-collapsed')).toBe(true);
  });

  it('does not apply features that are disabled', () => {
    const container = makeElement();
    document.body.appendChild(container);

    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });

    const settings = makeSettings({
      ...allFeaturesOff(),
      focusMode: false,
    });

    applyFeatures(settings, container, [e1, e2], []);

    expect(e2.element.classList.contains('calblend-secondary-event')).toBe(false);
  });

  it('applies focusMode when enabled', () => {
    const container = makeElement();
    document.body.appendChild(container);

    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e3 = makeEvent({ color: 'rgb(0, 0, 255)' });

    const settings = makeSettings({
      ...allFeaturesOff(),
      focusMode: true,
    });

    applyFeatures(settings, container, [e1, e2, e3], []);

    expect(e3.element.classList.contains('calblend-secondary-event')).toBe(true);
  });

  it('applies conflictIndicator when enabled', () => {
    const container = makeElement();
    document.body.appendChild(container);

    const e1 = makeEvent({ positionKey: 'pos_a' });
    const e2 = makeEvent({ positionKey: 'pos_a' });
    const groups = [makeGroup([e1], 'g1'), makeGroup([e2], 'g2')];

    const settings = makeSettings({
      ...allFeaturesOff(),
      conflictIndicator: true,
    });

    applyFeatures(settings, container, [e1, e2], groups);

    expect(e1.element.classList.contains('calblend-conflict')).toBe(true);
    expect(e2.element.classList.contains('calblend-conflict')).toBe(true);
  });

  it('applies multiple features simultaneously', () => {
    // Set up DOM for sidebar
    const parent = makeElement();
    const main = makeElement();
    main.setAttribute('role', 'main');
    const sidebar = makeElement();
    const miniCal = makeElement();
    miniCal.setAttribute('data-month', '2024-01');
    sidebar.appendChild(miniCal);
    parent.append(main, sidebar);
    document.body.appendChild(parent);

    const container = makeElement();
    document.body.appendChild(container);

    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });

    const settings = makeSettings({
      ...allFeaturesOff(),
      cleanSidebar: true,
      focusMode: true,
    });

    applyFeatures(settings, container, [e1, e2], []);

    expect(sidebar.classList.contains('calblend-sidebar-collapsed')).toBe(true);
    expect(e2.element.classList.contains('calblend-secondary-event')).toBe(true);
  });
});
