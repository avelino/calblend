export interface ExtensionSettings {
  enabled: boolean;
  gradientOpacity: number;
  weekendsEnabled: boolean;
  theme: 'system' | 'light' | 'dark';
  lightThemeColor: string;
  darkThemeColor: string;
  // Visual features
  roundedEvents: boolean;
  eventShadow: boolean;
  smoothAnimations: boolean;
  improvedTypography: boolean;
  refinedColors: boolean;
  // Layout features
  softGrid: boolean;
  modernUI: boolean;
  cleanSidebar: boolean;
  cleanHeader: boolean;
  dimMiniCalendar: boolean;
  refinedTimeLine: boolean;
  // Smart features
  focusMode: boolean;
  highlightNextEvent: boolean;
  conflictIndicator: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  gradientOpacity: 0.75,
  weekendsEnabled: true,
  theme: 'system',
  lightThemeColor: '#f1f6ff',
  darkThemeColor: '#1a1a1a',
  roundedEvents: true,
  eventShadow: true,
  smoothAnimations: true,
  improvedTypography: true,
  refinedColors: true,
  softGrid: true,
  modernUI: true,
  cleanSidebar: true,
  cleanHeader: true,
  dimMiniCalendar: true,
  refinedTimeLine: true,
  focusMode: true,
  highlightNextEvent: true,
  conflictIndicator: true,
};

export interface CalendarEvent {
  element: HTMLElement;
  title: string;
  titleKey: string;
  positionKey: string | null;
  isBusy: boolean;
  color: string;
  position: { left: number; right: number };
}

export interface EventGroup {
  key: string;
  events: CalendarEvent[];
}
