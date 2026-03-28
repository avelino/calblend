import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock calendar-data before importing calendar-fetch
const mockMergeEvents = vi.fn();
const mockParseApiV3Event = vi.fn();

vi.mock('../desktop/src/inject/calendar-data', () => ({
  mergeEvents: (...args: unknown[]) => mockMergeEvents(...args),
  parseApiV3Event: (...args: unknown[]) => mockParseApiV3Event(...args),
}));

// Now import after mock is set up — we need to test the module's internal logic
// Since the module exports only initCalendarFetch, we test via the fetch calls
import { initCalendarFetch, _resetFetchState } from '../desktop/src/inject/calendar-fetch';

// ── Helpers ──────────────────────────────────────────────────────────

function mockFetchResponses(responses: Record<string, unknown>) {
  global.fetch = vi.fn(async (url: string | RequestInfo | URL) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    for (const [pattern, body] of Object.entries(responses)) {
      if (urlStr.includes(pattern)) {
        return {
          ok: true,
          json: async () => body,
        } as Response;
      }
    }
    return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
  });
}

function makeEvent(id: string, title: string, startHour: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, 0);
  const end = new Date(start.getTime() + 3_600_000);
  return {
    id,
    summary: title,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('calendar-fetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllTimers();
    mockMergeEvents.mockClear();
    mockParseApiV3Event.mockClear();
    _resetFetchState();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('fetches calendar list then events and calls mergeEvents', async () => {
    const event1 = makeEvent('ev1', 'Meeting', 14);
    const event2 = makeEvent('ev2', 'Standup', 10);

    mockFetchResponses({
      'calendarList': {
        items: [
          { id: 'primary', selected: true },
          { id: 'work@group.calendar.google.com', selected: true },
        ],
      },
      'calendars/primary/events': { items: [event1] },
      'calendars/work%40group.calendar.google.com/events': { items: [event2] },
    });

    mockParseApiV3Event.mockImplementation((item: Record<string, unknown>) => ({
      id: item.id as string,
      title: item.summary as string,
      start: new Date(),
      end: new Date(),
      allDay: false,
      calendarId: undefined,
    }));

    initCalendarFetch();

    // Advance past initial delay (5s)
    await vi.advanceTimersByTimeAsync(5_100);

    expect(global.fetch).toHaveBeenCalled();
    expect(mockParseApiV3Event).toHaveBeenCalledTimes(2);
    expect(mockMergeEvents).toHaveBeenCalledTimes(1);
    expect(mockMergeEvents).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ev1', calendarId: 'primary' }),
        expect.objectContaining({ id: 'ev2', calendarId: 'work@group.calendar.google.com' }),
      ]),
    );
  });

  it('skips unselected calendars', async () => {
    mockFetchResponses({
      'calendarList': {
        items: [
          { id: 'primary', selected: true },
          { id: 'hidden', selected: false },
        ],
      },
      'calendars/primary/events': { items: [] },
    });

    initCalendarFetch();
    await vi.advanceTimersByTimeAsync(5_100);

    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const eventUrls = fetchCalls
      .map((c: unknown[]) => String(c[0]))
      .filter((u: string) => u.includes('/events'));

    // Should only fetch events for 'primary', not 'hidden'
    expect(eventUrls).toHaveLength(1);
    expect(eventUrls[0]).toContain('calendars/primary');
  });

  it('handles API failure gracefully without throwing', async () => {
    global.fetch = vi.fn(async () => {
      return { ok: false, status: 401, json: async () => ({}) } as unknown as Response;
    });

    initCalendarFetch();

    // Should not throw
    await expect(vi.advanceTimersByTimeAsync(5_100)).resolves.not.toThrow();
    expect(mockMergeEvents).not.toHaveBeenCalled();
  });

  it('handles network error gracefully', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('Network error');
    });

    initCalendarFetch();
    await expect(vi.advanceTimersByTimeAsync(5_100)).resolves.not.toThrow();
    expect(mockMergeEvents).not.toHaveBeenCalled();
  });

  it('does not call mergeEvents when no events found', async () => {
    mockFetchResponses({
      'calendarList': { items: [{ id: 'primary', selected: true }] },
      'calendars/primary/events': { items: [] },
    });

    initCalendarFetch();
    await vi.advanceTimersByTimeAsync(5_100);

    expect(mockMergeEvents).not.toHaveBeenCalled();
  });

  it('polls again after interval', async () => {
    mockFetchResponses({
      'calendarList': { items: [{ id: 'primary', selected: true }] },
      'calendars/primary/events': { items: [] },
    });

    initCalendarFetch();

    // First poll after 5s delay
    await vi.advanceTimersByTimeAsync(5_100);
    const firstCallCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    // Second poll after 60s interval
    await vi.advanceTimersByTimeAsync(60_100);
    const secondCallCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(secondCallCount).toBeGreaterThan(firstCallCount);
  });

  it('backs off on consecutive failures', async () => {
    global.fetch = vi.fn(async () => {
      return { ok: false, status: 401, json: async () => ({}) } as unknown as Response;
    });

    initCalendarFetch();

    // First poll after 5s — fails, consecutiveFailures = 1
    await vi.advanceTimersByTimeAsync(5_100);
    const firstCallCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(firstCallCount).toBeGreaterThan(0);

    // Normal 60s interval should NOT trigger next poll (backoff = 120s)
    await vi.advanceTimersByTimeAsync(60_000);
    const afterNormalInterval = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(afterNormalInterval).toBe(firstCallCount);

    // After full backoff (120s total from first poll) the second poll fires
    await vi.advanceTimersByTimeAsync(61_000);
    const afterBackoff = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(afterBackoff).toBeGreaterThan(firstCallCount);
  });

  it('skips mergeEvents when events are unchanged', async () => {
    const event1 = makeEvent('ev1', 'Meeting', 14);
    const parsedEvent = {
      id: 'ev1',
      title: 'Meeting',
      start: new Date(2026, 0, 1, 14, 0),
      end: new Date(2026, 0, 1, 15, 0),
      allDay: false,
      calendarId: undefined,
    };

    mockFetchResponses({
      'calendarList': { items: [{ id: 'primary', selected: true }] },
      'calendars/primary/events': { items: [event1] },
    });

    mockParseApiV3Event.mockReturnValue(parsedEvent);

    initCalendarFetch();

    // First poll — should call mergeEvents
    await vi.advanceTimersByTimeAsync(5_100);
    expect(mockMergeEvents).toHaveBeenCalledTimes(1);

    // Second poll — same events, should skip mergeEvents
    await vi.advanceTimersByTimeAsync(60_100);
    expect(mockMergeEvents).toHaveBeenCalledTimes(1);
  });
});
