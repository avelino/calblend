/**
 * CalBlend Desktop — Tray event updater.
 *
 * Primary: reads structured event data from the API interceptor.
 * Fallback: scans Google Calendar DOM when API data is unavailable.
 *
 * Sends upcoming events to the Rust backend for the system tray menu.
 */

import { getTodayUpcoming, hasData, onUpdate } from './calendar-data';

declare const __TAURI__: {
  core: {
    invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  };
};

interface TrayEvent {
  title: string;
  time: string;
  minutes_until: number;
  event_id: string;
}

const SCAN_INTERVAL_MS = 60_000;

// ── Shared helpers ───────────────────────────────────────────────────

function isUserEditing(): boolean {
  return document.querySelector(
    '[role="dialog"], [role="alertdialog"], [data-eventid][contenteditable]',
  ) !== null;
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function sendToTray(events: TrayEvent[]): void {
  try {
    __TAURI__.core.invoke('update_upcoming_events', { events }).catch(() => {});
  } catch {
    // __TAURI__ not available
  }
}

// ── DOM helpers ──────────────────────────────────────────────────────

export function parseTimeToMinutes(timeStr: string): number | null {
  const cleaned = timeStr.trim().toLowerCase();

  const match12 = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match12) {
    let hours = parseInt(match12[1]!, 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    if (match12[3] === 'pm' && hours !== 12) hours += 12;
    if (match12[3] === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1]!, 10) * 60 + parseInt(match24[2]!, 10);
  }

  const matchPtBr = cleaned.match(/^(\d{1,2})h(\d{2})$/);
  if (matchPtBr) {
    return parseInt(matchPtBr[1]!, 10) * 60 + parseInt(matchPtBr[2]!, 10);
  }

  return null;
}

export function extractEventInfo(el: HTMLElement): { title: string; startMinutes: number } | null {
  const ariaLabel = el.getAttribute('aria-label') ?? '';

  let startMinutes: number | null = null;

  const ariaTimeMatch = ariaLabel.match(
    /(\d{1,2}(?:[:h]\d{2})?\s*(?:AM|PM|am|pm)?)\s*(?:[–\-]|às\b)/,
  );
  if (ariaTimeMatch) {
    startMinutes = parseTimeToMinutes(ariaTimeMatch[1]!);
  }

  if (startMinutes === null) {
    const textEls = el.querySelectorAll<HTMLElement>('[aria-hidden="true"]');
    for (const textEl of textEls) {
      const text = textEl.textContent?.trim() ?? '';
      if (!/\d/.test(text)) continue;
      const timeMatch = text.match(/(\d{1,2}(?:[:h]\d{2})?\s*(?:AM|PM|am|pm)?)/);
      if (timeMatch) {
        startMinutes = parseTimeToMinutes(timeMatch[1]!);
        if (startMinutes !== null) break;
      }
    }
  }

  if (startMinutes === null) return null;

  let title = '';
  if (ariaLabel) {
    const cleaned = ariaLabel.replace(
      /,?\s*(?:das?\s+)?\d{1,2}(?:[:h]\d{2})?\s*(?:AM|PM|am|pm)?\s*(?:[–\-]|às)\s*\d{1,2}(?:[:h]\d{2})?\s*(?:AM|PM|am|pm)?.*/i,
      '',
    );
    title = cleaned
      .replace(/,\s*[A-Za-z\u00C0-\u024F]+\s+\d{1,2}\s*$/, '')
      .replace(/,\s*\d{1,2}\s+de\s+[A-Za-z\u00C0-\u024F]+\s*$/, '')
      .replace(/,\s*$/, '')
      .trim();
  }

  if (!title) {
    const textEls = el.querySelectorAll<HTMLElement>('[aria-hidden="true"]');
    for (const textEl of textEls) {
      const text = textEl.textContent?.trim() ?? '';
      if (/^\d{1,2}([:h]\d{2})?\s*(AM|PM|am|pm|–|-)/i.test(text)) continue;
      if (/^\d{1,2}[:h]\d{2}$/.test(text)) continue;
      if (!text || text.length < 2) continue;
      title = text;
      break;
    }
  }

  if (!title) return null;
  if (/^busy([^a-z]|$)/i.test(title)) return null;

  return { title, startMinutes };
}

function findTodayColumnBounds(): { left: number; right: number } | null {
  const now = new Date();
  const todayKey = ((now.getFullYear() - 1970) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const dayCells = document.querySelectorAll<HTMLElement>('div[data-datekey]:not([jsaction])');
  let todayCell: HTMLElement | null = null;

  for (const cell of dayCells) {
    if (cell.getAttribute('data-datekey') === String(todayKey)) {
      todayCell = cell;
      break;
    }
  }

  if (!todayCell) return null;

  const todayRect = todayCell.getBoundingClientRect();
  const todayCenterX = todayRect.left + todayRect.width / 2;

  const headers = document.querySelectorAll<HTMLElement>('[role="columnheader"]');
  for (const header of headers) {
    const rect = header.getBoundingClientRect();
    if (todayCenterX >= rect.left && todayCenterX <= rect.right) {
      return { left: rect.left, right: rect.right };
    }
  }

  return { left: todayRect.left, right: todayRect.right };
}

function isInTodayColumn(el: HTMLElement, bounds: { left: number; right: number } | null): boolean {
  if (!bounds) return true;
  const elRect = el.getBoundingClientRect();
  const elCenterX = elRect.left + elRect.width / 2;
  return elCenterX >= bounds.left && elCenterX <= bounds.right;
}

// ── Orchestration ────────────────────────────────────────────────────

function mergeApiAndDom(): TrayEvent[] {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Start with API events (primary source)
  const apiEvents = hasData() ? getTodayUpcoming() : [];
  const seen = new Map<string, TrayEvent>();

  for (const e of apiEvents) {
    const startMin = e.start.getHours() * 60 + e.start.getMinutes();
    const until = startMin - nowMinutes;
    if (until >= -30 && until <= 720) {
      seen.set(e.id, {
        title: e.title,
        time: formatTime(startMin),
        minutes_until: until,
        event_id: e.id,
      });
    }
  }

  // Supplement with DOM events to catch anything the API interceptor missed
  const todayBounds = findTodayColumnBounds();
  const eventEls = document.querySelectorAll<HTMLElement>(
    '[data-eventid][role="button"], [data-eventid] > [role="button"]',
  );

  for (const el of eventEls) {
    const eventId =
      el.getAttribute('data-eventid') ??
      el.parentElement?.getAttribute('data-eventid') ??
      '';
    if (!eventId || seen.has(eventId)) continue;
    if (!isInTodayColumn(el, todayBounds)) continue;

    const info = extractEventInfo(el);
    if (!info) continue;

    const minutesUntil = info.startMinutes - nowMinutes;
    if (minutesUntil < -30 || minutesUntil > 720) continue;

    seen.set(eventId, {
      title: info.title,
      time: formatTime(info.startMinutes),
      minutes_until: minutesUntil,
      event_id: eventId,
    });
  }

  const events = Array.from(seen.values());
  events.sort((a, b) => {
    const aMin = parseTimeToMinutes(a.time) ?? 0;
    const bMin = parseTimeToMinutes(b.time) ?? 0;
    return aMin - bMin;
  });

  return events;
}

function scanAndUpdate(): void {
  if (isUserEditing()) return;

  const events = mergeApiAndDom();
  sendToTray(events);
  console.log(`[CalBlend] Tray update (merged): ${events.length} events`);
}

export function initTrayEvents(): void {
  // React to API data as it arrives (instant tray refresh)
  onUpdate(() => {
    if (!isUserEditing()) {
      const events = mergeApiAndDom();
      sendToTray(events);
      console.log(`[CalBlend] Tray update (API trigger, merged): ${events.length} events`);
    }
  });

  // Periodic scan — API primary, DOM fallback
  setTimeout(scanAndUpdate, 8000);
  setInterval(scanAndUpdate, SCAN_INTERVAL_MS);

  console.log('[CalBlend] Tray events active (API + DOM fallback)');
}
