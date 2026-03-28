/**
 * Creates a MutationObserver that only fires when relevant calendar nodes change.
 * Uses disconnect/reconnect instead of flags to guarantee no re-entrancy.
 * Debounces processing to avoid rapid-fire updates during Google Calendar renders.
 */
export function createCalendarObserver(
  onMainCalendar: (node: HTMLElement) => void,
  onMiniCalendar: (node: HTMLElement) => void,
): { observer: MutationObserver; start: () => void; stop: () => void } {
  const MAIN_SELECTORS = "[role='main']";
  const MINI_SELECTORS = 'div[data-month], div[data-ical]';

  let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
  let observeTarget: Node | null = null;
  let lastUrl = location.href;
  let pendingMain = new Set<HTMLElement>();
  let pendingMini = new Set<HTMLElement>();

  function flush(): void {
    rafId = null;
    observer.disconnect();

    const main = pendingMain;
    const mini = pendingMini;
    pendingMain = new Set();
    pendingMini = new Set();

    for (const node of main) {
      if (node.isConnected) onMainCalendar(node);
    }
    for (const node of mini) {
      if (node.isConnected) onMiniCalendar(node);
    }

    if (observeTarget) {
      observer.observe(observeTarget, { childList: true, subtree: true });
    }
  }

  function scheduleFlush(): void {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(flush);
  }

  function scheduleFullProcess(): void {
    document
      .querySelectorAll<HTMLElement>(MAIN_SELECTORS)
      .forEach((n) => pendingMain.add(n));
    document
      .querySelectorAll<HTMLElement>(MINI_SELECTORS)
      .forEach((n) => pendingMini.add(n));
    scheduleFlush();
  }

  const observer = new MutationObserver((mutations) => {
    // Detect URL changes (view switches, date navigation)
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleFullProcess();
      return;
    }

    let found = false;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        if (node.matches(MAIN_SELECTORS)) {
          pendingMain.add(node);
          found = true;
        } else if (node.matches(MINI_SELECTORS)) {
          pendingMini.add(node);
          found = true;
        }

        const mainParent = node.closest<HTMLElement>(MAIN_SELECTORS);
        if (mainParent) {
          pendingMain.add(mainParent);
          found = true;
        }

        const miniParent = node.closest<HTMLElement>(MINI_SELECTORS);
        if (miniParent) {
          pendingMini.add(miniParent);
          found = true;
        }
      }

      if (mutation.target instanceof HTMLElement) {
        const mainParent = mutation.target.closest<HTMLElement>(MAIN_SELECTORS);
        if (mainParent) {
          pendingMain.add(mainParent);
          found = true;
        }

        const miniParent = mutation.target.closest<HTMLElement>(MINI_SELECTORS);
        if (miniParent) {
          pendingMini.add(miniParent);
          found = true;
        }
      }
    }

    if (found) scheduleFlush();
  });

  function onUrlChange(): void {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleFullProcess();
    }
  }

  return {
    observer,
    start() {
      observeTarget = document.body;
      lastUrl = location.href;
      observer.observe(document.body, { childList: true, subtree: true });
      window.addEventListener('popstate', onUrlChange);
    },
    stop() {
      observeTarget = null;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      pendingMain.clear();
      pendingMini.clear();
      observer.disconnect();
      window.removeEventListener('popstate', onUrlChange);
    },
  };
}
