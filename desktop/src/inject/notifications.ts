/**
 * CalBlend Desktop — Native notification system.
 *
 * Intercepts the Web Notification API (window.Notification) so that Google
 * Calendar's own reminder system drives native OS notifications via Tauri.
 *
 * Google Calendar already handles all the timing logic based on per-event
 * reminder settings (5 min, 10 min, 30 min, etc.) configured when creating
 * the event. We simply capture the `new Notification(title, opts)` call
 * and redirect it to the OS notification center.
 */

declare const __TAURI__: {
  core: {
    invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  };
};

function notify(title: string, body: string): void {
  try {
    __TAURI__.core.invoke('show_event_notification', {
      title,
      body,
      eventId: null,
    });
  } catch (e) {
    console.warn('[CalBlend] Failed to send notification:', e);
  }
}

/**
 * Replace the Web Notification API with a shim that forwards to Tauri
 * native notifications. WKWebView (macOS) and WebView2 (Windows) don't
 * support web notifications natively, so this bridge is required.
 */
function interceptNotifications(): void {
  (window as any).Notification = class CalBlendNotification {
    static permission = 'granted' as NotificationPermission;

    static requestPermission(
      cb?: (permission: NotificationPermission) => void,
    ): Promise<NotificationPermission> {
      cb?.('granted');
      return Promise.resolve('granted');
    }

    constructor(title: string, options?: NotificationOptions) {
      // Skip busy events — they're placeholders from shared calendars
      if (/^busy([^a-z]|$)/i.test(title)) return;
      notify(title, options?.body ?? '');
    }

    close(): void {}
    addEventListener(): void {}
    removeEventListener(): void {}
  };

  Object.defineProperty((window as any).Notification, 'permission', {
    get: () => 'granted',
    configurable: true,
  });
}

export function initNotifications(): void {
  interceptNotifications();
  console.log('[CalBlend] Native notifications active');
}
