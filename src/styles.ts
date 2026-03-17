import type { ExtensionSettings } from './types';

const STYLE_ID = 'calblend-styles';

// ─── ROUNDED EVENTS ─────────────────────────────────────────────
// Rounds events, buttons, dialogs, inputs — everything feels softer
const ROUNDED_EVENTS = `
[data-eventid] > div,
[data-eventchip] {
  border-radius: 8px !important;
}
[data-eventid][data-eventid] > div::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
  pointer-events: none;
}
[role="dialog"],
[role="menu"],
[role="listbox"],
[role="alertdialog"] {
  border-radius: 16px !important;
  overflow: hidden !important;
  backdrop-filter: blur(20px) saturate(1.8) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.8) !important;
}
[role="toolbar"] [role="button"],
[role="navigation"] [role="button"],
header [role="button"] {
  border-radius: 20px !important;
}
input[type="text"],
input[type="search"] {
  border-radius: 10px !important;
}
select {
  border-radius: 8px !important;
}
`;

// ─── EVENT SHADOW ────────────────────────────────────────────────
// Layered depth with glassmorphism for a premium card feel
const EVENT_SHADOW = `
[data-eventid][role="button"],
[data-eventid] > [role="button"],
[data-eventchip] {
  box-shadow:
    0 1px 3px rgba(0,0,0,0.08),
    0 4px 6px rgba(0,0,0,0.04),
    0 8px 24px rgba(0,0,0,0.03) !important;
  backdrop-filter: blur(8px) saturate(1.4) !important;
  -webkit-backdrop-filter: blur(8px) saturate(1.4) !important;
}
[role="dialog"],
[role="alertdialog"] {
  box-shadow:
    0 8px 32px rgba(0,0,0,0.12),
    0 24px 48px rgba(0,0,0,0.06),
    0 0 0 1px rgba(0,0,0,0.04) !important;
  backdrop-filter: blur(24px) saturate(1.8) !important;
  -webkit-backdrop-filter: blur(24px) saturate(1.8) !important;
}
@media (prefers-color-scheme: dark) {
  [data-eventid][role="button"],
  [data-eventid] > [role="button"],
  [data-eventchip] {
    box-shadow:
      0 1px 3px rgba(0,0,0,0.3),
      0 4px 6px rgba(0,0,0,0.2),
      0 8px 24px rgba(0,0,0,0.15) !important;
  }
  [role="dialog"],
  [role="alertdialog"] {
    box-shadow:
      0 8px 32px rgba(0,0,0,0.4),
      0 24px 48px rgba(0,0,0,0.25),
      0 0 0 1px rgba(255,255,255,0.06) !important;
  }
}
`;

// ─── SMOOTH ANIMATIONS ──────────────────────────────────────────
// Rich transitions and micro-interactions on all interactive elements
const SMOOTH_ANIMATIONS = `
[data-eventid][role="button"],
[data-eventid] > [role="button"],
[data-eventchip] {
  transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.25s ease, opacity 0.2s ease, filter 0.2s ease !important;
}
[data-eventid][role="button"]:hover,
[data-eventid] > [role="button"]:hover,
[data-eventchip]:hover {
  transform: translateY(-2px) scale(1.01) !important;
  box-shadow:
    0 4px 12px rgba(0,0,0,0.1),
    0 12px 28px rgba(0,0,0,0.06),
    0 0 0 1px rgba(99, 102, 241, 0.08) !important;
  filter: brightness(1.05) !important;
}
[data-eventid][role="button"]:active,
[data-eventid] > [role="button"]:active,
[data-eventchip]:active {
  transform: translateY(0) scale(0.995) !important;
  transition-duration: 0.08s !important;
}
[role="button"] {
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.15s cubic-bezier(0.2, 0, 0, 1) !important;
}
[role="button"]:active {
  transform: scale(0.96) !important;
  transition-duration: 0.08s !important;
}
[role="dialog"],
[role="alertdialog"] {
  transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.2, 0, 0, 1) !important;
  animation: calblend-dialog-in 0.3s cubic-bezier(0.2, 0, 0, 1) !important;
}
@keyframes calblend-dialog-in {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
`;

// ─── SOFT GRID ───────────────────────────────────────────────────
// Near-invisible grid lines with today highlight and hover glow
const SOFT_GRID = `
[role="main"] [role="gridcell"],
[role="main"] [role="grid"],
[role="main"] [role="row"],
[role="main"] [role="columnheader"],
[role="main"] [role="rowheader"] {
  border-color: rgba(0,0,0,0.03) !important;
}
[role="main"] td,
[role="main"] th {
  border-color: rgba(0,0,0,0.03) !important;
}
[role="main"] [role="gridcell"] {
  transition: background-color 0.2s ease !important;
}
[role="main"] [role="gridcell"]:hover {
  background-color: rgba(99, 102, 241, 0.03) !important;
}
[role="main"] [role="presentation"] {
  border-color: rgba(0,0,0,0.03) !important;
}
/* Today column highlight */
[role="main"] [data-datekey][aria-selected="true"],
[role="main"] [role="columnheader"][aria-selected="true"] {
  background-color: rgba(99, 102, 241, 0.04) !important;
}
/* Today date number */
[role="main"] [data-datekey] [aria-label*="today" i],
[role="main"] [data-datekey] a[class*="current"] {
  background: linear-gradient(135deg, #6366f1, #818cf8) !important;
  color: white !important;
  border-radius: 50% !important;
  width: 28px !important;
  height: 28px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-weight: 600 !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3) !important;
}
@media (prefers-color-scheme: dark) {
  [role="main"] [role="gridcell"],
  [role="main"] [role="grid"],
  [role="main"] [role="row"],
  [role="main"] [role="columnheader"],
  [role="main"] [role="rowheader"],
  [role="main"] td,
  [role="main"] th,
  [role="main"] [role="presentation"] {
    border-color: rgba(255,255,255,0.04) !important;
  }
  [role="main"] [role="gridcell"]:hover {
    background-color: rgba(99, 102, 241, 0.05) !important;
  }
  [role="main"] [data-datekey][aria-selected="true"],
  [role="main"] [role="columnheader"][aria-selected="true"] {
    background-color: rgba(99, 102, 241, 0.06) !important;
  }
}
`;

// ─── MODERN UI ───────────────────────────────────────────────────
// Frosted glass header, thin scrollbars, polished chrome
const MODERN_UI = `
* {
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
}
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.08);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0,0,0,0.18);
}
::-webkit-scrollbar-track {
  background: transparent;
}
/* Frosted glass header */
header, [role="banner"] {
  background: rgba(255,255,255,0.72) !important;
  backdrop-filter: blur(16px) saturate(1.8) !important;
  -webkit-backdrop-filter: blur(16px) saturate(1.8) !important;
  border-bottom: 1px solid rgba(0,0,0,0.04) !important;
}
[role="toolbar"] [role="button"]:hover,
[role="navigation"] [role="button"]:hover,
header [role="button"]:hover {
  background-color: rgba(99, 102, 241, 0.08) !important;
  border-radius: 8px !important;
}
[role="toolbar"] {
  border-bottom-color: rgba(0,0,0,0.03) !important;
}
/* Pill-shaped view switcher buttons */
[role="tablist"] [role="tab"] {
  border-radius: 20px !important;
  transition: background-color 0.2s ease, color 0.2s ease !important;
}
[role="tablist"] [role="tab"][aria-selected="true"] {
  background: linear-gradient(135deg, #6366f1, #818cf8) !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25) !important;
}
/* Polished inputs */
input[type="text"],
input[type="search"] {
  border: 1px solid rgba(0,0,0,0.06) !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
}
input[type="text"]:focus,
input[type="search"]:focus {
  border-color: rgba(99, 102, 241, 0.4) !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
  outline: none !important;
}
/* Side panel glass */
[role="complementary"] {
  background: rgba(255,255,255,0.6) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}
@media (prefers-color-scheme: dark) {
  ::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.08);
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.18);
  }
  header, [role="banner"] {
    background: rgba(18,18,18,0.72) !important;
  }
  [role="toolbar"] [role="button"]:hover,
  [role="navigation"] [role="button"]:hover,
  header [role="button"]:hover {
    background-color: rgba(99, 102, 241, 0.15) !important;
  }
  [role="toolbar"] {
    border-bottom-color: rgba(255,255,255,0.04) !important;
  }
  [role="complementary"] {
    background: rgba(18,18,18,0.6) !important;
  }
}
`;

// ─── DIM MINI CALENDAR ───────────────────────────────────────────
const DIM_MINI_CALENDAR = `
div[data-month], div[data-ical] {
  opacity: 0.4;
  transition: opacity 0.2s ease;
}
div[data-month]:hover, div[data-ical]:hover {
  opacity: 1;
}
`;

// ─── IMPROVED TYPOGRAPHY ─────────────────────────────────────────
// Premium typography with better font rendering and hierarchy
const IMPROVED_TYPOGRAPHY = `
[data-eventid] [aria-hidden="true"] {
  font-weight: 500 !important;
  letter-spacing: -0.01em !important;
  line-height: 1.35 !important;
  text-rendering: optimizeLegibility !important;
}
[role="main"] [role="columnheader"] {
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  font-size: 10px !important;
  color: rgba(0,0,0,0.4) !important;
}
[role="main"] [role="rowheader"] {
  font-weight: 500 !important;
  font-size: 10px !important;
  color: rgba(0,0,0,0.28) !important;
  letter-spacing: 0.02em !important;
  font-variant-numeric: tabular-nums !important;
}
[role="main"] [data-datekey] {
  font-weight: 500 !important;
  letter-spacing: -0.01em !important;
}
header, [role="banner"] {
  letter-spacing: -0.02em !important;
  font-weight: 500 !important;
}
/* Monospace time hints in events */
[data-eventid] span[aria-hidden="true"]:first-child {
  font-variant-numeric: tabular-nums !important;
}
@media (prefers-color-scheme: dark) {
  [role="main"] [role="columnheader"] {
    color: rgba(255,255,255,0.4) !important;
  }
  [role="main"] [role="rowheader"] {
    color: rgba(255,255,255,0.25) !important;
  }
}
`;

// ─── REFINED COLORS ──────────────────────────────────────────────
// Pastel-toned events, warm background, subtle gradient body
const REFINED_COLORS = `
[data-eventid][role="button"],
[data-eventid] > [role="button"],
[data-eventchip] {
  filter: saturate(0.7) brightness(1.08) contrast(0.95) !important;
}
body {
  background: linear-gradient(180deg, #f8f9fc 0%, #f0f1f6 100%) !important;
  background-attachment: fixed !important;
}
/* Subtle noise texture overlay */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  opacity: 0.015;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}
@media (prefers-color-scheme: dark) {
  [data-eventid][role="button"],
  [data-eventid] > [role="button"],
  [data-eventchip] {
    filter: saturate(0.8) brightness(0.92) contrast(1.05) !important;
  }
  body {
    background: linear-gradient(180deg, #111113 0%, #0c0c0e 100%) !important;
  }
  body::before {
    opacity: 0.03;
  }
}
`;

// ─── CLEAN SIDEBAR ───────────────────────────────────────────────
const CLEAN_SIDEBAR = `
.calblend-sidebar-collapsed {
  max-width: 0 !important;
  min-width: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
  padding: 0 !important;
  transition: max-width 0.3s ease, opacity 0.2s ease, padding 0.3s ease !important;
}
.calblend-sidebar-parent {
  position: relative;
}
.calblend-sidebar-parent:hover .calblend-sidebar-collapsed,
.calblend-sidebar-collapsed:hover {
  max-width: 256px !important;
  min-width: 256px !important;
  opacity: 1 !important;
  padding: revert !important;
  overflow: visible !important;
}
`;

// ─── CLEAN HEADER ────────────────────────────────────────────────
const CLEAN_HEADER = `
.calblend-header-hidden {
  display: none !important;
}
`;

// ─── REFINED TIMELINE ────────────────────────────────────────────
const REFINED_TIMELINE = `
.calblend-timeline {
  height: 2px !important;
  background: linear-gradient(90deg, rgb(99, 102, 241), rgba(99, 102, 241, 0.05)) !important;
  border-radius: 1px !important;
  position: relative;
}
.calblend-timeline-dot {
  position: absolute;
  left: -5px;
  top: -4px;
  width: 10px;
  height: 10px;
  background: rgb(99, 102, 241);
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.5), 0 0 4px rgba(99, 102, 241, 0.8);
  animation: calblend-pulse 2s ease-in-out infinite;
}
@keyframes calblend-pulse {
  0%, 100% { box-shadow: 0 0 12px rgba(99, 102, 241, 0.5), 0 0 4px rgba(99, 102, 241, 0.8); transform: scale(1); }
  50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.7), 0 0 6px rgba(99, 102, 241, 1); transform: scale(1.2); }
}
`;

// ─── FOCUS MODE ──────────────────────────────────────────────────
const FOCUS_MODE = `
.calblend-secondary-event {
  opacity: 0.25 !important;
  filter: grayscale(0.4) !important;
  transition: opacity 0.25s ease, filter 0.25s ease !important;
}
.calblend-secondary-event:hover {
  opacity: 1 !important;
  filter: grayscale(0) !important;
}
`;

// ─── HIGHLIGHT NEXT EVENT ────────────────────────────────────────
const HIGHLIGHT_NEXT_EVENT = `
.calblend-next-event {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.15), 0 0 40px rgba(99, 102, 241, 0.05) !important;
  z-index: 10 !important;
  position: relative;
  animation: calblend-glow 3s ease-in-out infinite !important;
}
@keyframes calblend-glow {
  0%, 100% { box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.15), 0 0 40px rgba(99, 102, 241, 0.05); }
  50% { box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.6), 0 0 28px rgba(99, 102, 241, 0.22), 0 0 50px rgba(99, 102, 241, 0.08); }
}
`;

// ─── CONFLICT INDICATOR ──────────────────────────────────────────
const CONFLICT_INDICATOR = `
.calblend-conflict {
  position: relative;
}
.calblend-conflict-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  pointer-events: none;
  line-height: 1;
}
`;

type CssFeature = keyof Pick<
  ExtensionSettings,
  | 'roundedEvents'
  | 'eventShadow'
  | 'smoothAnimations'
  | 'softGrid'
  | 'modernUI'
  | 'dimMiniCalendar'
  | 'improvedTypography'
  | 'refinedColors'
  | 'cleanSidebar'
  | 'cleanHeader'
  | 'refinedTimeLine'
  | 'focusMode'
  | 'highlightNextEvent'
  | 'conflictIndicator'
>;

const CSS_MAP: Record<CssFeature, string> = {
  roundedEvents: ROUNDED_EVENTS,
  eventShadow: EVENT_SHADOW,
  smoothAnimations: SMOOTH_ANIMATIONS,
  softGrid: SOFT_GRID,
  modernUI: MODERN_UI,
  dimMiniCalendar: DIM_MINI_CALENDAR,
  improvedTypography: IMPROVED_TYPOGRAPHY,
  refinedColors: REFINED_COLORS,
  cleanSidebar: CLEAN_SIDEBAR,
  cleanHeader: CLEAN_HEADER,
  refinedTimeLine: REFINED_TIMELINE,
  focusMode: FOCUS_MODE,
  highlightNextEvent: HIGHLIGHT_NEXT_EVENT,
  conflictIndicator: CONFLICT_INDICATOR,
};

export function buildStylesheet(settings: ExtensionSettings): string {
  if (!settings.enabled) return '';
  const rules: string[] = [];
  for (const [feature, css] of Object.entries(CSS_MAP)) {
    if (settings[feature as CssFeature]) {
      rules.push(css);
    }
  }
  return rules.join('\n');
}

export function injectStyles(settings: ExtensionSettings): void {
  let el = document.getElementById(STYLE_ID);
  const css = buildStylesheet(settings);

  if (!css) {
    el?.remove();
    return;
  }

  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export function removeStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
}
