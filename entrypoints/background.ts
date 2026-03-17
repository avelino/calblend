import { loadSettings, onSettingsChanged } from '@/src/storage';

export default defineBackground(() => {
  function updateIcon(enabled: boolean): void {
    chrome.action.setIcon({
      path: enabled ? '/icon.png' : '/icon-disabled.png',
    });
  }

  loadSettings().then((settings) => {
    updateIcon(settings.enabled);
  });

  onSettingsChanged((settings) => {
    updateIcon(settings.enabled);
  });
});
