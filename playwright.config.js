// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const isLambdaTest = process.env.LT_USERNAME && process.env.LT_ACCESS_KEY;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90000,
  retries: 1,
  fullyParallel: true,
  workers: 2,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 20000,
    navigationTimeout: 40000,
    screenshot: 'only-on-failure',
    video: 'off',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
    bypassCSP: true,
    javaScriptEnabled: true,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  projects: [
    {
      name: 'chromium',
      use: isLambdaTest ? {
        ...devices['Desktop Chrome'],
        connectOptions: {
          wsEndpoint: `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(JSON.stringify({
            browserName: 'Chrome',
            browserVersion: 'latest',
            'LT:Options': {
              platform: 'Windows 10',
              build: 'Amazon Tests',
              name: 'TC1 & TC2 Parallel',
              user: process.env.LT_USERNAME,
              accessKey: process.env.LT_ACCESS_KEY,
              network: true,
              video: true,
              console: true,
            }
          }))}`,
        }
      } : {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
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
