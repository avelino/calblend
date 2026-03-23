import { describe, it, expect } from 'vitest';
import {
  parseTimeToMinutes,
  formatTime,
  extractEventInfo,
} from '../desktop/src/inject/tray-events';

// ── parseTimeToMinutes ─────────────────────────────────────────────────

describe('parseTimeToMinutes', () => {
  it('parses 12h time with am', () => {
    expect(parseTimeToMinutes('9am')).toBe(540);
    expect(parseTimeToMinutes('9:30am')).toBe(570);
    expect(parseTimeToMinutes('11:00am')).toBe(660);
  });

  it('parses 12h time with pm', () => {
    expect(parseTimeToMinutes('1pm')).toBe(780);
    expect(parseTimeToMinutes('2:30pm')).toBe(870);
    expect(parseTimeToMinutes('11:45pm')).toBe(1425);
  });

  it('handles 12am (midnight) and 12pm (noon)', () => {
    expect(parseTimeToMinutes('12am')).toBe(0);
    expect(parseTimeToMinutes('12pm')).toBe(720);
    expect(parseTimeToMinutes('12:30pm')).toBe(750);
  });

  it('parses 24h time', () => {
    expect(parseTimeToMinutes('0:00')).toBe(0);
    expect(parseTimeToMinutes('9:30')).toBe(570);
    expect(parseTimeToMinutes('14:00')).toBe(840);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('handles uppercase AM/PM', () => {
    expect(parseTimeToMinutes('10AM')).toBe(600);
    expect(parseTimeToMinutes('3:15PM')).toBe(915);
  });

  it('handles whitespace', () => {
    expect(parseTimeToMinutes(' 10am ')).toBe(600);
    expect(parseTimeToMinutes('  2:30 pm  ')).toBe(870);
  });

  it('returns null for invalid input', () => {
    expect(parseTimeToMinutes('')).toBeNull();
    expect(parseTimeToMinutes('abc')).toBeNull();
    expect(parseTimeToMinutes('hello world')).toBeNull();
  });

  it('parses out-of-range hours as-is (no validation)', () => {
    // The parser matches the regex but doesn't validate ranges.
    // This is acceptable — Google Calendar won't produce "25:00".
    expect(parseTimeToMinutes('25:00')).toBe(1500);
  });
});

// ── formatTime ─────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats minutes to HH:MM', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(570)).toBe('09:30');
    expect(formatTime(840)).toBe('14:00');
    expect(formatTime(1439)).toBe('23:59');
  });

  it('pads single digits', () => {
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(65)).toBe('01:05');
  });
});

// ── extractEventInfo ───────────────────────────────────────────────────

function createEventEl(opts: {
  ariaLabel?: string;
  textParts?: string[];
  eventId?: string;
}): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('role', 'button');
  if (opts.eventId) el.setAttribute('data-eventid', opts.eventId);
  if (opts.ariaLabel) el.setAttribute('aria-label', opts.ariaLabel);

  if (opts.textParts) {
    for (const text of opts.textParts) {
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = text;
      el.appendChild(span);
    }
  }

  return el;
}

describe('extractEventInfo', () => {
  it('extracts title and time from aria-label with time range', () => {
    const el = createEventEl({
      ariaLabel: 'Retro + Planning, 10:30am – 12pm',
    });
    const info = extractEventInfo(el);
    expect(info).not.toBeNull();
    expect(info!.title).toBe('Retro + Planning');
    expect(info!.startMinutes).toBe(630); // 10:30
  });

  it('extracts title when aria-label has date and time', () => {
    const el = createEventEl({
      ariaLabel: 'Team Standup, March 23, 9:00am – 9:30am',
    });
    const info = extractEventInfo(el);
    expect(info).not.toBeNull();
    expect(info!.title).toBe('Team Standup');
    expect(info!.startMinutes).toBe(540); // 9:00
  });

  it('returns null for aria-label with only time and no text fallback', () => {
    const el = createEventEl({
      ariaLabel: '5:30pm – 6:30pm',
    });
    // No title extractable — should return null
    expect(extractEventInfo(el)).toBeNull();
  });

  it('falls back to aria-hidden text for title', () => {
    const el = createEventEl({
      ariaLabel: '5:30pm – 6:30pm',
      textParts: ['Meeting Room A'],
    });
    const info = extractEventInfo(el);
    expect(info).not.toBeNull();
    expect(info!.title).toBe('Meeting Room A');
    expect(info!.startMinutes).toBe(1050); // 17:30
  });

  it('extracts time from aria-hidden text when no aria-label time', () => {
    const el = createEventEl({
      ariaLabel: '',
      textParts: ['2:30pm', 'Weekly Sync'],
    });
    const info = extractEventInfo(el);
    expect(info).not.toBeNull();
    expect(info!.title).toBe('Weekly Sync');
    expect(info!.startMinutes).toBe(870); // 14:30
  });

  it('returns null when no time found', () => {
    const el = createEventEl({
      ariaLabel: 'All Day Event',
      textParts: ['All Day Event'],
    });
    expect(extractEventInfo(el)).toBeNull();
  });

  it('returns null for busy events', () => {
    const el = createEventEl({
      ariaLabel: 'busy, 10am – 11am',
      textParts: ['busy'],
    });
    expect(extractEventInfo(el)).toBeNull();
  });

  it('does not concatenate time into title', () => {
    // This was a bug: "Retro + Planning10:30am – ..."
    const el = createEventEl({
      ariaLabel: 'Semanal de Revenue, 11am – 12pm',
    });
    const info = extractEventInfo(el);
    expect(info).not.toBeNull();
    expect(info!.title).toBe('Semanal de Revenue');
    expect(info!.title).not.toMatch(/\d/);
  });

  it('handles Portuguese date format in aria-label', () => {
    const el = createEventEl({
      ariaLabel: 'Daily Standup, 23 de março, 11:30am – 12pm',
    });
    const info = extractEventInfo(el);
    expect(info).not.toBeNull();
    expect(info!.title).toBe('Daily Standup');
    expect(info!.startMinutes).toBe(690); // 11:30
  });

  it('handles PM times correctly', () => {
    const el = createEventEl({
      ariaLabel: 'Lunch, 12pm – 1:30pm',
    });
    const info = extractEventInfo(el);
    expect(info).not.toBeNull();
    expect(info!.startMinutes).toBe(720); // 12:00
  });

  it('handles title with special characters', () => {
    const el = createEventEl({
      ariaLabel: 'tech/staff: semanal, 4:15pm – 5pm',
    });
    const info = extractEventInfo(el);
    expect(info).not.toBeNull();
    expect(info!.title).toBe('tech/staff: semanal');
  });
});
