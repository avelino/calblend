import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyMerge, restoreAll } from '../src/event-merging';
import type { CalendarEvent, EventGroup, ExtensionSettings } from '../src/types';
import { DEFAULT_SETTINGS } from '../src/types';

// jsdom doesn't implement matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

function makeElement(styles: Partial<CSSStyleDeclaration> = {}): HTMLElement {
  const el = document.createElement('div');
  Object.assign(el.style, styles);
  return el;
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    element: makeElement({ backgroundColor: 'rgb(255, 0, 0)' }),
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

const settings: ExtensionSettings = { ...DEFAULT_SETTINGS };

describe('applyMerge', () => {
  beforeEach(() => {
    restoreAll();
  });

  it('applies gradient to kept event when group has multiple events', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });
    const group = makeGroup([e1, e2]);

    applyMerge([group], settings);

    expect(e1.element.style.backgroundImage).toContain('linear-gradient');
    expect(e1.element.style.backgroundImage).toContain('rgba');
  });

  it('hides duplicate events (not the first)', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });
    const e3 = makeEvent({ color: 'rgb(0, 255, 0)' });
    const group = makeGroup([e1, e2, e3]);

    applyMerge([group], settings);

    expect(e1.element.style.visibility).toBe('visible');
    expect(e2.element.style.visibility).toBe('hidden');
    expect(e3.element.style.visibility).toBe('hidden');
  });

  it('sets backgroundColor to unset on merged event', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });

    applyMerge([makeGroup([e1, e2])], settings);

    expect(e1.element.style.backgroundColor).toBe('unset');
  });

  it('sets backgroundSize to cover on merged event', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });

    applyMerge([makeGroup([e1, e2])], settings);

    expect(e1.element.style.backgroundSize).toBe('cover');
  });

  it('applies border with light color in light mode', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });

    applyMerge([makeGroup([e1, e2])], { ...settings, theme: 'light' });

    // jsdom normalizes "solid 1px #fff" to "1px solid rgb(255, 255, 255)"
    expect(e1.element.style.border).toContain('solid');
    expect(e1.element.style.border).toContain('rgb(255, 255, 255)');
  });

  it('applies border with dark color in dark mode', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });

    applyMerge([makeGroup([e1, e2])], { ...settings, theme: 'dark' });

    expect(e1.element.style.border).toContain('solid');
    expect(e1.element.style.border).toContain('rgb(51, 51, 51)');
  });

  it('sorts busy events to the end (keeps real event title visible)', () => {
    const busyEl = makeElement({ backgroundColor: 'rgb(100, 100, 100)' });
    const realEl = makeElement({ backgroundColor: 'rgb(255, 0, 0)' });

    const busyEvent = makeEvent({
      element: busyEl,
      color: 'rgb(100, 100, 100)',
      isBusy: true,
    });
    const realEvent = makeEvent({
      element: realEl,
      color: 'rgb(255, 0, 0)',
      isBusy: false,
    });

    // Pass busy first — it should be sorted to the end
    applyMerge([makeGroup([busyEvent, realEvent])], settings);

    // Real event should be kept visible, busy hidden
    expect(realEl.style.visibility).toBe('visible');
    expect(busyEl.style.visibility).toBe('hidden');
  });

  it('does not modify single-event groups', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    e1.element.style.backgroundColor = 'rgb(255, 0, 0)';
    const originalBg = e1.element.style.backgroundColor;

    applyMerge([makeGroup([e1])], settings);

    expect(e1.element.style.backgroundColor).toBe(originalBg);
    expect(e1.element.style.visibility).not.toBe('hidden');
  });

  it('handles multiple groups independently', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });
    const e3 = makeEvent({ color: 'rgb(0, 255, 0)' });

    applyMerge(
      [makeGroup([e1, e2], 'g1'), makeGroup([e3], 'g2')],
      settings,
    );

    expect(e1.element.style.backgroundImage).toContain('linear-gradient');
    expect(e2.element.style.visibility).toBe('hidden');
    // e3 is alone, should not be modified
    expect(e3.element.style.backgroundImage).toBe('');
  });
});

describe('restoreAll', () => {
  beforeEach(() => {
    restoreAll();
  });

  it('restores all modified elements to original state', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });
    e1.element.style.backgroundColor = 'rgb(255, 0, 0)';
    e2.element.style.backgroundColor = 'rgb(0, 0, 255)';

    applyMerge([makeGroup([e1, e2])], settings);

    // After merge, styles are modified
    expect(e1.element.style.backgroundColor).toBe('unset');
    expect(e2.element.style.visibility).toBe('hidden');

    // After restore, styles go back to original
    restoreAll();

    expect(e1.element.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(e2.element.style.visibility).toBe('');
  });

  it('allows clean re-merge after restore', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });
    e1.element.style.backgroundColor = 'rgb(255, 0, 0)';
    e2.element.style.backgroundColor = 'rgb(0, 0, 255)';

    // First merge
    applyMerge([makeGroup([e1, e2])], settings);
    expect(e1.element.style.backgroundImage).toContain('linear-gradient');

    // Restore
    restoreAll();
    expect(e1.element.style.backgroundImage).toBe('');
    expect(e1.element.style.backgroundColor).toBe('rgb(255, 0, 0)');

    // Second merge should work identically
    applyMerge([makeGroup([e1, e2])], settings);
    expect(e1.element.style.backgroundImage).toContain('linear-gradient');
    expect(e2.element.style.visibility).toBe('hidden');
  });

  it('is safe to call when nothing was merged', () => {
    expect(() => restoreAll()).not.toThrow();
  });

  it('is idempotent (calling twice is safe)', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });
    e1.element.style.backgroundColor = 'rgb(255, 0, 0)';

    applyMerge([makeGroup([e1, e2])], settings);
    restoreAll();
    restoreAll(); // should not throw or break

    expect(e1.element.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });
});

describe('gradient opacity', () => {
  beforeEach(() => {
    restoreAll();
  });

  it('uses settings.gradientOpacity in the gradient', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });

    applyMerge([makeGroup([e1, e2])], { ...settings, gradientOpacity: 0.5 });

    expect(e1.element.style.backgroundImage).toContain('0.5');
  });

  it('uses default opacity 0.75', () => {
    const e1 = makeEvent({ color: 'rgb(255, 0, 0)' });
    const e2 = makeEvent({ color: 'rgb(0, 0, 255)' });

    applyMerge([makeGroup([e1, e2])], settings);

    expect(e1.element.style.backgroundImage).toContain('0.75');
  });
});
