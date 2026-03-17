import { loadSettings, saveSettings } from '@/src/storage';

function $(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function isValidHex(hex: string): boolean {
  return /^[0-9A-F]{6}$/i.test(hex);
}

function showSaveIndicator(element: HTMLElement): void {
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2000);
}

const translations: Record<string, string> = {
  enableText: 'popupEnableExtension',
  weekendsText: 'popupEnableWeekends',
  opacityLabel: 'popupGradientOpacity',
  themeSelectLabel: 'popupThemeSelect',
  themeSystemOption: 'popupThemeSystem',
  themeLightOption: 'popupThemeLight',
  themeDarkOption: 'popupThemeDark',
  lightThemeColorLabel: 'popupLightThemeColor',
  darkThemeColorLabel: 'popupDarkThemeColor',
  colorCustomOption: 'popupColorCustom',
  colorCustomOptionDark: 'popupColorCustom',
  colorDefaultBlueOption: 'popupColorDefaultBlue',
  colorLightGrayOption: 'popupColorLightGray',
  colorWarmBeigeOption: 'popupColorWarmBeige',
  colorSoftPurpleOption: 'popupColorSoftPurple',
  colorMintGreenOption: 'popupColorMintGreen',
  colorDefaultDarkOption: 'popupColorDefaultDark',
  colorSoftBlackOption: 'popupColorSoftBlack',
  colorBlueGrayOption: 'popupColorBlueGray',
  colorNavyDarkOption: 'popupColorNavyDark',
  colorCharcoalOption: 'popupColorCharcoal',
};

interface ColorElements {
  preset: HTMLSelectElement;
  hex: HTMLInputElement;
  preview: HTMLElement;
  saved: HTMLElement;
}

function getColorElements(theme: 'light' | 'dark'): ColorElements {
  return {
    preset: $(`${theme}-color-preset`) as HTMLSelectElement,
    hex: $(`${theme}-hex-color`) as HTMLInputElement,
    preview: $(`${theme}-preview`),
    saved: $(`${theme}-saved`),
  };
}

function updateColor(
  theme: 'light' | 'dark',
  color: string,
  skipPreset = false,
): void {
  const els = getColorElements(theme);
  const hexColor = color.replace('#', '');

  if (!skipPreset) {
    const hasOption = els.preset.querySelector(`option[value="#${hexColor}"]`);
    els.preset.value = hasOption ? `#${hexColor}` : '';
  }

  els.hex.value = hexColor;
  els.preview.style.backgroundColor = `#${hexColor}`;

  if (isValidHex(hexColor)) {
    els.hex.classList.remove('invalid');
    const key = theme === 'light' ? 'lightThemeColor' : 'darkThemeColor';
    saveSettings({ [key]: `#${hexColor}` }).then(() =>
      showSaveIndicator(els.saved),
    );
  } else {
    els.hex.classList.add('invalid');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const enableExtension = $('enableExtension') as HTMLInputElement;
  const enableWeekends = $('enableWeekends') as HTMLInputElement;
  const gradientOpacity = $('gradientOpacity') as HTMLInputElement;
  const opacityValue = $('opacityValue');
  const themeSelect = $('theme-select') as HTMLSelectElement;

  const settings = await loadSettings();

  enableExtension.checked = settings.enabled;
  enableWeekends.checked = settings.weekendsEnabled;
  gradientOpacity.value = String(settings.gradientOpacity);
  opacityValue.textContent = String(settings.gradientOpacity);
  themeSelect.value = settings.theme;

  updateColor('light', settings.lightThemeColor);
  updateColor('dark', settings.darkThemeColor);

  enableExtension.addEventListener('change', () => {
    saveSettings({ enabled: enableExtension.checked });
  });

  enableWeekends.addEventListener('change', () => {
    saveSettings({ weekendsEnabled: enableWeekends.checked });
  });

  gradientOpacity.addEventListener('input', () => {
    opacityValue.textContent = gradientOpacity.value;
    saveSettings({ gradientOpacity: parseFloat(gradientOpacity.value) });
  });

  themeSelect.addEventListener('change', () => {
    saveSettings({ theme: themeSelect.value as 'system' | 'light' | 'dark' });
  });

  (['light', 'dark'] as const).forEach((theme) => {
    const els = getColorElements(theme);

    els.preset.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      if (value) updateColor(theme, value);
    });

    els.hex.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      updateColor(theme, value, true);
    });

    els.hex.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData ?? (window as any).clipboardData)?.getData(
        'text',
      );
      if (!paste) return;
      const cleaned = paste.replace('#', '').trim();
      els.hex.value = cleaned;
      updateColor(theme, cleaned, true);
    });
  });

  // Apply i18n translations
  for (const [elementId, messageKey] of Object.entries(translations)) {
    const element = document.getElementById(elementId);
    if (element) {
      const msg = chrome.i18n.getMessage(messageKey);
      if (msg) element.textContent = msg;
    }
  }
});
