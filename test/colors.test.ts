import { describe, it, expect } from 'vitest';
import { parseColor, toRgba, stripesGradient, isDarkMode, getMergeBorderColor } from '../src/colors';

describe('parseColor', () => {
  it('parses rgb() format', () => {
    expect(parseColor('rgb(255, 128, 0)')).toEqual([255, 128, 0]);
  });

  it('parses rgba() format', () => {
    expect(parseColor('rgba(100, 200, 50, 0.5)')).toEqual([100, 200, 50]);
  });

  it('parses 6-digit hex', () => {
    expect(parseColor('#ff8000')).toEqual([255, 128, 0]);
  });

  it('parses 3-digit hex', () => {
    expect(parseColor('#f80')).toEqual([255, 136, 0]);
  });

  it('parses hex without #', () => {
    expect(parseColor('ff8000')).toEqual([255, 128, 0]);
  });
});

describe('toRgba', () => {
  it('converts rgb to rgba with opacity', () => {
    expect(toRgba('rgb(255, 0, 0)', 0.75)).toBe('rgba(255, 0, 0, 0.75)');
  });

  it('converts hex to rgba', () => {
    expect(toRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('handles rgba input without breaking', () => {
    expect(toRgba('rgba(255, 0, 0, 1)', 0.75)).toBe('rgba(255, 0, 0, 0.75)');
  });
});

describe('stripesGradient', () => {
  it('creates a linear gradient from colors', () => {
    const result = stripesGradient(['rgb(255, 0, 0)', 'rgb(0, 0, 255)'], 10, 45, 0.75);
    expect(result).toBe('linear-gradient(45deg,rgba(255, 0, 0, 0.75),rgba(0, 0, 255, 0.75))');
  });

  it('works with hex colors', () => {
    const result = stripesGradient(['#ff0000', '#0000ff'], 10, 45, 0.5);
    expect(result).toBe('linear-gradient(45deg,rgba(255, 0, 0, 0.5),rgba(0, 0, 255, 0.5))');
  });
});

describe('isDarkMode', () => {
  it('returns true for dark theme', () => {
    expect(isDarkMode('dark')).toBe(true);
  });

  it('returns false for light theme', () => {
    expect(isDarkMode('light')).toBe(false);
  });

  it('returns false for system when no media query', () => {
    expect(isDarkMode('system')).toBe(false);
  });

  it('returns media query result for system theme', () => {
    expect(isDarkMode('system', { matches: true } as MediaQueryList)).toBe(true);
    expect(isDarkMode('system', { matches: false } as MediaQueryList)).toBe(false);
  });
});

describe('getMergeBorderColor', () => {
  it('returns #333 for dark mode', () => {
    expect(getMergeBorderColor(true)).toBe('#333');
  });

  it('returns #fff for light mode', () => {
    expect(getMergeBorderColor(false)).toBe('#fff');
  });
});
