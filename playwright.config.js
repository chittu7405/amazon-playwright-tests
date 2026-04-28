// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90000,
  retries: 1,

  // Run TC1 & TC2 in PARALLEL
  fullyParallel: true,
  workers: 2,

  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    headless: false,          // Run with visible browser — helps avoid bot detection
    viewport: { width: 1280, height: 800 },
    actionTimeout: 20000,
    navigationTimeout: 40000,
    screenshot: 'only-on-failure',
    video: 'off',

    // Realistic browser headers to avoid bot detection
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',

    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },

    // Bypass common bot detection checks
    bypassCSP: true,
    javaScriptEnabled: true,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', // Use real installed Chrome if available
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
      },
    },
  ],
});
