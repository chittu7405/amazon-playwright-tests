/**
 * utils/amazonHelper.js
 * Robust product navigation + extraction for Amazon.in
 *
 * Exports:
 * - searchAndGetFirstProduct(page, searchTerm) => { title, price, productPage }
 * - addToCart(page) => clicks add-to-cart on the supplied page
 *
 * Notes:
 * - searchAndGetFirstProduct will click the first search result,
 *   capture any popup that opens and return that page as productPage.
 * - Tests should pass the returned productPage to addToCart and close it
 *   when done (if it's a separate page).
 */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function _dismissPopups(page) {
  const popups = [
    'input[data-action-type="DISMISS"]',
    '#nav-flyout-ya-signin .a-button-close',
    '.a-popover-footer .a-button-primary',
    '#sp-cc-accept',
    '.a-popover-mask .dismiss-button',
    '[aria-label="Dismiss"]',
  ];
  for (const sel of popups) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1200 }).catch(() => false)) {
        await el.click().catch(() => {});
        await delay(300);
      }
    } catch (e) { /* ignore */ }
  }
}

async function searchAndGetFirstProduct(page, searchTerm) {
  // navigate to home
  await page.goto('https://www.amazon.in', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await delay(2000);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await _dismissPopups(page);

  // search box
  const searchBox = page.locator('#twotabsearchtextbox');
  let found = false;
  for (let i = 0; i < 3; i++) {
    if (await searchBox.isVisible({ timeout: 8000 }).catch(() => false)) {
      found = true;
      break;
    }
    await delay(1000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  }
  if (!found) throw new Error('Search box not found on Amazon home');

  await searchBox.click().catch(() => {});
  await searchBox.fill('').catch(() => {});
  await searchBox.type(searchTerm, { delay: 80 });
  await page.keyboard.press('Enter');
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await delay(2500);
  await _dismissPopups(page);

  // prepare for popup
  const popupPromise = page.context().waitForEvent('page').catch(() => null);

  // click first product - prefer search-result item anchors
  try {
    await page.locator('div[data-component-type="s-search-result"] h2 a').first().click({ timeout: 10000 });
  } catch (e) {
    // fallback to any product link
    try {
      await page.locator('a[href*="/dp/"]').first().click({ timeout: 10000 });
    } catch (e2) {
      throw new Error('Could not click any product link on search results');
    }
  }

  // handle popup vs same page navigation
  let productPage = page;
  const popup = await popupPromise;
  if (popup) {
    productPage = popup;
    await productPage.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await delay(1200);
    await _dismissPopups(productPage);
  } else {
    // same page navigation
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await delay(1200);
    await _dismissPopups(page);
    productPage = page;
  }

  // ensure productPage is visible
  try { await productPage.bringToFront().catch(() => {}); } catch (e) {}

  // --- Title extraction ---
  let title = 'Title not found';
  try {
    const titleEl = productPage.locator('#productTitle');
    if (await titleEl.isVisible({ timeout: 10000 }).catch(() => false)) {
      title = (await titleEl.textContent())?.trim() || title;
    }
  } catch (e) {
    // ignore - title not found
  }

  // --- Price extraction ---
  let price = 'Price not found';
  const priceCandidates = [
    '.a-price .a-offscreen',
    '.apexPriceToPay .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-offscreen',
    '#corePrice_desktop .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '#priceblock_saleprice',
    '#price_inside_buybox',
    '[data-a-color="price"] .a-offscreen',
  ];

  // wait up to ~12s for any price to appear (poll loop)
  const start = Date.now();
  while (Date.now() - start < 12000 && price === 'Price not found') {
    for (const sel of priceCandidates) {
      try {
        const el = productPage.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
          const txt = (await el.textContent())?.trim();
          if (txt && txt.length > 0) {
            price = txt;
            break;
          }
        }
      } catch (e) { /* continue */ }
    }
    if (price === 'Price not found') await delay(800);
  }

  return { title, price, productPage };
}

async function addToCart(page) {
  // page should be the product detail page (may be popup)
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await delay(700);

  const cartSelectors = [
    '#add-to-cart-button',
    '#buybox .a-button-input', // fallback
    'input[name="submit.add-to-cart"]',
    'button[name="submit.add-to-cart"]',
    'button:has-text("Add to cart")',
    'button:has-text("ADD TO CART")',
    '[aria-label*="Add to Cart"]',
    '[aria-labelledby*="add-to-cart-button"]',
  ];

  let added = false;
  for (const sel of cartSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        await el.click().catch(() => {});
        added = true;
        break;
      }
    } catch (e) { /* continue */ }
  }

  if (!added) {
    await page.screenshot({ path: 'test-results/add-to-cart-debug.png' }).catch(() => {});
    throw new Error('Add to cart button not found on product page');
  }

  await delay(1200);

  // dismiss any post-add dialogs
  const dismissors = [
    '#attachSiNoCoverage',
    'button[aria-label="No thanks"]',
    '.a-button-close',
    '#siNoCoverage',
    'button:has-text("No thanks")',
  ];
  for (const sel of dismissors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1200 }).catch(() => false)) {
        await el.click().catch(() => {});
        break;
      }
    } catch (e) { /* ignore */ }
  }
}

module.exports = { searchAndGetFirstProduct, addToCart };
