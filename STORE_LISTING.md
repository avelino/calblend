# Chrome Web Store - Privacy Practices

Use these texts when filling out the Privacy Practices tab in the Chrome Web Store developer dashboard.

---

## Single Purpose Description

```
This extension enhances Google Calendar's visual display by merging overlapping events from multiple calendars into a single event with a gradient background, making it easier to see schedule conflicts at a glance.
```

---

## Host Permission Justification

**Permission:** `https://www.google.com/calendar/*` and `https://calendar.google.com/*`

```
Host permissions are required to inject content scripts into Google Calendar pages. The extension modifies the visual appearance of calendar events by applying gradient backgrounds to overlapping events and optionally highlighting weekends. These permissions are limited exclusively to Google Calendar domains and are necessary for the core functionality of the extension. No data is collected, transmitted, or shared - all processing occurs locally in the browser.
```

---

## Storage Permission Justification

**Permission:** `storage`

```
The storage permission is used to save user preferences locally, including: extension enabled/disabled state, gradient opacity settings, weekend highlighting preference, theme selection (light/dark/system), and custom color choices. All data is stored locally using Chrome's sync storage API to persist settings across browser sessions and sync across the user's devices. No data is transmitted to external servers.
```

---

## Remote Code Justification

```
This extension does not use any remote code. All JavaScript is bundled within the extension package and no external scripts are loaded or executed. The extension operates entirely offline after installation.
```

---

## Data Usage Certification

When asked about data collection, select:

- **"I do not collect or use any user data"** (if this option is available)

Or if you must describe data handling:

```
This extension does not collect, transmit, or share any user data. All functionality operates locally within the browser. User preferences are stored using Chrome's built-in storage API and remain on the user's device or synced through their Google account (via Chrome sync). The extension does not communicate with any external servers.
```

---

# Firefox Add-ons Store

## Summary (for AMO listing)

```
Merges overlapping Google Calendar events from multiple calendars into a single visual block with gradient backgrounds. Helps you quickly identify schedule conflicts. Includes optional weekend highlighting and customizable themes.
```

## Privacy Policy (if required)

```
CalBlend for Google Calendar does not collect, store, or transmit any personal data. All user preferences (theme, colors, opacity settings) are stored locally in your browser using the WebExtension storage API. The extension only accesses Google Calendar web pages to modify their visual appearance and does not read, collect, or share any calendar data.
```
