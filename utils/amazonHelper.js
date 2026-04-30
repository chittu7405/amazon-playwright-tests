/*
 * utils/amazonHelper.js
 * Robust product navigation + extraction for Amazon.in
 *
 * Exports:
 * - searchAndGetFirstProduct(page, searchTerm) => { title, price, productPage }
 * - addToCart(page) => clicks add-to-cart on the supplied page
 *
 * Notes:
 * - searchAndGetFirstProduct will click the first search result,
 *   capture any popup that opens, and return that page as productPage.
 * - Tests should pass the returned productPage to addToCart and close it
 *   when done (if it's a separate page).
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function _dismissPopups(page) {
  for (const sel of [
    'input[data-action-type="DISMISS"]',
    '#nav-flyout-ya-signin .a-button-close',
    '.a-popover-footer .a-button-primary',
    '#sp-cc-accept',
    '.a-popover-mask .dismiss-button',
    '[aria-label="Dismiss"]',
  ]) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1200 }).catch(() => false)) {
        await el.click().catch(() => {});
        await delay(300);
      }
    } catch (e) {
      // Ignore if element not found
    }
  }
}

async function searchAndGetFirstProduct(page, searchTerm) {
  // --- Go to Amazon ---
  await page.goto('https://www.amazon.in', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await delay(3000);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await delay(2000);
  await _dismissPopups(page);

  // --- Search ---
  const searchBox = page.locator('#twotabsearchtextbox');
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
    throw new Error('Search box #twotabsearchtextbox not found after 3 attempts.');
  }

  await searchBox.click();
  await delay(300);
  // Type like a human — character by character
  await searchBox.type(searchTerm, { delay: 80 });
  await delay(500);
  await page.keyboard.press('Enter');
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await delay(2500);
  await _dismissPopups(page);

  // --- Prepare for popup ---
  const popupPromise = page.context().waitForEvent('page').catch(() => null);

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
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
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

  // --- Handle popup vs same-page navigation ---
  let productPage = page;
  const popup = await popupPromise;
  if (popup) {
    productPage = popup;
    await productPage.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await delay(1200);
    await _dismissPopups(productPage);
  } else {
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    await delay(1200);
    await _dismissPopups(page);
    productPage = page;
  }

  try { await productPage.bringToFront(); } catch (e) {}

  // --- Extract title ---
  let title = 'Title not found';
  const titleSelectors = [
    '#productTitle',
    'h1.a-size-large',
    'h1 span',
    '.a-size-large.product-title',
    '[data-feature-name="title"]',
    'span.a-size-large',
    'h1.a-size-base-plus',
    'span[data-feature-name="title"]',
    '.a-section h1 span',
  ];

  for (const sel of titleSelectors) {
    try {
      const el = productPage.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        const extractedTitle = (await el.textContent())?.trim();
        if (extractedTitle) {
          title = extractedTitle;
          console.log(`✅ Found title with selector: ${sel}`);
          break;
        }
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  // Fallback: extract from page title
  if (title === 'Title not found') {
    try {
      const pageTitle = await productPage.title();
      if (pageTitle && pageTitle.includes('Amazon')) {
        title = pageTitle.replace(' - Amazon.in', '').replace(' - Amazon', '').trim();
        console.log(`✅ Found title from page title: ${title}`);
      }
    } catch (e) {
      // Ignore
    }
  }

  // --- Extract price ---
  let price = 'Price not found';
  const priceSelectors = [
    '.a-price .a-offscreen',
    '.apexPriceToPay .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-offscreen',
    '#corePrice_desktop .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '#priceblock_saleprice',
    '.a-price-whole',
    '#price_inside_buybox',
    '[data-a-color="price"] .a-offscreen',
    '.a-color-price',
    '[data-a-color="price"]',
    '.a-span12 .a-price .a-offscreen',
  ];

  // Poll up to ~12s for any price to appear
  const start = Date.now();
  while (Date.now() - start < 12000 && price === 'Price not found') {
    for (const sel of priceSelectors) {
      try {
        const el = productPage.locator(sel).first();
        if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
          const txt = (await el.textContent())?.trim();
          if (txt) {
            price = txt;
            console.log(`✅ Found price with selector: ${sel}`);
            break;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    if (price === 'Price not found') await delay(800);
  }

  return { title, price, productPage };
}

async function addToCart(page) {
  // Wait for page to load
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await delay(1500);

  // Try multiple selectors for "Add to Cart" button
  const cartSelectors = [
    '#add-to-cart-button',
    '#buybox .a-button-input',
    'input[name="submit.add-to-cart"]',
    'button[name="submit.add-to-cart"]',
    'button:has-text("Add to cart")',
    'button:has-text("ADD TO CART")',
    '[aria-label*="Add to Cart"]',
    '[aria-label*="Add to cart"]',
    '[aria-labelledby*="add-to-cart-button"]',
    '.a-button-primary button',
    '#a-autoid-0-announce',
  ];

  let added = false;
  for (const sel of cartSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`🛒 Found add-to-cart button: ${sel}`);
        await el.click();
        added = true;
        break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  if (!added) {
    await page.screenshot({ path: 'test-results/add-to-cart-debug.png' }).catch(() => {});
    throw new Error('Add to cart button not found. Check add-to-cart-debug.png');
  }

  await delay(2000);

  // Dismiss upsell / protection plan modals
  for (const sel of [
    '#attachSiNoCoverage',
    'button[aria-label="No thanks"]',
    '.a-button-close',
    '#siNoCoverage',
    'button:has-text("No thanks")',
  ]) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1200 }).catch(() => false)) {
        await el.click();
        break;
      }
    } catch (e) {
      // Ignore
    }
  }
}

module.exports = { searchAndGetFirstProduct, addToCart };
