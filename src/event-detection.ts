import type { CalendarEvent } from './types';
import { queryEvents, queryGridCells, queryTitleElements } from './selectors';

const BUSY_PATTERN = /^busy([^a-z]|$)/i;

export function findEvents(container: HTMLElement): CalendarEvent[] {
  const results: CalendarEvent[] = [];
  const gridCells = queryGridCells(container);

  gridCells.forEach((cell, dayIndex) => {
    const events = queryEvents(cell);
    const cellRect = cell.getBoundingClientRect();

    for (const element of events) {
      const titleEls = queryTitleElements(element);
      if (titleEls.length === 0) continue;

      const title = titleEls.map((el) => el.textContent ?? '').join('');
      const normalizedTitle = title.replace(/\s+/g, '');
      const titleKey = `${dayIndex}_${normalizedTitle}_${element.style.height}`;

      const isBusy = titleEls.some((el) =>
        BUSY_PATTERN.test((el.textContent ?? '').trim()),
      );

      const color =
        element.style.backgroundColor ||
        element.style.borderColor ||
        element.parentElement?.style.borderColor ||
        '';

      const parentRect = element.parentElement?.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const position = parentRect
        ? {
            left: Math.max(elementRect.left - parentRect.left, 0),
            right: parentRect.right - elementRect.right,
          }
        : { left: 0, right: 0 };

      // Position key for busy-event merging (timed events only)
      const relTop = Math.round(elementRect.top - cellRect.top);
      const relHeight = Math.round(elementRect.height);
      const positionKey =
        relHeight > 0 ? `${dayIndex}_${relTop}_${relHeight}` : null;

      results.push({
        element,
        title,
        titleKey,
        positionKey,
        isBusy,
        color,
        position,
      });
    }
  });

  return results;
}
