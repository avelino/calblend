/**
 * CalBlend Desktop — Tray event scanner.
 *
 * Reads upcoming events from the Google Calendar DOM and sends them to the
 * Rust backend to display in the system tray menu.
 *
 * IMPORTANT: This module is strictly read-only. It never modifies the DOM,
 * never triggers navigation, and pauses when the user is editing an event
 * (dialog open) to avoid any interference.
 */

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

const SCAN_INTERVAL_MS = 60_000; // 1 minute — no need to be aggressive

/**
 * Returns true when the user is actively editing/creating an event.
 * We skip scanning to avoid any chance of interfering.
 */
function isUserEditing(): boolean {
  return document.querySelector(
    '[role="dialog"], [role="alertdialog"], [data-eventid][contenteditable]',
  ) !== null;
}

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

  return null;
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function extractEventInfo(el: HTMLElement): { title: string; startMinutes: number } | null {
  const ariaLabel = el.getAttribute('aria-label') ?? '';

  let startMinutes: number | null = null;

  // Match time range: "10:30am – 12pm", "5:30 – 6:30am", "10am – 12pm"
  const ariaTimeMatch = ariaLabel.match(
    /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))\s*[–\-]/,
  );
  if (ariaTimeMatch) {
    startMinutes = parseTimeToMinutes(ariaTimeMatch[1]!);
  }

  if (startMinutes === null) {
    const textEls = el.querySelectorAll<HTMLElement>('[aria-hidden="true"]');
    for (const textEl of textEls) {
      const text = textEl.textContent?.trim() ?? '';
      if (!/\d/.test(text)) continue;
      const timeMatch = text.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/);
      if (timeMatch) {
        startMinutes = parseTimeToMinutes(timeMatch[1]!);
        if (startMinutes !== null) break;
      }
    }
  }

  if (startMinutes === null) return null;

  // Extract title from aria-label by removing the time range portion.
  // aria-label formats:
  //   "Retro + Planning, 10:30am – 12pm"
  //   "Title, March 23, 5:30 – 6:30am"
  //   "5:30 – 6:30am"  (no title)
  let title = '';
  if (ariaLabel) {
    // Remove the time range and everything after it
    const cleaned = ariaLabel.replace(
      /,?\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*[–\-]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm).*/i,
      '',
    );
    // Remove trailing date parts ("March 23", "23 de março", etc.)
    title = cleaned
      .replace(/,\s*[A-Za-z\u00C0-\u024F]+\s+\d{1,2}\s*$/, '')
      .replace(/,\s*\d{1,2}\s+de\s+[A-Za-z\u00C0-\u024F]+\s*$/, '')
      .replace(/,\s*$/, '')
      .trim();
  }

  // Fallback: first aria-hidden element that doesn't look like a time
  if (!title) {
    const textEls = el.querySelectorAll<HTMLElement>('[aria-hidden="true"]');
    for (const textEl of textEls) {
      const text = textEl.textContent?.trim() ?? '';
      if (/^\d{1,2}(:\d{2})?\s*(AM|PM|am|pm|–|-)/i.test(text)) continue;
      if (/^\d{1,2}:\d{2}$/.test(text)) continue;
      if (!text || text.length < 2) continue;
      title = text;
      break;
    }
  }

  if (!title) return null;
  if (/^busy([^a-z]|$)/i.test(title)) return null;

  return { title, startMinutes };
}

/**
 * Find today's column index (0-based) in the calendar grid.
 * Returns -1 if today is not visible.
 */
function findTodayColumnIndex(): number {
  const now = new Date();
  const todayKey = ((now.getFullYear() - 1970) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const dayCells = document.querySelectorAll<HTMLElement>('div[data-datekey]:not([jsaction])');
  for (let i = 0; i < dayCells.length; i++) {
    if (dayCells[i]!.getAttribute('data-datekey') === String(todayKey)) return i;
  }
  return -1;
}

/**
 * Check if an event element belongs to today's column by comparing its
 * horizontal position with the column headers.
 */
function isInTodayColumn(el: HTMLElement, todayIndex: number): boolean {
  if (todayIndex < 0) return true; // today not visible, allow all

  const headers = document.querySelectorAll<HTMLElement>('[role="columnheader"]');
  if (todayIndex >= headers.length) return true;

  const todayHeader = headers[todayIndex]!;
  const headerRect = todayHeader.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();

  // Event center X should be within the header column bounds
  const elCenterX = elRect.left + elRect.width / 2;
  return elCenterX >= headerRect.left && elCenterX <= headerRect.right;
}

function scanAndUpdate(): void {
  // Never scan while user is editing an event
  if (isUserEditing()) return;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayIndex = findTodayColumnIndex();

  const eventEls = document.querySelectorAll<HTMLElement>(
    '[data-eventid][role="button"], [data-eventid] > [role="button"]',
  );

  const seen = new Set<string>();
  const events: TrayEvent[] = [];

  for (const el of eventEls) {
    const eventId =
      el.getAttribute('data-eventid') ??
      el.parentElement?.getAttribute('data-eventid') ??
      '';
    if (!eventId || seen.has(eventId)) continue;
    seen.add(eventId);

    // Skip events not in today's column
    if (!isInTodayColumn(el, todayIndex)) continue;

    const info = extractEventInfo(el);
    if (!info) continue;

    const minutesUntil = info.startMinutes - nowMinutes;
    if (minutesUntil < -30 || minutesUntil > 720) continue;

    events.push({
      title: info.title,
      time: formatTime(info.startMinutes),
      minutes_until: minutesUntil,
      event_id: eventId,
    });
  }

  events.sort((a, b) => {
    const aMin = parseTimeToMinutes(a.time) ?? 0;
    const bMin = parseTimeToMinutes(b.time) ?? 0;
    return aMin - bMin;
  });

  try {
    __TAURI__.core.invoke('update_upcoming_events', { events });
  } catch {
    // Silently ignore — tray update is best-effort
  }
}

export function initTrayEvents(): void {
  // Initial scan after calendar renders
  setTimeout(scanAndUpdate, 8000);

  // Periodic scan — 1 min interval, skips if dialog is open
  setInterval(scanAndUpdate, SCAN_INTERVAL_MS);

  console.log('[CalBlend] Tray events scanner active');
}
