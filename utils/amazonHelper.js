/**
 * amazonHelper.js
 * Shared utilities for Amazon test cases — with anti-bot evasion.
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchAndGetFirstProduct(page, searchTerm) {

  // --- Go to Amazon with a realistic browser fingerprint ---
  await page.goto('https://www.amazon.in', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await delay(3000);

  // Wait for page to fully load
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await delay(2000);

  // Dismiss popups / location / sign-in prompts
  for (const sel of [
    'input[data-action-type="DISMISS"]',
    '#nav-flyout-ya-signin .a-button-close',
    '.a-popover-footer .a-button-primary',
    '#sp-cc-accept',
  ]) {
    const el = page.locator(sel).first();
    try {
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        await delay(500);
      }
    } catch (e) {
      // Ignore if element not found
    }
  }

  // --- Search ---
  const searchBox = page.locator('#twotabsearchtextbox');
  
  // Wait for search box with retry logic
  let searchBoxFound = false;
  for (let i = 0; i < 3; i++) {
    try {
      await searchBox.waitFor({ timeout: 15000, state: 'visible' });
      searchBoxFound = true;
      break;
    } catch (e) {
      console.log(`Search box not found, attempt ${i + 1}/3. Retrying...`);
      if (i < 2) {
        await delay(2000);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await delay(2000);
      }
    }
  }

  if (!searchBoxFound) {
    throw new Error('Search box #twotabsearchtextbox not found after 3 attempts. Amazon may be blocking the bot.');
  }

  await searchBox.click();
  await delay(300);
  // Type like a human — character by character
  await searchBox.type(searchTerm, { delay: 80 });
  await delay(500);
  await page.keyboard.press('Enter');
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await delay(2000);

  // --- Find the first product link (try multiple selector patterns) ---
  const productSelectors = [
    'div[data-component-type="s-search-result"] h2 a.a-link-normal',
    '[data-cy="title-recipe"] a',
    '.s-result-item h2 a',
    '.s-search-results .s-result-item a.a-link-normal[href*="/dp/"]',
    'h2.a-size-mini a',
  ];

  let clicked = false;
  for (const sel of productSelectors) {
    const el = page.locator(sel).first();
    try {
      if (await el.isVisible({ timeout: 5000 })) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await delay(300);
        await el.click();
        clicked = true;
        break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  if (!clicked) {
    // Last resort: find any /dp/ link on the page
    const dpLink = page.locator('a[href*="/dp/"]').first();
    await dpLink.waitFor({ timeout: 10000 });
    await dpLink.click();
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await delay(1500);

  // --- Extract title ---
  let title = 'Title not found';
  for (const sel of ['#productTitle', 'h1.a-size-large', 'h1 span']) {
    const el = page.locator(sel).first();
    try {
      if (await el.isVisible({ timeout: 5000 })) {
        title = (await el.textContent())?.trim() ?? title;
        break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  // --- Extract price ---
  let price = 'Price not found';
  const priceSelectors = [
    '.a-price .a-offscreen',
    '.apexPriceToPay .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price-whole',
    '#price_inside_buybox',
    '.a-color-price',
  ];
  for (const sel of priceSelectors) {
    const el = page.locator(sel).first();
    try {
      if (await el.isVisible({ timeout: 2000 })) {
        price = (await el.textContent())?.trim() ?? price;
        if (price && price !== 'Price not found') break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  return { title, price };
}

async function addToCart(page) {
  const cartSelectors = [
    '#add-to-cart-button',
    'input[name="submit.add-to-cart"]',
    'button[name="submit.add-to-cart"]',
  ];

  let added = false;
  for (const sel of cartSelectors) {
    const el = page.locator(sel).first();
    try {
      if (await el.isVisible({ timeout: 5000 })) {
        await el.click();
        added = true;
        break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  if (!added) throw new Error('Add to cart button not found');

  await delay(2000);

  // Dismiss upsell / protection plan modals
  for (const sel of [
    '#attachSiNoCoverage',
    'button[aria-label="No thanks"]',
    '.a-button-close',
    '#siNoCoverage',
  ]) {
    const el = page.locator(sel).first();
    try {
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        break;
      }
    } catch (e) {
      // Ignore
    }
  }
}

module.exports = { searchAndGetFirstProduct, addToCart };
