import type { CalendarEvent, EventGroup } from './types';

/**
 * Groups events by title key, then regroups busy events by position.
 * This two-step strategy handles:
 * 1. Same-name events from different calendars → grouped by titleKey
 * 2. "Busy" events that share position with named events → regrouped by positionKey
 */
export function groupEvents(events: CalendarEvent[]): EventGroup[] {
  const titleGroups = new Map<string, CalendarEvent[]>();
  const positionGroups = new Map<string, CalendarEvent[]>();

  // Step 1: Group by title key
  for (const event of events) {
    const group = titleGroups.get(event.titleKey) ?? [];
    group.push(event);
    titleGroups.set(event.titleKey, group);

    // Track position groups for busy merging
    if (event.positionKey) {
      const posGroup = positionGroups.get(event.positionKey) ?? [];
      posGroup.push(event);
      positionGroups.set(event.positionKey, posGroup);
    }
  }

  // Step 2: Regroup busy events by position
  for (const [posKey, posEvents] of positionGroups) {
    const hasBusy = posEvents.some((e) => e.isBusy);
    if (!hasBusy || posEvents.length < 2) continue;

    // Remove these events from their title-based groups
    for (const event of posEvents) {
      const group = titleGroups.get(event.titleKey);
      if (!group) continue;
      const idx = group.indexOf(event);
      if (idx !== -1) group.splice(idx, 1);
      if (group.length === 0) titleGroups.delete(event.titleKey);
    }

    // Add as position-based group
    titleGroups.set(`_busy_${posKey}`, posEvents);
  }

  // Convert to EventGroup array, only groups with 1+ events
  const result: EventGroup[] = [];
  for (const [key, groupEvents] of titleGroups) {
    if (groupEvents.length > 0) {
      result.push({ key, events: groupEvents });
    }
  }

  return result;
}
