export interface ExtensionSettings {
  enabled: boolean;
  gradientOpacity: number;
  weekendsEnabled: boolean;
  theme: 'system' | 'light' | 'dark';
  lightThemeColor: string;
  darkThemeColor: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  gradientOpacity: 0.75,
  weekendsEnabled: true,
  theme: 'system',
  lightThemeColor: '#f1f6ff',
  darkThemeColor: '#1a1a1a',
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
