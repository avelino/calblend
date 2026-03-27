/**
 * CalBlend — Active Google Calendar API v3 fetcher.
 *
 * Actively polls the official Calendar API to fetch today's events,
 * supplementing the passive interceptor. Uses session cookies
 * inherited from the Tauri webview (credentials: 'include').
 *
 * If the public API is blocked (CORS/auth), falls back to the
 * internal Google Calendar endpoint that the web app itself uses.
 */

import { mergeEvents, parseApiV3Event } from './calendar-data';
import type { CalendarEventData } from './calendar-data';

const API_BASE = 'https://www.googleapis.com/calendar/v3';
const POLL_INTERVAL_MS = 60_000;
const INITIAL_DELAY_MS = 5_000;

// ── Helpers ──────────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[CalBlend] API fetch ${res.status}: ${url.slice(0, 80)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[CalBlend] API fetch error: ${err}`);
    return null;
  }
}

function getTodayRange(): { timeMin: string; timeMax: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86_400_000);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

// ── Calendar list ────────────────────────────────────────────────────

interface CalendarListResponse {
  items?: Array<{ id: string; selected?: boolean }>;
}

async function fetchCalendarIds(): Promise<string[]> {
  const data = await apiFetch<CalendarListResponse>(
    `${API_BASE}/users/me/calendarList`,
  );
  if (!data?.items) return [];
  return data.items
    .filter((c) => c.selected !== false)
    .map((c) => c.id);
}

// ── Events ───────────────────────────────────────────────────────────

interface EventsResponse {
  items?: Array<Record<string, unknown>>;
}

async function fetchEventsForCalendar(
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<CalendarEventData[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const url = `${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  const data = await apiFetch<EventsResponse>(url);
  if (!data?.items) return [];

  const events: CalendarEventData[] = [];
  for (const item of data.items) {
    const ev = parseApiV3Event(item);
    if (ev) {
      ev.calendarId = calendarId;
      events.push(ev);
    }
  }
  return events;
}

// ── Main fetch loop ──────────────────────────────────────────────────

async function fetchAllEvents(): Promise<void> {
  try {
    const calendarIds = await fetchCalendarIds();
    if (calendarIds.length === 0) {
      console.warn('[CalBlend] Active fetch: no calendars found');
      return;
    }

    const { timeMin, timeMax } = getTodayRange();
    const allEvents: CalendarEventData[] = [];

    for (const id of calendarIds) {
      const events = await fetchEventsForCalendar(id, timeMin, timeMax);
      allEvents.push(...events);
    }

    if (allEvents.length > 0) {
      mergeEvents(allEvents);
    }

    console.log(
      `[CalBlend] Active fetch: ${allEvents.length} events from ${calendarIds.length} calendars`,
    );
  } catch (err) {
    console.warn(`[CalBlend] Active fetch error: ${err}`);
  }
}

// ── Init ─────────────────────────────────────────────────────────────

export function initCalendarFetch(): void {
  setTimeout(() => {
    fetchAllEvents();
    setInterval(fetchAllEvents, POLL_INTERVAL_MS);
  }, INITIAL_DELAY_MS);

  console.log('[CalBlend] Active calendar fetcher scheduled');
}
