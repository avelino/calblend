import { queryColumnHeaders, queryDayCells } from './selectors';

/**
 * Decode Google Calendar's packed datekey integer into a Date.
 * Format: year (bits 9+), month (bits 5-8), day (bits 0-4)
 */
function decodeDateKey(datekey: number): Date {
  const year = datekey >> 9;
  const month = (datekey & 511) >> 5;
  const day = datekey & 31;
  return new Date(1970 + year, month - 1, day);
}

/**
 * Parse a data-date attribute (YYYYMMDD format) into a Date.
 */
function parseDataDate(dateStr: string): Date {
  const year = parseInt(dateStr.slice(0, 4), 10);
  const month = parseInt(dateStr.slice(4, 6), 10);
  const day = parseInt(dateStr.slice(6, 8), 10);
  return new Date(year, month - 1, day);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Color weekends in the main calendar grid.
 * Uses column index (position) instead of first character to detect weekends,
 * which fixes the bug in pt-BR and other locales where Saturday and another day
 * start with the same letter.
 */
export function colorWeekends(container: HTMLElement, color: string): void {
  // Color column headers by checking their position in the grid
  const headers = queryColumnHeaders(container, 'main');
  // Determine which columns are weekends from the day cells
  const weekendColumns = new Set<number>();

  const dayCells = queryDayCells(container, 'main');
  for (const cell of dayCells) {
    const datekey = parseInt(cell.getAttribute('data-datekey') ?? '', 10);
    if (!datekey) continue;

    const date = decodeDateKey(datekey);
    if (isWeekend(date)) {
      cell.style.backgroundColor = color;

      // Find which column index this cell belongs to
      const parent = cell.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const colIndex = siblings.indexOf(cell);
        weekendColumns.add(colIndex);
      }
    }
  }

  // Color headers based on detected weekend columns
  headers.forEach((header, index) => {
    if (weekendColumns.has(index)) {
      header.style.backgroundColor = color;
    }
  });
}

/**
 * Color weekends in the mini calendar (month picker).
 */
export function colorMiniCalendar(container: HTMLElement, color: string): void {
  // Color headers - use position-based detection from date cells
  const headers = queryColumnHeaders(container, 'mini');
  const weekendColumns = new Set<number>();

  const dateCells = queryDayCells(container, 'mini');
  for (const cell of dateCells) {
    const dateStr = cell.getAttribute('data-date');
    if (!dateStr) continue;

    const date = parseDataDate(dateStr);
    if (isWeekend(date)) {
      cell.style.backgroundColor = color;
      const firstChild = cell.children[0] as HTMLElement | undefined;
      if (firstChild) {
        firstChild.style.backgroundColor = color;
      }

      // Find column index
      const parent = cell.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const colIndex = siblings.indexOf(cell);
        weekendColumns.add(colIndex);
      }
    }
  }

  headers.forEach((header, index) => {
    if (weekendColumns.has(index)) {
      header.style.backgroundColor = color;
    }
  });
}
