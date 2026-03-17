import { describe, it, expect } from 'vitest';
import { groupEvents } from '../src/event-grouping';
import type { CalendarEvent } from '../src/types';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    element: document.createElement('div'),
    title: 'Test Event',
    titleKey: '0_TestEvent_40px',
    positionKey: null,
    isBusy: false,
    color: 'rgb(255, 0, 0)',
    position: { left: 0, right: 0 },
    ...overrides,
  };
}

describe('groupEvents', () => {
  it('groups events with same titleKey', () => {
    const events = [
      makeEvent({ titleKey: '0_Meeting_40px', color: 'rgb(255, 0, 0)' }),
      makeEvent({ titleKey: '0_Meeting_40px', color: 'rgb(0, 0, 255)' }),
    ];

    const groups = groupEvents(events);
    const meetingGroup = groups.find((g) => g.key === '0_Meeting_40px');
    expect(meetingGroup).toBeDefined();
    expect(meetingGroup!.events).toHaveLength(2);
  });

  it('keeps events with different titleKeys in separate groups', () => {
    const events = [
      makeEvent({ titleKey: '0_Meeting_40px' }),
      makeEvent({ titleKey: '0_Lunch_40px' }),
    ];

    const groups = groupEvents(events);
    expect(groups).toHaveLength(2);
  });

  it('regroups busy events by position when they overlap', () => {
    const events = [
      makeEvent({
        titleKey: '0_Meeting_40px',
        positionKey: '0_100_80',
        isBusy: false,
      }),
      makeEvent({
        titleKey: '0_busy5–7am_40px',
        positionKey: '0_100_80',
        isBusy: true,
      }),
    ];

    const groups = groupEvents(events);
    const busyGroup = groups.find((g) => g.key.startsWith('_busy_'));
    expect(busyGroup).toBeDefined();
    expect(busyGroup!.events).toHaveLength(2);
  });

  it('does not regroup by position when no busy events exist', () => {
    const events = [
      makeEvent({
        titleKey: '0_Meeting_40px',
        positionKey: '0_100_80',
        isBusy: false,
      }),
      makeEvent({
        titleKey: '0_Meeting_40px',
        positionKey: '0_100_80',
        isBusy: false,
      }),
    ];

    const groups = groupEvents(events);
    expect(groups.find((g) => g.key.startsWith('_busy_'))).toBeUndefined();
    expect(groups.find((g) => g.key === '0_Meeting_40px')!.events).toHaveLength(2);
  });

  it('returns single-event groups for unique events', () => {
    const events = [makeEvent({ titleKey: '0_Solo_40px' })];

    const groups = groupEvents(events);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.events).toHaveLength(1);
  });
});
