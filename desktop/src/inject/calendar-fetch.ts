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
const MAX_BACKOFF_MS = 15 * 60_000; // 15 minutes

// ── Backoff state ────────────────────────────────────────────────────

let consecutiveFailures = 0;
let lastEventHash = '';

export function _resetFetchState(): void {
  consecutiveFailures = 0;
  lastEventHash = '';
}

function getBackoffDelay(): number {
  if (consecutiveFailures === 0) return POLL_INTERVAL_MS;
  const delay = POLL_INTERVAL_MS * Math.pow(2, consecutiveFailures);
  return Math.min(delay, MAX_BACKOFF_MS);
}

function hashEvents(events: CalendarEventData[]): string {
  return events
    .map((e) => `${e.id}|${e.title}|${e.start.getTime()}|${e.end.getTime()}`)
    .sort()
    .join('\n');
}

// ── Helpers ──────────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[CalBlend] API fetch ${res.status}: ${url.slice(0, 80)}`);
      consecutiveFailures++;
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[CalBlend] API fetch error: ${err}`);
    consecutiveFailures++;
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

    // Reset backoff on successful fetch
    consecutiveFailures = 0;

    // Skip tray update if events haven't changed
    const newHash = hashEvents(allEvents);
    if (newHash === lastEventHash) {
      console.log('[CalBlend] Active fetch: no changes detected, skipping update');
      return;
    }
    lastEventHash = newHash;

    if (allEvents.length > 0) {
      mergeEvents(allEvents);
    }

    console.log(
      `[CalBlend] Active fetch: ${allEvents.length} events from ${calendarIds.length} calendars`,
    );
  } catch (err) {
    consecutiveFailures++;
    console.warn(`[CalBlend] Active fetch error: ${err}`);
  }
}

// ── Init ─────────────────────────────────────────────────────────────

async function pollLoop(): Promise<void> {
  await fetchAllEvents();
  const delay = getBackoffDelay();
  if (consecutiveFailures > 0) {
    console.log(`[CalBlend] Backoff: next fetch in ${Math.round(delay / 1000)}s (${consecutiveFailures} failures)`);
  }
  setTimeout(pollLoop, delay);
}

export function initCalendarFetch(): void {
  setTimeout(pollLoop, INITIAL_DELAY_MS);
  console.log('[CalBlend] Active calendar fetcher scheduled');
}
