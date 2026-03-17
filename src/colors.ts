/**
 * Parse an rgb/rgba color string into [r, g, b] components.
 * Handles: rgb(r,g,b), rgba(r,g,b,a), and hex (#rrggbb / #rgb).
 */
export function parseColor(color: string): [number, number, number] {
  const nums = color.match(/\d+/g);
  if (nums && nums.length >= 3) {
    return [parseInt(nums[0]!, 10), parseInt(nums[1]!, 10), parseInt(nums[2]!, 10)];
  }

  // Hex fallback
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

export function toRgba(color: string, opacity: number): string {
  const [r, g, b] = parseColor(color);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function stripesGradient(
  colors: string[],
  width: number,
  angle: number,
  opacity: number,
): string {
  const rgbaColors = colors.map((c) => toRgba(c, opacity));
  return `linear-gradient(${angle}deg,${rgbaColors.join(',')})`;
}

export function getMergeBorderColor(isDark: boolean): string {
  return isDark ? '#333' : '#fff';
}

export function isDarkMode(
  theme: 'system' | 'light' | 'dark',
  mediaQuery?: MediaQueryList,
): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return mediaQuery?.matches ?? false;
}

export function getWeekendColor(
  theme: 'system' | 'light' | 'dark',
  lightColor: string,
  darkColor: string,
  mediaQuery?: MediaQueryList,
): string {
  return isDarkMode(theme, mediaQuery) ? darkColor : lightColor;
}
