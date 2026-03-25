import { describe, it, expect, beforeEach } from 'vitest';
import {
  tryParseDate,
  parseApiV3Event,
  tryExtractEventFromArray,
  extractEventsFromStructure,
  parseBatchResponse,
  tryParseResponse,
  getTodayUpcoming,
  getAllEvents,
  hasData,
  mergeEvents,
  isCalendarUrl,
  type CalendarEventData,
} from '../desktop/src/inject/calendar-data';

// ── tryParseDate ─────────────────────────────────────────────────────

describe('tryParseDate', () => {
  it('parses date array [year, month, day]', () => {
    const d = tryParseDate([2026, 3, 25]);
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(2); // 0-indexed
    expect(d!.getDate()).toBe(25);
  });

  it('parses date-time array [year, month, day, hour, min, sec]', () => {
    const d = tryParseDate([2026, 3, 25, 14, 30, 0]);
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(14);
    expect(d!.getMinutes()).toBe(30);
  });

  it('parses epoch milliseconds', () => {
    const ts = new Date(2026, 2, 25, 10, 0).getTime();
    const d = tryParseDate(ts);
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(2);
  });

  it('parses ISO 8601 string', () => {
    const d = tryParseDate('2026-03-25T14:30:00-03:00');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
  });

  it('parses date-only ISO string', () => {
    const d = tryParseDate('2026-03-25');
    expect(d).not.toBeNull();
  });

  it('rejects invalid values', () => {
    expect(tryParseDate(null)).toBeNull();
    expect(tryParseDate(undefined)).toBeNull();
    expect(tryParseDate('hello')).toBeNull();
    expect(tryParseDate(42)).toBeNull(); // too small for epoch ms
    expect(tryParseDate([1800, 1, 1])).toBeNull(); // year out of range
    expect(tryParseDate([2026, 13, 1])).toBeNull(); // month out of range
  });

  it('rejects arrays with non-numeric values', () => {
    expect(tryParseDate([2026, 'March', 25])).toBeNull();
  });
});

// ── parseApiV3Event ──────────────────────────────────────────────────

describe('parseApiV3Event', () => {
  it('parses a standard timed event', () => {
    const ev = parseApiV3Event({
      id: 'abc123',
      summary: 'Team Standup',
      start: { dateTime: '2026-03-25T09:00:00-03:00' },
      end: { dateTime: '2026-03-25T09:30:00-03:00' },
    });
    expect(ev).not.toBeNull();
    expect(ev!.id).toBe('abc123');
    expect(ev!.title).toBe('Team Standup');
    expect(ev!.allDay).toBe(false);
  });

  it('parses an all-day event', () => {
    const ev = parseApiV3Event({
      id: 'allday1',
      summary: 'Holiday',
      start: { date: '2026-03-25' },
      end: { date: '2026-03-26' },
    });
    expect(ev).not.toBeNull();
    expect(ev!.allDay).toBe(true);
  });

  it('extracts color and location', () => {
    const ev = parseApiV3Event({
      id: 'x',
      summary: 'Lunch',
      start: { dateTime: '2026-03-25T12:00:00Z' },
      end: { dateTime: '2026-03-25T13:00:00Z' },
      colorId: '11',
      location: 'Restaurant',
    });
    expect(ev!.color).toBe('11');
    expect(ev!.location).toBe('Restaurant');
  });

  it('returns null without id', () => {
    expect(parseApiV3Event({ summary: 'No ID' })).toBeNull();
  });

  it('returns null without title', () => {
    expect(parseApiV3Event({ id: 'x', start: { dateTime: '2026-03-25T10:00:00Z' } })).toBeNull();
  });

  it('returns null with invalid date', () => {
    expect(parseApiV3Event({ id: 'x', summary: 'Bad', start: { dateTime: 'nope' } })).toBeNull();
  });

  it('uses "title" field as fallback for summary', () => {
    const ev = parseApiV3Event({
      id: 'x',
      title: 'Fallback Title',
      start: { dateTime: '2026-03-25T10:00:00Z' },
      end: { dateTime: '2026-03-25T11:00:00Z' },
    });
    expect(ev!.title).toBe('Fallback Title');
  });
});

// ── tryExtractEventFromArray ─────────────────────────────────────────

describe('tryExtractEventFromArray', () => {
  it('extracts event from [id, title, ..., dateArray, dateArray]', () => {
    const ev = tryExtractEventFromArray([
      'evt_001',
      'Daily Standup',
      null,
      null,
      [2026, 3, 25, 9, 0, 0],
      [2026, 3, 25, 9, 30, 0],
    ]);
    expect(ev).not.toBeNull();
    expect(ev!.id).toBe('evt_001');
    expect(ev!.title).toBe('Daily Standup');
    expect(ev!.start.getHours()).toBe(9);
    expect(ev!.end.getMinutes()).toBe(30);
  });

  it('extracts event with epoch timestamps', () => {
    const start = new Date(2026, 2, 25, 14, 0).getTime();
    const end = new Date(2026, 2, 25, 15, 0).getTime();
    const ev = tryExtractEventFromArray(['id1', 'Meeting', null, start, end]);
    expect(ev).not.toBeNull();
    expect(ev!.title).toBe('Meeting');
  });

  it('defaults end to start + 1h when only one date found', () => {
    const ev = tryExtractEventFromArray([
      'id2',
      'Quick Chat',
      null,
      null,
      [2026, 3, 25, 10, 0, 0],
    ]);
    expect(ev).not.toBeNull();
    const diff = ev!.end.getTime() - ev!.start.getTime();
    expect(diff).toBe(3_600_000);
  });

  it('detects all-day events', () => {
    const ev = tryExtractEventFromArray([
      'id3',
      'Conference',
      null,
      [2026, 3, 25, 0, 0, 0],
      [2026, 3, 26, 0, 0, 0],
    ]);
    expect(ev).not.toBeNull();
    expect(ev!.allDay).toBe(true);
  });

  it('rejects arrays too short', () => {
    expect(tryExtractEventFromArray(['id', 'title'])).toBeNull();
  });

  it('rejects non-string id or title', () => {
    expect(tryExtractEventFromArray([123, 'title', null, null, [2026, 1, 1]])).toBeNull();
    expect(tryExtractEventFromArray(['id', 123, null, null, [2026, 1, 1]])).toBeNull();
  });

  it('rejects titles that look like enum values', () => {
    expect(tryExtractEventFromArray(['id', 'null', null, [2026, 1, 1]])).toBeNull();
    expect(tryExtractEventFromArray(['id', '42', null, [2026, 1, 1]])).toBeNull();
  });
});

// ── extractEventsFromStructure ───────────────────────────────────────

describe('extractEventsFromStructure', () => {
  it('extracts from Calendar API v3 format', () => {
    const data = {
      items: [
        {
          id: 'a',
          summary: 'Event A',
          start: { dateTime: '2026-03-25T10:00:00Z' },
          end: { dateTime: '2026-03-25T11:00:00Z' },
        },
        {
          id: 'b',
          summary: 'Event B',
          start: { dateTime: '2026-03-25T14:00:00Z' },
          end: { dateTime: '2026-03-25T15:00:00Z' },
        },
      ],
    };
    const events = extractEventsFromStructure(data);
    expect(events).toHaveLength(2);
    expect(events[0]!.title).toBe('Event A');
    expect(events[1]!.title).toBe('Event B');
  });

  it('extracts from nested array structure', () => {
    const data = [
      [
        ['evt1', 'Morning Meeting', null, [2026, 3, 25, 9, 0, 0], [2026, 3, 25, 10, 0, 0]],
        ['evt2', 'Lunch', null, [2026, 3, 25, 12, 0, 0], [2026, 3, 25, 13, 0, 0]],
      ],
    ];
    const events = extractEventsFromStructure(data);
    expect(events.length).toBeGreaterThanOrEqual(2);
  });

  it('deduplicates by event ID', () => {
    const data = [
      ['evt1', 'Dup Event', null, [2026, 3, 25, 9, 0, 0], [2026, 3, 25, 10, 0, 0]],
      [
        ['evt1', 'Dup Event', null, [2026, 3, 25, 9, 0, 0], [2026, 3, 25, 10, 0, 0]],
      ],
    ];
    const events = extractEventsFromStructure(data);
    const ids = events.map((e) => e.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });

  it('returns empty array for non-event data', () => {
    expect(extractEventsFromStructure('hello')).toEqual([]);
    expect(extractEventsFromStructure(42)).toEqual([]);
    expect(extractEventsFromStructure(null)).toEqual([]);
  });
});

// ── parseBatchResponse ───────────────────────────────────────────────

describe('parseBatchResponse', () => {
  it('parses batchexecute response with JSON-encoded payload', () => {
    const eventData = JSON.stringify([
      ['evt1', 'Team Sync', null, [2026, 3, 25, 11, 0, 0], [2026, 3, 25, 12, 0, 0]],
    ]);
    const response = `)]}'\n\n42\n[[["wrb.fr","svc",${JSON.stringify(eventData)},null]]]`;
    const events = parseBatchResponse(response);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.find((e) => e.title === 'Team Sync')).toBeTruthy();
  });

  it('handles multiple blocks', () => {
    const data1 = JSON.stringify([
      ['e1', 'Event One', null, [2026, 3, 25, 9, 0, 0], [2026, 3, 25, 10, 0, 0]],
    ]);
    const data2 = JSON.stringify([
      ['e2', 'Event Two', null, [2026, 3, 25, 14, 0, 0], [2026, 3, 25, 15, 0, 0]],
    ]);
    const response =
      `)]}'\n\n100\n[[["wrb.fr","s1",${JSON.stringify(data1)},null]]]\n200\n[[["wrb.fr","s2",${JSON.stringify(data2)},null]]]`;
    const events = parseBatchResponse(response);
    expect(events.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty for non-batch content', () => {
    expect(parseBatchResponse('just plain text')).toEqual([]);
  });

  it('skips blocks with invalid JSON payloads', () => {
    const response = `)]}'\n\n10\n[[["wrb.fr","svc","not-json",null]]]`;
    const events = parseBatchResponse(response);
    expect(events).toEqual([]);
  });
});

// ── isCalendarUrl ────────────────────────────────────────────────────

describe('isCalendarUrl', () => {
  it('matches Google Calendar URLs', () => {
    expect(isCalendarUrl('https://calendar.google.com/calendar/u/0/r/month')).toBe(true);
    expect(isCalendarUrl('https://calendar.google.com/calendar/u/1/r/week')).toBe(true);
    expect(isCalendarUrl('https://clients6.google.com/calendar/v3/events')).toBe(true);
    expect(isCalendarUrl('https://www.googleapis.com/calendar/v3/calendars/primary/events')).toBe(true);
  });

  it('rejects non-calendar URLs', () => {
    expect(isCalendarUrl('https://www.google.com/search?q=calendar')).toBe(false);
    expect(isCalendarUrl('https://example.com')).toBe(false);
  });
});

// ── Store: mergeEvents / getTodayUpcoming / hasData ──────────────────

describe('store', () => {
  // Note: mergeEvents mutates global state. Tests may interact.
  // We merge distinct IDs to avoid cross-test interference.

  it('mergeEvents stores events and hasData returns true', () => {
    mergeEvents([
      {
        id: 'store_test_1',
        title: 'Test',
        start: new Date(),
        end: new Date(Date.now() + 3_600_000),
        allDay: false,
      },
    ]);
    expect(hasData()).toBe(true);
    expect(getAllEvents().find((e) => e.id === 'store_test_1')).toBeTruthy();
  });

  it('getTodayUpcoming filters to today and excludes all-day', () => {
    const now = new Date();
    const todayHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1);
    const todayEnd = new Date(todayHour.getTime() + 3_600_000);
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 0);

    mergeEvents([
      { id: 'today_timed', title: 'Today Timed', start: todayHour, end: todayEnd, allDay: false },
      { id: 'today_allday', title: 'Today AllDay', start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), allDay: true },
      { id: 'yesterday_ev', title: 'Yesterday', start: yesterday, end: new Date(yesterday.getTime() + 3_600_000), allDay: false },
    ]);

    const upcoming = getTodayUpcoming();
    const ids = upcoming.map((e) => e.id);
    expect(ids).toContain('today_timed');
    expect(ids).not.toContain('today_allday');
    expect(ids).not.toContain('yesterday_ev');
  });

  it('getTodayUpcoming sorts by start time', () => {
    const now = new Date();
    const h = now.getHours();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    mergeEvents([
      { id: 'sort_later', title: 'Later', start: new Date(base.getTime() + (h + 3) * 3_600_000), end: new Date(base.getTime() + (h + 4) * 3_600_000), allDay: false },
      { id: 'sort_sooner', title: 'Sooner', start: new Date(base.getTime() + (h + 1) * 3_600_000), end: new Date(base.getTime() + (h + 2) * 3_600_000), allDay: false },
    ]);

    const upcoming = getTodayUpcoming();
    const soonerIdx = upcoming.findIndex((e) => e.id === 'sort_sooner');
    const laterIdx = upcoming.findIndex((e) => e.id === 'sort_later');
    if (soonerIdx >= 0 && laterIdx >= 0) {
      expect(soonerIdx).toBeLessThan(laterIdx);
    }
  });
});

// ── tryParseResponse (integration) ───────────────────────────────────

describe('tryParseResponse', () => {
  it('parses Calendar API v3 JSON response', () => {
    const json = JSON.stringify({
      items: [
        {
          id: 'resp_1',
          summary: 'Parsed Event',
          start: { dateTime: '2026-03-25T10:00:00Z' },
          end: { dateTime: '2026-03-25T11:00:00Z' },
        },
      ],
    });
    const events = tryParseResponse(json, 'https://googleapis.com/calendar/v3/events');
    expect(events.length).toBe(1);
    expect(events[0]!.title).toBe('Parsed Event');
  });

  it('handles XSSI prefix', () => {
    const json = JSON.stringify({
      items: [
        {
          id: 'xssi_1',
          summary: 'XSSI Event',
          start: { dateTime: '2026-03-25T10:00:00Z' },
          end: { dateTime: '2026-03-25T11:00:00Z' },
        },
      ],
    });
    const events = tryParseResponse(`)]}'\n${json}`, 'https://calendar.google.com/calendar/u/0/');
    expect(events.length).toBe(1);
  });

  it('returns empty for unparseable content', () => {
    expect(tryParseResponse('not json at all', 'https://example.com')).toEqual([]);
  });
});
