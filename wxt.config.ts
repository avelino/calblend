import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  manifest: {
    name: '__MSG_extensionName__',
    short_name: 'CalBlend',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: ['storage'],
    host_permissions: [
      'https://www.google.com/calendar/*',
      'https://calendar.google.com/*',
    ],
    action: {
      default_title: 'CalBlend Settings',
      default_icon: {
        '48': 'icon.png',
      },
    },
    icons: {
      '48': 'icon.png',
    },
    web_accessible_resources: [
      {
        resources: ['icon-large.png'],
        matches: [
          'https://www.google.com/calendar/*',
          'https://calendar.google.com/*',
        ],
      },
    ],
    browser_specific_settings: {
      gecko: {
        id: 'calblend@avelino.run',
        strict_min_version: '109.0',
      },
    },
  },
});
