import { describe, it, expect } from 'vitest';
import { colorWeekends, colorMiniCalendar } from '../src/weekend';

// jsdom normalizes hex colors to rgb(), so we compare against that
const WEEKEND_COLOR_RGB = 'rgb(241, 246, 255)';

function createMainCalendarDOM(dates: { datekey: number; isHeader?: boolean }[]): HTMLElement {
  const container = document.createElement('div');

  // Create column headers
  const headerRow = document.createElement('div');
  for (const date of dates) {
    if (date.isHeader) {
      const header = document.createElement('div');
      header.setAttribute('role', 'columnheader');
      header.appendChild(document.createElement('span'));
      headerRow.appendChild(header);
    }
  }
  container.appendChild(headerRow);

  // Create day cells with datekey
  const cellRow = document.createElement('div');
  for (const date of dates) {
    if (!date.isHeader) {
      const cell = document.createElement('div');
      cell.setAttribute('data-datekey', String(date.datekey));
      cellRow.appendChild(cell);
    }
  }
  container.appendChild(cellRow);

  return container;
}

function createMiniCalendarDOM(dates: string[]): HTMLElement {
  const container = document.createElement('div');

  // Header row
  const headerRow = document.createElement('div');
  for (let i = 0; i < 7; i++) {
    const header = document.createElement('span');
    header.setAttribute('role', 'columnheader');
    header.appendChild(document.createElement('span'));
    headerRow.appendChild(header);
  }
  container.appendChild(headerRow);

  // Date cells
  const cellRow = document.createElement('div');
  for (const dateStr of dates) {
    const cell = document.createElement('span');
    cell.setAttribute('data-date', dateStr);
    cell.appendChild(document.createElement('span'));
    cellRow.appendChild(cell);
  }
  container.appendChild(cellRow);

  return container;
}

/**
 * Encode a date into Google Calendar's packed datekey format.
 * year = (year - 1970), stored in bits 9+
 * month = 1-based, stored in bits 5-8
 * day = stored in bits 0-4
 */
function encodeDateKey(year: number, month: number, day: number): number {
  return ((year - 1970) << 9) | (month << 5) | day;
}

describe('colorWeekends (main calendar)', () => {
  it('colors Saturday cells', () => {
    // 2024-03-16 is a Saturday
    const satKey = encodeDateKey(2024, 3, 16);
    const container = createMainCalendarDOM([
      { datekey: satKey },
    ]);

    colorWeekends(container, '#f1f6ff');

    const cell = container.querySelector('[data-datekey]') as HTMLElement;
    expect(cell.style.backgroundColor).toBe(WEEKEND_COLOR_RGB);
  });

  it('colors Sunday cells', () => {
    // 2024-03-17 is a Sunday
    const sunKey = encodeDateKey(2024, 3, 17);
    const container = createMainCalendarDOM([
      { datekey: sunKey },
    ]);

    colorWeekends(container, '#f1f6ff');

    const cell = container.querySelector('[data-datekey]') as HTMLElement;
    expect(cell.style.backgroundColor).toBe(WEEKEND_COLOR_RGB);
  });

  it('does not color weekday cells', () => {
    // 2024-03-18 is a Monday
    const monKey = encodeDateKey(2024, 3, 18);
    const container = createMainCalendarDOM([
      { datekey: monKey },
    ]);

    colorWeekends(container, '#f1f6ff');

    const cell = container.querySelector('[data-datekey]') as HTMLElement;
    expect(cell.style.backgroundColor).toBe('');
  });
});

describe('colorMiniCalendar', () => {
  it('colors weekend date cells', () => {
    // 20240316 = Saturday, 20240317 = Sunday, 20240318 = Monday
    const container = createMiniCalendarDOM(['20240316', '20240317', '20240318']);

    colorMiniCalendar(container, '#f1f6ff');

    const cells = container.querySelectorAll<HTMLElement>('span[data-date]');
    expect(cells[0]!.style.backgroundColor).toBe(WEEKEND_COLOR_RGB); // Saturday
    expect(cells[1]!.style.backgroundColor).toBe(WEEKEND_COLOR_RGB); // Sunday
    expect(cells[2]!.style.backgroundColor).toBe('');         // Monday
  });
});
