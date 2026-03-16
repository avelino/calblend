// ==UserScript==
// @name        Gradient Event Merge for Google Calendar™ (by @imightbeAmy and @karjna and @limonkufu)
// @namespace   gradient-gcal-multical-event-merge
// @include     https://www.google.com/calendar/*
// @include     http://www.google.com/calendar/*
// @include     https://calendar.google.com/*
// @include     http://calendar.google.com/*
// @version     1
// @grant       none
// ==/UserScript==

'use strict';

// Constants section
const CONSTANTS = {
  WEEKEND: {
    LIGHT: {
      DEFAULT_COLOR: '#f1f6ff'
    },
    DARK: {
      DEFAULT_COLOR: '#1a1a1a'
    },
    DAY1: new Date(2021, 6, 3).toLocaleString('default', { weekday: 'long' })[0],
    DAY2: new Date(2021, 6, 4).toLocaleString('default', { weekday: 'long' })[0]
  },
  SELECTORS: {
    MAIN_CALENDAR: "[role='main'], [role='dialog']",
    MINI_CALENDAR: "div[data-month], div[data-ical]"
  },
  STYLES: {
    DEFAULT_GRADIENT_OPACITY: 0.75, // Default value if user hasn't set one
  }
};

// Add configuration management
const config = {
  settings: {
    gradientOpacity: CONSTANTS.STYLES.DEFAULT_GRADIENT_OPACITY,
    weekendsEnabled: true,
    theme: 'system',
    lightThemeColor: CONSTANTS.WEEKEND.LIGHT.DEFAULT_COLOR,
    darkThemeColor: CONSTANTS.WEEKEND.DARK.DEFAULT_COLOR
  },

  loadSettings: () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([
        'gradientOpacity', 
        'weekendsEnabled', 
        'theme',
        'lightThemeColor',
        'darkThemeColor'
      ], (result) => {
        config.settings.gradientOpacity = result.gradientOpacity || CONSTANTS.STYLES.DEFAULT_GRADIENT_OPACITY;
        config.settings.weekendsEnabled = result.weekendsEnabled !== false;
        config.settings.theme = result.theme || 'system';
        config.settings.lightThemeColor = result.lightThemeColor || CONSTANTS.WEEKEND.LIGHT.DEFAULT_COLOR;
        config.settings.darkThemeColor = result.darkThemeColor || CONSTANTS.WEEKEND.DARK.DEFAULT_COLOR;
        resolve();
      });
    });
  },

  getWeekendColor: () => {
    const isDarkMode = config.settings.theme === 'dark' || 
      (config.settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return isDarkMode ? config.settings.darkThemeColor : config.settings.lightThemeColor;
  }
};

// Utility functions
const utils = {
  stripesGradient: (colors, width, angle) => {
    const colorStrings = colors.map(color => 
      color.toString().replace(')', `, ${config.settings.gradientOpacity})`).replace('rgb', 'rgba')
    );
    return `linear-gradient(${angle}deg,${colorStrings.join(',')})`;
  },

  dragType: (e) => parseInt(e.dataset.dragsourceType),

  calculatePosition: (event, parentPosition) => ({
    left: Math.max(event.getBoundingClientRect().left - parentPosition.left, 0),
    right: parentPosition.right - event.getBoundingClientRect().right,
  })
};

// Event handling functions
const eventHandlers = {
  mergeEventElements: (events) => {
    // Sort busy events to the end so the real event title is kept visible
    events.sort((e1, e2) => (e1._isBusy || 0) - (e2._isBusy || 0) || utils.dragType(e1) - utils.dragType(e2));

    // Save original colors before any merge modifies them
    events.forEach((event) => {
      event._originalColor = event._originalColor ||
        event.style.backgroundColor ||
        event.style.borderColor ||
        event.parentElement.style.borderColor;
    });
    const colors = events.map((event) => event._originalColor);

    const parentPosition = events[0].parentElement.getBoundingClientRect();
    const positions = events.map((event) => {
      event.originalPosition = event.originalPosition || utils.calculatePosition(event, parentPosition);
      return event.originalPosition;
    });

    const eventToKeep = events.shift();
    events.forEach((event) => {
      event.style.visibility = 'hidden';
    });

    if (eventToKeep._originalColor) {
      eventToKeep.originalStyle = eventToKeep.originalStyle || {
        backgroundImage: eventToKeep.style.backgroundImage,
        backgroundSize: eventToKeep.style.backgroundSize,
        backgroundColor: eventToKeep.style.backgroundColor,
        left: eventToKeep.style.left,
        right: eventToKeep.style.right,
        visibility: eventToKeep.style.visibility,
        width: eventToKeep.style.width,
        border: eventToKeep.style.border,
      };
      
      eventToKeep.style.backgroundImage = utils.stripesGradient(colors, 10, 45);
      eventToKeep.style.backgroundSize = 'cover'; // Fix for gradient box creep
      eventToKeep.style.backgroundColor = 'unset';
      eventToKeep.style.left = Math.min(...positions.map((s) => s.left)) + 'px';
      eventToKeep.style.right = Math.min(...positions.map((s) => s.right)) + 'px';
      eventToKeep.style.visibility = 'visible';
      eventToKeep.style.width = null;
      eventToKeep.style.border = 'solid 1px #FFF';
    } else {
      const dots = eventToKeep.querySelector('[role="button"] div:first-child');
      const dot = dots.querySelector('div');
      dot.style.backgroundImage = utils.stripesGradient(colors, 4, 90);
      dot.style.width = colors.length * 4 + 'px';
      dot.style.borderWidth = 0;
      dot.style.height = '8px';
    }
  },

  merge: (mainCalendar) => {
    const eventSets = {};
    const positionSets = {};
    const days = mainCalendar.querySelectorAll('[role="gridcell"]');
    days.forEach((day, index) => {
      const events = Array.from(day.querySelectorAll('[data-eventid][role="button"], [data-eventid] [role="button"]'));
      events.forEach((event) => {
        const eventTitleEls = event.querySelectorAll('[aria-hidden="true"]');
        if (!eventTitleEls.length) return;
        const title = Array.from(eventTitleEls)
          .map((el) => el.textContent)
          .join('')
          .replace(/\s+/g, '');
        const titleKey = index + '_' + title + event.style.height;
        event._titleKey = titleKey;
        // Detect "busy" events from other calendars (text is "busy5 – 7am", no separator)
        event._isBusy = Array.from(eventTitleEls).some(
          (el) => /^busy([^a-z]|$)/i.test(el.textContent.trim())
        );
        eventSets[titleKey] = eventSets[titleKey] || [];
        eventSets[titleKey].push(event);

        // Track timed events by rendered position for busy-event merging
        const rect = event.getBoundingClientRect();
        const dayRect = day.getBoundingClientRect();
        const relTop = Math.round(rect.top - dayRect.top);
        const relHeight = Math.round(rect.height);
        if (relHeight > 0) {
          const posKey = index + '_' + relTop + '_' + relHeight;
          event._posKey = posKey;
          positionSets[posKey] = positionSets[posKey] || [];
          positionSets[posKey].push(event);
        }
      });
    });

    // Merge busy events into their position group
    Object.values(positionSets).forEach((posEvents) => {
      const hasBusy = posEvents.some((e) => e._isBusy);
      if (!hasBusy || posEvents.length < 2) return;
      // Remove these events from their title-based groups
      posEvents.forEach((event) => {
        const group = eventSets[event._titleKey];
        if (group) {
          const idx = group.indexOf(event);
          if (idx !== -1) group.splice(idx, 1);
          if (group.length === 0) delete eventSets[event._titleKey];
        }
      });
      // Add as a merged group with a position-based key
      eventSets['_busy_' + posEvents[0]._posKey] = posEvents;
    });

    Object.values(eventSets).forEach((events) => {
      if (events.length > 1) {
        eventHandlers.mergeEventElements(events);
      } else {
        events.forEach((event) => {
          for (let k in event.originalStyle) {
            event.style[k] = event.originalStyle[k];
          }
        });
      }
    });
  }
};

// Weekend coloring functions
const weekendHandlers = {
  colorWeekends: (node) => {
    const weekendColor = config.getWeekendColor();
    const nodes = node.querySelectorAll("div[role='columnheader'],div[data-datekey]:not([jsaction])");
    for (const node of nodes) {
      if (node.getAttribute('role') === 'columnheader') {
        if (node.children[0].innerHTML[0] === CONSTANTS.WEEKEND.DAY1 || node.children[0].innerHTML[0] === CONSTANTS.WEEKEND.DAY2) {
          node.style.backgroundColor = weekendColor;
        }
        continue;
      }
      
      const datekey = parseInt(node.getAttribute('data-datekey'));
      if (!datekey) continue;
      
      const year = datekey >> 9;
      const month = (datekey & 511) >> 5;
      const day = datekey & 31;
      const date = new Date(1970 + year, month - 1, day);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        node.style.backgroundColor = weekendColor;
      }
    }
  },

  colorMiniCalendarWeekends: (node) => {
    const weekendColor = config.getWeekendColor();
    const nodes = node.querySelectorAll("span[role='columnheader'],span[data-date]");
    for (const node of nodes) {
      if (node.getAttribute('role') === 'columnheader') {
        if (node.children[0].innerHTML[0] === CONSTANTS.WEEKEND.DAY1 || node.children[0].innerHTML[0] === CONSTANTS.WEEKEND.DAY2) {
          node.style.backgroundColor = weekendColor;
        }
        continue;
      }
      
      const d = node.getAttribute('data-date');
      if (!d) continue;
      
      const dt = new Date(d.slice(0, 4), d.slice(4, 6) - 1, d.slice(6, 8));
      if (dt.getDay() === 6 || dt.getDay() === 0) {
        node.style.backgroundColor = weekendColor;
        node.children[0].style.backgroundColor = weekendColor;
      }
    }
  }
};

// Observer setup
const observerSetup = {
  initializeObservers: () => {
    const mainObserver = new MutationObserver((mutations) => {
      mutations
        .map(mutation => mutation.addedNodes[0] || mutation.target)
        .filter(node => node.matches && node.matches(CONSTANTS.SELECTORS.MAIN_CALENDAR))
        .forEach(node => {
          eventHandlers.merge(node);
          if (config.settings.weekendsEnabled) {
            weekendHandlers.colorWeekends(node);
          }
        });
    });

    const miniObserver = new MutationObserver((mutations) => {
      if (!config.settings.weekendsEnabled) return;
      
      mutations
        .map(mutation => mutation.addedNodes[0] || mutation.target)
        .filter(node => node.matches && node.matches(CONSTANTS.SELECTORS.MINI_CALENDAR))
        .forEach(weekendHandlers.colorMiniCalendarWeekends);
    });

    return { mainObserver, miniObserver };
  }
};

// Initialize application
const init = async () => {
  setTimeout(async () => {
    chrome.storage.local.get('disabled', async storage => {
      if (!storage.disabled) {
        await config.loadSettings();
        const { mainObserver, miniObserver } = observerSetup.initializeObservers();
        mainObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
        miniObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
      }
      
      // Reload when settings change
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.gradientOpacity) {
          config.settings.gradientOpacity = changes.gradientOpacity.newValue;
        }
        if (changes.theme) {
          config.settings.theme = changes.theme.newValue;
        }
        if (changes.lightThemeColor) {
          config.settings.lightThemeColor = changes.lightThemeColor.newValue;
        }
        if (changes.darkThemeColor) {
          config.settings.darkThemeColor = changes.darkThemeColor.newValue;
        }
        window.location.reload();
      });
    });
  }, 10);
};

init();