/**
 * CalBlend Desktop — Replace Google Calendar logo with CalBlend logo.
 *
 * Google Calendar enforces Trusted Types CSP, so we can't use innerHTML.
 * Instead we build the SVG via DOM API and swap the original <img> src
 * to a data URI pointing to our logo.
 */

const NS = 'http://www.w3.org/2000/svg';
const MARKER_CLASS = 'calblend-logo-replacement';

function createCalBlendSvg(size: number): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));

  const defs = document.createElementNS(NS, 'defs');

  // Gradient 1: purple
  const g1 = document.createElementNS(NS, 'linearGradient');
  g1.setAttribute('id', 'cb1');
  g1.setAttribute('x1', '0'); g1.setAttribute('x2', '1');
  g1.setAttribute('y1', '0'); g1.setAttribute('y2', '1');
  const s1a = document.createElementNS(NS, 'stop');
  s1a.setAttribute('offset', '0%'); s1a.setAttribute('stop-color', '#6366F1');
  const s1b = document.createElementNS(NS, 'stop');
  s1b.setAttribute('offset', '100%'); s1b.setAttribute('stop-color', '#8B5CF6');
  g1.appendChild(s1a); g1.appendChild(s1b);

  // Gradient 2: blue
  const g2 = document.createElementNS(NS, 'linearGradient');
  g2.setAttribute('id', 'cb2');
  g2.setAttribute('x1', '1'); g2.setAttribute('x2', '0');
  g2.setAttribute('y1', '0'); g2.setAttribute('y2', '1');
  const s2a = document.createElementNS(NS, 'stop');
  s2a.setAttribute('offset', '0%'); s2a.setAttribute('stop-color', '#3B82F6');
  const s2b = document.createElementNS(NS, 'stop');
  s2b.setAttribute('offset', '100%'); s2b.setAttribute('stop-color', '#6366F1');
  g2.appendChild(s2a); g2.appendChild(s2b);

  defs.appendChild(g1); defs.appendChild(g2);
  svg.appendChild(defs);

  // Back rect (blue, semi-transparent)
  const r1 = document.createElementNS(NS, 'rect');
  r1.setAttribute('width', '30'); r1.setAttribute('height', '30');
  r1.setAttribute('x', '10'); r1.setAttribute('y', '4');
  r1.setAttribute('fill', 'url(#cb2)'); r1.setAttribute('opacity', '.6');
  r1.setAttribute('rx', '6');

  // Front rect (purple)
  const r2 = document.createElementNS(NS, 'rect');
  r2.setAttribute('width', '30'); r2.setAttribute('height', '30');
  r2.setAttribute('x', '8'); r2.setAttribute('y', '14');
  r2.setAttribute('fill', 'url(#cb1)'); r2.setAttribute('rx', '6');

  // Overlay (white highlight)
  const r3 = document.createElementNS(NS, 'rect');
  r3.setAttribute('width', '28'); r3.setAttribute('height', '20');
  r3.setAttribute('x', '10'); r3.setAttribute('y', '14');
  r3.setAttribute('fill', '#fff'); r3.setAttribute('opacity', '.15');
  r3.setAttribute('rx', '4');

  svg.appendChild(r1); svg.appendChild(r2); svg.appendChild(r3);
  return svg;
}

function replaceLogo(): boolean {
  // Already replaced?
  if (document.querySelector(`.${MARKER_CLASS}`)) return true;

  const imgs = document.querySelectorAll<HTMLImageElement>('img');
  for (const img of imgs) {
    const src = img.getAttribute('src') ?? '';

    const isCalendarLogo =
      src.includes('dynamiclogo') ||
      src.includes('calendar/images') ||
      src.includes('calendar_') ||
      src.includes('googlelogo') ||
      src.includes('product/cal');

    if (isCalendarLogo) {
      const size = Math.max(img.offsetWidth, img.offsetHeight, 40);

      // Hide original img
      img.style.display = 'none';

      // Insert SVG element (CSP-safe, no innerHTML)
      const wrapper = document.createElement('span');
      wrapper.className = MARKER_CLASS;
      wrapper.style.display = 'inline-flex';
      wrapper.style.alignItems = 'center';
      wrapper.appendChild(createCalBlendSvg(size));
      img.parentElement?.insertBefore(wrapper, img);

      console.log('[CalBlend] Logo replaced:', src.slice(0, 80));
      return true;
    }
  }

  return false;
}

function updateTitle(): void {
  document.title = document.title
    .replace('Google Calendar', 'CalBlend')
    .replace('Google Agenda', 'CalBlend');
}

export function initBranding(): void {
  function applyBranding(): void {
    replaceLogo();
    updateTitle();
  }

  setTimeout(applyBranding, 3000);

  let throttle: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (throttle) return;
    throttle = setTimeout(() => {
      applyBranding();
      throttle = null;
    }, 2000);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
