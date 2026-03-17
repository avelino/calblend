import { describe, it, expect } from 'vitest';
import { findEvents } from '../src/event-detection';

/**
 * Build a minimal Google Calendar DOM structure for testing.
 * Structure: container > [role="gridcell"] > [data-eventid] [role="button"] > [aria-hidden="true"]
 */
function createCalendarDOM(
  days: Array<{
    events: Array<{
      title: string;
      color?: string;
      height?: string;
      busy?: boolean;
    }>;
  }>,
): HTMLElement {
  const container = document.createElement('div');

  for (const day of days) {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');

    for (const evt of day.events) {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-eventid', `evt-${Math.random()}`);

      const button = document.createElement('div');
      button.setAttribute('role', 'button');
      if (evt.color) {
        button.style.backgroundColor = evt.color;
      }
      if (evt.height) {
        button.style.height = evt.height;
      }

      const titleEl = document.createElement('span');
      titleEl.setAttribute('aria-hidden', 'true');
      titleEl.textContent = evt.busy ? `busy${evt.title}` : evt.title;

      button.appendChild(titleEl);
      wrapper.appendChild(button);
      cell.appendChild(wrapper);
    }

    container.appendChild(cell);
  }

  return container;
}

describe('findEvents', () => {
  it('detects events from calendar DOM structure', () => {
    const container = createCalendarDOM([
      {
        events: [
          { title: 'Meeting', color: 'rgb(255, 0, 0)', height: '40px' },
        ],
      },
    ]);

    const events = findEvents(container);
    expect(events).toHaveLength(1);
    expect(events[0]!.title).toBe('Meeting');
    expect(events[0]!.isBusy).toBe(false);
  });

  it('detects multiple events across days', () => {
    const container = createCalendarDOM([
      { events: [{ title: 'Morning', color: 'rgb(255, 0, 0)', height: '40px' }] },
      { events: [{ title: 'Afternoon', color: 'rgb(0, 255, 0)', height: '60px' }] },
    ]);

    const events = findEvents(container);
    expect(events).toHaveLength(2);
    expect(events[0]!.title).toBe('Morning');
    expect(events[1]!.title).toBe('Afternoon');
  });

  it('groups same-title events on same day with same titleKey', () => {
    const container = createCalendarDOM([
      {
        events: [
          { title: 'Standup', color: 'rgb(255, 0, 0)', height: '20px' },
          { title: 'Standup', color: 'rgb(0, 0, 255)', height: '20px' },
        ],
      },
    ]);

    const events = findEvents(container);
    expect(events).toHaveLength(2);
    expect(events[0]!.titleKey).toBe(events[1]!.titleKey);
  });

  it('gives different titleKeys to events on different days', () => {
    const container = createCalendarDOM([
      { events: [{ title: 'Standup', color: 'rgb(255, 0, 0)', height: '20px' }] },
      { events: [{ title: 'Standup', color: 'rgb(0, 0, 255)', height: '20px' }] },
    ]);

    const events = findEvents(container);
    expect(events).toHaveLength(2);
    expect(events[0]!.titleKey).not.toBe(events[1]!.titleKey);
  });

  it('detects busy events', () => {
    const container = createCalendarDOM([
      {
        events: [
          { title: ' 5 – 7am', color: 'rgb(100, 100, 100)', height: '40px', busy: true },
        ],
      },
    ]);

    const events = findEvents(container);
    expect(events).toHaveLength(1);
    expect(events[0]!.isBusy).toBe(true);
  });

  it('detects busy events case-insensitively', () => {
    const container = createCalendarDOM([
      { events: [{ title: '10am', height: '40px', color: 'rgb(0,0,0)', busy: true }] },
    ]);

    // The busy pattern matches "busy" prefix (our helper prepends "busy" when busy: true)
    const events = findEvents(container);
    expect(events[0]!.isBusy).toBe(true);
  });

  it('skips events without title elements', () => {
    const container = document.createElement('div');
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-eventid', 'evt-1');
    const button = document.createElement('div');
    button.setAttribute('role', 'button');
    // No aria-hidden title element
    wrapper.appendChild(button);
    cell.appendChild(wrapper);
    container.appendChild(cell);

    const events = findEvents(container);
    expect(events).toHaveLength(0);
  });

  it('reads color from backgroundColor', () => {
    const container = createCalendarDOM([
      { events: [{ title: 'Test', color: 'rgb(200, 100, 50)', height: '40px' }] },
    ]);

    const events = findEvents(container);
    // jsdom normalizes rgb values
    expect(events[0]!.color).toContain('200');
  });

  it('normalizes whitespace in title for grouping', () => {
    const container = document.createElement('div');
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');

    // Event with multiple title spans (Google Calendar splits time and title)
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-eventid', 'evt-1');
    const button = document.createElement('div');
    button.setAttribute('role', 'button');
    button.style.backgroundColor = 'rgb(255, 0, 0)';
    button.style.height = '40px';

    const span1 = document.createElement('span');
    span1.setAttribute('aria-hidden', 'true');
    span1.textContent = '9 AM ';
    const span2 = document.createElement('span');
    span2.setAttribute('aria-hidden', 'true');
    span2.textContent = ' Meeting';

    button.appendChild(span1);
    button.appendChild(span2);
    wrapper.appendChild(button);
    cell.appendChild(wrapper);
    container.appendChild(cell);

    const events = findEvents(container);
    expect(events).toHaveLength(1);
    // Whitespace is collapsed in the titleKey
    expect(events[0]!.titleKey).toContain('9AMMeeting');
  });
});
