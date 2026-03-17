import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCalendarObserver } from '../src/observer';

// Mock requestAnimationFrame to run synchronously in tests
let rafCallbacks: Array<() => void> = [];
function flushRAF(): void {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach((cb) => cb());
}

beforeEach(() => {
  rafCallbacks = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCallbacks.push(cb as () => void);
    return rafCallbacks.length;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createCalendarObserver', () => {
  it('returns start and stop functions', () => {
    const { start, stop } = createCalendarObserver(vi.fn(), vi.fn());
    expect(typeof start).toBe('function');
    expect(typeof stop).toBe('function');
  });

  it('calls onMainCalendar when nodes are added inside [role="main"]', async () => {
    const onMain = vi.fn();
    const onMini = vi.fn();
    const { start, stop } = createCalendarObserver(onMain, onMini);

    const mainContainer = document.createElement('div');
    mainContainer.setAttribute('role', 'main');
    document.body.appendChild(mainContainer);

    start();

    // Add a child node inside the main container
    const event = document.createElement('div');
    mainContainer.appendChild(event);

    // Wait for MutationObserver to fire
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushRAF();

    expect(onMain).toHaveBeenCalledWith(mainContainer);
    expect(onMini).not.toHaveBeenCalled();

    stop();
    mainContainer.remove();
  });

  it('calls onMiniCalendar when nodes are added inside div[data-month]', async () => {
    const onMain = vi.fn();
    const onMini = vi.fn();
    const { start, stop } = createCalendarObserver(onMain, onMini);

    const miniContainer = document.createElement('div');
    miniContainer.setAttribute('data-month', '2024-03');
    document.body.appendChild(miniContainer);

    start();

    const cell = document.createElement('span');
    miniContainer.appendChild(cell);

    await new Promise((resolve) => setTimeout(resolve, 0));
    flushRAF();

    expect(onMini).toHaveBeenCalledWith(miniContainer);

    stop();
    miniContainer.remove();
  });

  it('does NOT fire for irrelevant DOM changes', async () => {
    const onMain = vi.fn();
    const onMini = vi.fn();
    const { start, stop } = createCalendarObserver(onMain, onMini);

    start();

    // Add a random div that's not a calendar container
    const randomDiv = document.createElement('div');
    randomDiv.className = 'tooltip';
    document.body.appendChild(randomDiv);

    await new Promise((resolve) => setTimeout(resolve, 0));
    // Should not have scheduled any rAF
    expect(rafCallbacks).toHaveLength(0);
    expect(onMain).not.toHaveBeenCalled();
    expect(onMini).not.toHaveBeenCalled();

    stop();
    randomDiv.remove();
  });

  it('does NOT fire for dialog changes', async () => {
    const onMain = vi.fn();
    const onMini = vi.fn();
    const { start, stop } = createCalendarObserver(onMain, onMini);

    start();

    // Add a dialog element (event detail popup)
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);

    const child = document.createElement('div');
    dialog.appendChild(child);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(rafCallbacks).toHaveLength(0);
    expect(onMain).not.toHaveBeenCalled();

    stop();
    dialog.remove();
  });

  it('stop() disconnects the observer', async () => {
    const onMain = vi.fn();
    const { start, stop } = createCalendarObserver(onMain, vi.fn());

    const mainContainer = document.createElement('div');
    mainContainer.setAttribute('role', 'main');
    document.body.appendChild(mainContainer);

    start();
    stop();

    // Changes after stop should not trigger callback
    const event = document.createElement('div');
    mainContainer.appendChild(event);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onMain).not.toHaveBeenCalled();

    mainContainer.remove();
  });

  it('debounces multiple rapid mutations into one callback', async () => {
    const onMain = vi.fn();
    const { start, stop } = createCalendarObserver(onMain, vi.fn());

    const mainContainer = document.createElement('div');
    mainContainer.setAttribute('role', 'main');
    document.body.appendChild(mainContainer);

    start();

    // Rapidly add multiple children
    mainContainer.appendChild(document.createElement('div'));
    mainContainer.appendChild(document.createElement('div'));
    mainContainer.appendChild(document.createElement('div'));

    await new Promise((resolve) => setTimeout(resolve, 0));
    flushRAF();

    // Should be called once (debounced), not three times
    expect(onMain).toHaveBeenCalledTimes(1);

    stop();
    mainContainer.remove();
  });
});
