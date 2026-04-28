/**
 * amazonHelper.js
 * Shared utilities for Amazon test cases — handles product popup navigation.
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function _dismissPopups(page) {
  for (const sel of [
    'input[data-action-type="DISMISS"]',
    '#nav-flyout-ya-signin .a-button-close',
    '.a-popover-footer .a-button-primary',
    '#sp-cc-accept',
    '.a-popover-mask .dismiss-button',
  ]) {
    const el = page.locator(sel).first();
    try {
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        await el.click().catch(() => {});
        await delay(400);
      }
    } catch (e) {
      // ignore
    }
  }
}

async function searchAndGetFirstProduct(page, searchTerm) {
  // Navigate to Amazon
  await page.goto('https://www.amazon.in', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await delay(2500);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await delay(1500);

  await _dismissPopups(page);

  // Search box
  const searchBox = page.locator('#twotabsearchtextbox');
  let found = false;
  for (let i = 0; i < 3; i++) {
    if (await searchBox.isVisible({ timeout: 8000 }).catch(() => false)) {
      found = true;
      break;
    }
    // retry
    await delay(1000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  }
  if (!found) throw new Error('Search box not found');

  await searchBox.click().catch(() => {});
  await delay(250);
  await searchBox.fill(''); // clear if needed
  await searchBox.type(searchTerm, { delay: 80 });
  await page.keyboard.press('Enter');
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await delay(3000);

  // Dismiss any interim popups on results page
  await _dismissPopups(page);

  // Click the first product and capture popup if it opens
  const productSelector = 'div[data-component-type="s-search-result"] h2 a, h2 a.a-link-normal';
  let productPage = page;

  // start listening for popup BEFORE click
  const popupPromise = page.context().waitForEvent('page').catch(() => null);

  // Try click (may open a new page)
  try {
    await page.locator(productSelector).first().click({ timeout: 10000 }).catch(() => { throw new Error('click-failed'); });
  } catch (e) {
    // fallback: try any /dp/ link
    try {
      await page.locator('a[href*="/dp/"]').first().click({ timeout: 10000 });
    } catch (e2) {
      throw new Error('Could not click on a product link');
    }
  }

  // wait shortly for popup to appear
  const popup = await popupPromise;
  if (popup) {
    // A new tab/window opened — use it
    productPage = popup;
    await productPage.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    // sometimes Amazon injects content after load; give a small delay
    await delay(1500);
  } else {
    // No popup: assume navigation occurred in same page
    productPage = page;
    await productPage.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await delay(1200);
  }

  // Ensure any popups in the product page are dismissed
  await _dismissPopups(productPage);

  // --- Extract title from product detail page ---
  let title = 'Title not found';
  try {
    const titleEl = productPage.locator('#productTitle');
    if (await titleEl.isVisible({ timeout: 10000 }).catch(() => false)) {
      title = (await titleEl.textContent())?.trim() || title;
    } else {
      // safety: try common alternative (span inside h1/h2)
      const alt = productPage.locator('h1 span, h2 span').first();
      if (await alt.isVisible({ timeout: 3000 }).catch(() => false)) {
        const extracted = (await alt.textContent())?.trim();
        if (extracted && extracted.length > 5) title = extracted;
      }
    }
  } catch (e) {
    // ignore, keep title as not found
  }

  // --- Extract price ---
  let price = 'Price not found';
  const priceSelectors = [
    '.a-price .a-offscreen',
    '#corePrice_desktop .a-offscreen',
    '.apexPriceToPay .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '#priceblock_saleprice',
    '#price_inside_buybox',
  ];
  for (const sel of priceSelectors) {
    const el = productPage.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      price = (await el.textContent())?.trim() || price;
      if (price && price !== 'Price not found') break;
    }
  }

  return { title, price, productPage };
}

async function addToCart(pageOrProductPage) {
  const page = pageOrProductPage;
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await delay(800);

  const cartSelectors = [
    '#add-to-cart-button',
    'input[name="submit.add-to-cart"]',
    'button[name="submit.add-to-cart"]',
    'button:has-text("Add to cart")',
    'button:has-text("ADD TO CART")',
    '[aria-label*="Add to cart"]',
  ];

  let added = false;
  for (const sel of cartSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.click().catch(() => {});
      added = true;
      break;
    }
  }

  if (!added) {
    // helpful debug: save screenshot (tests runner will upload artifacts)
    await page.screenshot({ path: 'test-results/add-to-cart-debug.png' }).catch(() => {});
    throw new Error('Add to cart button not found');
  }

  await delay(1200);

  // Dismiss upsell dialogs if present
  for (const sel of [
    '#attachSiNoCoverage',
    'button[aria-label="No thanks"]',
    '.a-button-close',
    '#siNoCoverage',
    'button:has-text("No thanks")',
  ]) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
      await el.click().catch(() => {});
      break;
    }
  }
}

module.exports = { searchAndGetFirstProduct, addToCart };
