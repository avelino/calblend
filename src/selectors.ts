const MAIN_CALENDAR_SELECTORS = [
  "[role='main']",
];

const MINI_CALENDAR_SELECTORS = [
  'div[data-month]',
  'div[data-ical]',
];

const EVENT_SELECTORS = [
  '[data-eventid][role="button"]',
  '[data-eventid] [role="button"]',
];

const GRID_CELL_SELECTOR = '[role="gridcell"]';

const TITLE_SELECTOR = '[aria-hidden="true"]';

const COLUMN_HEADER_SELECTORS = {
  main: "div[role='columnheader']",
  mini: "span[role='columnheader']",
};

const DAY_CELL_SELECTORS = {
  main: 'div[data-datekey]:not([jsaction])',
  mini: 'span[data-date]',
};

export function matchesMainCalendar(node: Node): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  return MAIN_CALENDAR_SELECTORS.some((s) => node.matches(s));
}

export function matchesMiniCalendar(node: Node): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  return MINI_CALENDAR_SELECTORS.some((s) => node.matches(s));
}

export function queryEvents(container: HTMLElement): HTMLElement[] {
  const selector = EVENT_SELECTORS.join(', ');
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

export function queryGridCells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(GRID_CELL_SELECTOR));
}

export function queryTitleElements(event: HTMLElement): HTMLElement[] {
  return Array.from(event.querySelectorAll<HTMLElement>(TITLE_SELECTOR));
}

export function queryColumnHeaders(
  container: HTMLElement,
  type: 'main' | 'mini',
): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(COLUMN_HEADER_SELECTORS[type]),
  );
}

export function queryDayCells(
  container: HTMLElement,
  type: 'main' | 'mini',
): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(DAY_CELL_SELECTORS[type]),
  );
}
