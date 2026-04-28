# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc2_galaxy.spec.js >> TC2 - Search Galaxy device, add to cart, print price
- Location: tests\tc2_galaxy.spec.js:10:1

# Error details

```
TimeoutError: locator.click: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('a[href*="/dp/"]').first()
    - locator resolved to <a tabindex="-1" target="_blank" aria-hidden="true" class="a-link-normal s-no-outline" href="/Samsung-Sapphire-Storage-Upgrades-Lag-Free/dp/B0FN7RN9TH/ref=sr_1_1?dib=eyJ2IjoiMSJ9.Aa8hhr_AoH1woBpqsYAuCRu7TT1T7AVg2bIt-iLqYt2iTvneyoiYVLN6gG9LB69_dgB0d0X5-TqJfe5O53OyZrLgkYkvVj2mQKpLvnQu5X15G3JMxTe3yQwjs_wZaVJwJKoh1dIuuaL7L-anJ6PctWsHEWdDFiRnBWu3oRUP1BMQku3wOsklMJYhyZjvdyY5AHu30hspKtw_nzd1wJJ9p2JdH19Ix8VE1DwWPuccjck.m3KJ4dMQEpvHbyph-gPt0LLIKUpqiaO1Lijw9_x4HA8&dib_tag=se&keywords=Samsung+Galaxy+phone&q…>…</a>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action

```

# Test source

```ts
  1   | /**
  2   |  * amazonHelper.js
  3   |  * Shared utilities for Amazon test cases — with anti-bot evasion.
  4   |  */
  5   | 
  6   | const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  7   | 
  8   | async function searchAndGetFirstProduct(page, searchTerm) {
  9   | 
  10  |   // --- Go to Amazon with a realistic browser fingerprint ---
  11  |   await page.goto('https://www.amazon.in', { waitUntil: 'domcontentloaded', timeout: 40000 });
  12  |   await delay(2000);
  13  | 
  14  |   // Dismiss popups / location / sign-in prompts
  15  |   for (const sel of [
  16  |     'input[data-action-type="DISMISS"]',
  17  |     '#nav-flyout-ya-signin .a-button-close',
  18  |     '.a-popover-footer .a-button-primary',
  19  |     '#sp-cc-accept',
  20  |   ]) {
  21  |     const el = page.locator(sel).first();
  22  |     if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
  23  |       await el.click().catch(() => {});
  24  |       await delay(500);
  25  |     }
  26  |   }
  27  | 
  28  |   // --- Search ---
  29  |   const searchBox = page.locator('#twotabsearchtextbox');
  30  |   await searchBox.waitFor({ timeout: 20000 });
  31  |   await searchBox.click();
  32  |   await delay(300);
  33  |   // Type like a human — character by character
  34  |   await searchBox.type(searchTerm, { delay: 80 });
  35  |   await delay(500);
  36  |   await page.keyboard.press('Enter');
  37  |   await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  38  |   await delay(2000);
  39  | 
  40  |   // --- Find the first product link (try multiple selector patterns) ---
  41  |   const productSelectors = [
  42  |     'div[data-component-type="s-search-result"] h2 a.a-link-normal',
  43  |     '[data-cy="title-recipe"] a',
  44  |     '.s-result-item h2 a',
  45  |     '.s-search-results .s-result-item a.a-link-normal[href*="/dp/"]',
  46  |     'h2.a-size-mini a',
  47  |   ];
  48  | 
  49  |   let clicked = false;
  50  |   for (const sel of productSelectors) {
  51  |     const el = page.locator(sel).first();
  52  |     if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
  53  |       await el.scrollIntoViewIfNeeded().catch(() => {});
  54  |       await delay(300);
  55  |       await el.click();
  56  |       clicked = true;
  57  |       break;
  58  |     }
  59  |   }
  60  | 
  61  |   if (!clicked) {
  62  |     // Last resort: find any /dp/ link on the page
  63  |     const dpLink = page.locator('a[href*="/dp/"]').first();
  64  |     await dpLink.waitFor({ timeout: 10000 });
> 65  |     await dpLink.click();
      |                  ^ TimeoutError: locator.click: Timeout 20000ms exceeded.
  66  |   }
  67  | 
  68  |   await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  69  |   await delay(1500);
  70  | 
  71  |   // --- Extract title ---
  72  |   let title = 'Title not found';
  73  |   for (const sel of ['#productTitle', 'h1.a-size-large', 'h1 span']) {
  74  |     const el = page.locator(sel).first();
  75  |     if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
  76  |       title = (await el.textContent())?.trim() ?? title;
  77  |       break;
  78  |     }
  79  |   }
  80  | 
  81  |   // --- Extract price ---
  82  |   let price = 'Price not found';
  83  |   const priceSelectors = [
  84  |     '.a-price .a-offscreen',
  85  |     '.apexPriceToPay .a-offscreen',
  86  |     '#corePriceDisplay_desktop_feature_div .a-offscreen',
  87  |     '#priceblock_ourprice',
  88  |     '#priceblock_dealprice',
  89  |     '.a-price-whole',
  90  |     '#price_inside_buybox',
  91  |     '.a-color-price',
  92  |   ];
  93  |   for (const sel of priceSelectors) {
  94  |     const el = page.locator(sel).first();
  95  |     if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
  96  |       price = (await el.textContent())?.trim() ?? price;
  97  |       if (price && price !== 'Price not found') break;
  98  |     }
  99  |   }
  100 | 
  101 |   return { title, price };
  102 | }
  103 | 
  104 | async function addToCart(page) {
  105 |   const cartSelectors = [
  106 |     '#add-to-cart-button',
  107 |     'input[name="submit.add-to-cart"]',
  108 |     'button[name="submit.add-to-cart"]',
  109 |   ];
  110 | 
  111 |   let added = false;
  112 |   for (const sel of cartSelectors) {
  113 |     const el = page.locator(sel).first();
  114 |     if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
  115 |       await el.click();
  116 |       added = true;
  117 |       break;
  118 |     }
  119 |   }
  120 | 
  121 |   if (!added) throw new Error('Add to cart button not found');
  122 | 
  123 |   await delay(2000);
  124 | 
  125 |   // Dismiss upsell / protection plan modals
  126 |   for (const sel of [
  127 |     '#attachSiNoCoverage',
  128 |     'button[aria-label="No thanks"]',
  129 |     '.a-button-close',
  130 |     '#siNoCoverage',
  131 |   ]) {
  132 |     const el = page.locator(sel).first();
  133 |     if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
  134 |       await el.click().catch(() => {});
  135 |       break;
  136 |     }
  137 |   }
  138 | }
  139 | 
  140 | module.exports = { searchAndGetFirstProduct, addToCart };
  141 | 
```