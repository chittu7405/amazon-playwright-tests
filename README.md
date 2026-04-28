# Amazon Automated Tests — Playwright (JavaScript)

Automated test suite for Amazon.com covering two test cases run in **parallel**:

| Test | Scenario |
|------|----------|
| TC1  | Search **iPhone** → Add to cart → Print price |
| TC2  | Search **Samsung Galaxy** → Add to cart → Print price |

---

## 📁 Project Structure

```
amazon-playwright-tests/
├── tests/
│   ├── tc1_iphone.spec.js       # Test Case 1 – iPhone
│   └── tc2_galaxy.spec.js       # Test Case 2 – Galaxy
├── utils/
│   └── amazonHelper.js          # Shared search + cart helpers
├── playwright.config.js         # Config with parallel workers=2
├── package.json
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js** v18 or higher
- **npm** v8+

---

## 🚀 Setup & Run

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/amazon-playwright-tests.git
cd amazon-playwright-tests
```

### 2. Install dependencies
```bash
npm install
```

### 3. Install Playwright browsers
```bash
npm run install:browsers
# or: npx playwright install chromium
```

### 4. Run both tests in parallel (headless)
```bash
npm test
```

### 5. Run in headed mode (see the browser)
```bash
npm run test:headed
```

### 6. View HTML report after run
```bash
npm run test:report
```

---

## ⚡ Parallel Execution

Both test cases run simultaneously via Playwright's built-in worker system.  
Configured in `playwright.config.js`:

```js
fullyParallel: true,
workers: 2,
```

---

## 🖥️ Sample Console Output

```
========================================
TEST CASE 1: iPhone
========================================
📱 Product Found : Apple iPhone 15 (128 GB) - Black
💰 Device Price  : $799.00
🛒 Status        : Successfully added to cart
✅ Test Case 1 PASSED
========================================

========================================
TEST CASE 2: Samsung Galaxy
========================================
📱 Product Found : Samsung Galaxy S24 128GB Onyx Black
💰 Device Price  : $699.99
🛒 Status        : Successfully added to cart
✅ Test Case 2 PASSED
========================================
```

---

## ☁️ Bonus: Run on LambdaTest Cloud

1. Sign up at [lambdatest.com](https://www.lambdatest.com)
2. Get your **Username** and **Access Key** from the dashboard
3. Install the LambdaTest Playwright tunnel/CLI if needed
4. Update `playwright.config.js` to use LambdaTest's remote grid:

```js
use: {
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
      }
    }))}`,
  }
}
```

5. Set env vars and run:
```bash
export LT_USERNAME=your_username
export LT_ACCESS_KEY=your_key
npm test
```

---

## 📝 Notes

- Amazon may show CAPTCHAs or geo-based popups — the helper handles common dismissals automatically.
- Tests use realistic user-agent headers to reduce bot detection.
- Screenshots are saved on failure inside `test-results/`.
