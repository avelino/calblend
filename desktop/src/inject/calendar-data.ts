/**
 * CalBlend — Google Calendar API data interceptor.
 *
 * Intercepts fetch/XHR responses from Google Calendar's internal APIs to
 * extract structured event data. This replaces fragile DOM scraping with
 * API-level data for features that only need event metadata (tray, notifications).
 *
 * Features that modify the DOM (merging, weekend coloring, etc.) still need
 * DOM access — this module only provides READ data.
 *
 * Falls back gracefully: if interception yields nothing, consumers should
 * use DOM scanning as a fallback.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface CalendarEventData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color?: string;
  location?: string;
  calendarId?: string;
}

type EventListener = (events: CalendarEventData[]) => void;

// ── Store ────────────────────────────────────────────────────────────

const eventMap = new Map<string, CalendarEventData>();
const listeners = new Set<EventListener>();
let lastUpdateTs = 0;

function notifyListeners(): void {
  const all = Array.from(eventMap.values());
  for (const fn of listeners) {
    try { fn(all); } catch {}
  }
}

export function mergeEvents(incoming: CalendarEventData[]): void {
  for (const ev of incoming) {
    eventMap.set(ev.id, ev);
  }
  lastUpdateTs = Date.now();
  notifyListeners();
}

export function getAllEvents(): CalendarEventData[] {
  return Array.from(eventMap.values());
}

export function getTodayUpcoming(): CalendarEventData[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);
  const graceMs = 30 * 60_000; // show events that started up to 30min ago

  return getAllEvents()
    .filter((e) => {
      if (e.allDay) return false;
      // Event starts today
      if (e.start < todayStart || e.start >= todayEnd) return false;
      // Not too far in the past
      return e.start.getTime() >= now.getTime() - graceMs;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function getEventById(id: string): CalendarEventData | undefined {
  return eventMap.get(id);
}

/** Returns true when we have recent data (< 5 min old). */
export function hasData(): boolean {
  return eventMap.size > 0 && Date.now() - lastUpdateTs < 300_000;
}

export function onUpdate(fn: EventListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ── URL matching ─────────────────────────────────────────────────────

const CALENDAR_URL_PATTERNS = [
  /calendar\.google\.com\/calendar\/u\/\d+\//,
  /clients\d*\.google\.com.*calendar/i,
  /googleapis\.com\/calendar/i,
];

export function isCalendarUrl(url: string): boolean {
  return CALENDAR_URL_PATTERNS.some((p) => p.test(url));
}

// ── Parsing: date extraction ─────────────────────────────────────────

/** Try to interpret a value as a Date. Handles multiple Google formats. */
export function tryParseDate(val: unknown): Date | null {
  // Array: [year, month, day] or [year, month, day, hour, min, sec]
  if (Array.isArray(val) && val.length >= 3 && val.length <= 7) {
    const nums = val.every((v) => typeof v === 'number');
    if (nums) {
      const n = val as number[];
      const year = n[0]!;
      const month = n[1]!;
      const day = n[2]!;
      const hour = n[3] ?? 0;
      const min = n[4] ?? 0;
      const sec = n[5] ?? 0;
      if (year > 2000 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day, hour, min, sec);
      }
    }
  }

  // Epoch milliseconds (2020-01-01 … 2040-01-01)
  if (typeof val === 'number' && val > 1_577_836_800_000 && val < 2_208_988_800_000) {
    return new Date(val);
  }

  // ISO 8601 string
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

// ── Parsing: Calendar API v3 ─────────────────────────────────────────

export function parseApiV3Event(item: Record<string, unknown>): CalendarEventData | null {
  if (!item.id) return null;

  const title = (item.summary ?? item.title ?? '') as string;
  if (!title) return null;

  const startObj = item.start as Record<string, unknown> | undefined;
  const endObj = item.end as Record<string, unknown> | undefined;

  let start: Date | null = null;
  let end: Date | null = null;
  let allDay = false;

  if (startObj?.dateTime) {
    start = new Date(startObj.dateTime as string);
    end = endObj?.dateTime ? new Date(endObj.dateTime as string) : start;
  } else if (startObj?.date) {
    start = new Date(startObj.date as string);
    end = endObj?.date ? new Date(endObj.date as string) : start;
    allDay = true;
  }

  if (!start || isNaN(start.getTime())) return null;
  if (!end || isNaN(end.getTime())) end = start;

  return {
    id: String(item.id),
    title,
    start,
    end,
    allDay,
    color: item.colorId ? String(item.colorId) : undefined,
    location: item.location ? String(item.location) : undefined,
  };
}

// ── Parsing: Google internal array format ────────────────────────────

/**
 * Google's internal format uses nested arrays where event-like tuples
 * contain: [id, title, ..., dateArray, dateArray, ...].
 */
export function tryExtractEventFromArray(arr: unknown[]): CalendarEventData | null {
  if (arr.length < 5) return null;

  const id = typeof arr[0] === 'string' ? arr[0] : null;
  const title = typeof arr[1] === 'string' ? arr[1] : null;

  if (!id || !title || title.length < 2 || title.length > 300) return null;
  // Skip entries that look like enum values or IDs, not titles
  if (/^(null|undefined|true|false|\d+)$/i.test(title)) return null;

  let start: Date | null = null;
  let end: Date | null = null;

  for (let i = 2; i < Math.min(arr.length, 25); i++) {
    const d = tryParseDate(arr[i]);
    if (d) {
      if (!start) start = d;
      else if (!end) { end = d; break; }
    }
  }

  if (!start) return null;
  if (!end) end = new Date(start.getTime() + 3_600_000);

  const allDay =
    start.getHours() === 0 && start.getMinutes() === 0 &&
    end.getHours() === 0 && end.getMinutes() === 0 &&
    end.getTime() - start.getTime() >= 86_400_000;

  return { id, title, start, end, allDay };
}

// ── Parsing: walk arbitrary structures ───────────────────────────────

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/** Recursively walk data looking for event-like structures. */
export function extractEventsFromStructure(data: unknown): CalendarEventData[] {
  const results: CalendarEventData[] = [];

  // Calendar API v3: { items: [...] }
  if (isPlainObject(data) && Array.isArray(data.items)) {
    for (const item of data.items) {
      if (isPlainObject(item)) {
        const ev = parseApiV3Event(item);
        if (ev) results.push(ev);
      }
    }
    if (results.length > 0) return results;
  }

  // Walk nested arrays looking for event tuples
  const seen = new Set<string>();
  walkArrays(data, (arr) => {
    const ev = tryExtractEventFromArray(arr);
    if (ev && !seen.has(ev.id)) {
      seen.add(ev.id);
      results.push(ev);
    }
  }, 0);

  return results;
}

function walkArrays(data: unknown, cb: (arr: unknown[]) => void, depth: number): void {
  if (depth > 8) return;
  if (Array.isArray(data)) {
    cb(data);
    for (const item of data) {
      walkArrays(item, cb, depth + 1);
    }
  } else if (isPlainObject(data)) {
    for (const val of Object.values(data)) {
      walkArrays(val, cb, depth + 1);
    }
  }
}

// ── Parsing: batchexecute format ─────────────────────────────────────

/**
 * Google's batchexecute response format:
 *   )]}'
 *   <length>\n[[["wrb.fr","service","<json-string>",...],...]]
 *   <length>\n[[...]]
 */
export function parseBatchResponse(text: string): CalendarEventData[] {
  const results: CalendarEventData[] = [];
  // Strip XSSI prefix only (preserve newlines for block splitting)
  const cleaned = text.replace(/^\)\]\}'/, '');

  // Split into blocks separated by number-on-its-own-line (or at start)
  const blocks = cleaned.split(/(?:^|\n)\d+\n/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed.startsWith('[')) continue;

    try {
      const outer = JSON.parse(trimmed) as unknown[];
      if (!Array.isArray(outer)) continue;

      // batchexecute wraps responses in [[["wrb.fr","svc","payload",...],...]]
      // so we need to iterate through two levels of arrays
      for (const batch of outer) {
        const items = Array.isArray(batch) ? batch : [batch];
        for (const item of items) {
          if (!Array.isArray(item) || item.length < 3) continue;

          const payload = item[2];
          if (typeof payload === 'string' && payload.startsWith('[')) {
            try {
              const inner = JSON.parse(payload);
              const events = extractEventsFromStructure(inner);
              results.push(...events);
            } catch {}
          }
        }
      }
    } catch {}
  }

  return results;
}

// ── Main parse entry point ───────────────────────────────────────────

export function tryParseResponse(text: string, url: string): CalendarEventData[] {
  const stripped = text.replace(/^\)\]\}'\s*\n?/, '');

  // Strategy 1: plain JSON (Calendar API v3 or similar)
  try {
    const json = JSON.parse(stripped);
    const events = extractEventsFromStructure(json);
    if (events.length > 0) {
      console.log(`[CalBlend] API: ${events.length} events from ${abbreviateUrl(url)}`);
      mergeEvents(events);
      return events;
    }
  } catch {}

  // Strategy 2: batchexecute format
  const batchEvents = parseBatchResponse(text);
  if (batchEvents.length > 0) {
    console.log(`[CalBlend] API (batch): ${batchEvents.length} events from ${abbreviateUrl(url)}`);
    mergeEvents(batchEvents);
    return batchEvents;
  }

  return [];
}

function abbreviateUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.slice(0, 60);
  } catch {
    return url.slice(0, 60);
  }
}

// ── Interception setup ───────────────────────────────────────────────

function interceptFetch(): void {
  const origFetch = window.fetch;
  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const response = await origFetch.call(this, input, init);

    try {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input?.url ?? '';
      if (isCalendarUrl(url)) {
        const cloned = response.clone();
        cloned.text().then((text) => tryParseResponse(text, url)).catch(() => {});
      }
    } catch {}

    return response;
  };
}

function interceptXhr(): void {
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ): void {
    (this as XMLHttpRequest & { _cbUrl: string })._cbUrl =
      typeof url === 'string' ? url : url.href;
    return (origOpen as Function).apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args: unknown[]): void {
    const url = (this as XMLHttpRequest & { _cbUrl: string })._cbUrl ?? '';
    if (isCalendarUrl(url)) {
      this.addEventListener('load', function () {
        try {
          tryParseResponse(this.responseText, url);
        } catch {}
      });
    }
    return (origSend as Function).apply(this, args);
  };
}

// ── Init ─────────────────────────────────────────────────────────────

export function initCalendarData(): void {
  interceptFetch();
  interceptXhr();
  console.log('[CalBlend] Calendar data interceptor active');
}
