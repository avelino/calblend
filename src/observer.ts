/**
 * Creates a MutationObserver that only fires when relevant calendar nodes change.
 * Uses disconnect/reconnect instead of flags to guarantee no re-entrancy.
 */
export function createCalendarObserver(
  onMainCalendar: (node: HTMLElement) => void,
  onMiniCalendar: (node: HTMLElement) => void,
): { observer: MutationObserver; start: () => void; stop: () => void } {
  const MAIN_SELECTORS = "[role='main']";
  const MINI_SELECTORS = 'div[data-month], div[data-ical]';

  let scheduled = false;
  let observeTarget: Node | null = null;

  function findRelevantNodes(mutations: MutationRecord[]): {
    main: Set<HTMLElement>;
    mini: Set<HTMLElement>;
  } {
    const main = new Set<HTMLElement>();
    const mini = new Set<HTMLElement>();

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        // Check if the added node IS a calendar container
        if (node.matches(MAIN_SELECTORS)) {
          main.add(node);
        } else if (node.matches(MINI_SELECTORS)) {
          mini.add(node);
        }

        // Check if the added node is INSIDE a calendar container
        const mainParent = node.closest<HTMLElement>(MAIN_SELECTORS);
        if (mainParent) main.add(mainParent);

        const miniParent = node.closest<HTMLElement>(MINI_SELECTORS);
        if (miniParent) mini.add(miniParent);
      }

      // Also check the mutation target itself (for childList changes within containers)
      if (mutation.target instanceof HTMLElement) {
        const mainParent = mutation.target.closest<HTMLElement>(MAIN_SELECTORS);
        if (mainParent) main.add(mainParent);

        const miniParent = mutation.target.closest<HTMLElement>(MINI_SELECTORS);
        if (miniParent) mini.add(miniParent);
      }
    }

    return { main, mini };
  }

  const observer = new MutationObserver((mutations) => {
    if (scheduled) return;

    const { main, mini } = findRelevantNodes(mutations);
    if (main.size === 0 && mini.size === 0) return;

    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;

      // Disconnect before processing to ignore our own DOM changes
      observer.disconnect();

      for (const node of main) {
        onMainCalendar(node);
      }
      for (const node of mini) {
        onMiniCalendar(node);
      }

      // Reconnect after processing
      if (observeTarget) {
        observer.observe(observeTarget, { childList: true, subtree: true });
      }
    });
  });

  return {
    observer,
    start() {
      observeTarget = document.body;
      observer.observe(document.body, { childList: true, subtree: true });
    },
    stop() {
      observeTarget = null;
      observer.disconnect();
    },
  };
}
