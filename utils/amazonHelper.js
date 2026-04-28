/**
 * amazonHelper.js
 * Shared utilities for Amazon test cases — with anti-bot evasion.
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchAndGetFirstProduct(page, searchTerm) {

  // --- Go to Amazon ---
  await page.goto('https://www.amazon.in', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await delay(3000);

  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await delay(2000);

  // Dismiss popups
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
      // Ignore
    }
  }

  // --- Search ---
  const searchBox = page.locator('#twotabsearchtextbox');
  
  let searchBoxFound = false;
  for (let i = 0; i < 3; i++) {
    try {
      await searchBox.waitFor({ timeout: 15000, state: 'visible' });
      searchBoxFound = true;
      break;
    } catch (e) {
      if (i < 2) {
        await delay(2000);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await delay(2000);
      }
    }
  }

  if (!searchBoxFound) {
    throw new Error('Search box not found');
  }

  await searchBox.click();
  await delay(300);
  await searchBox.type(searchTerm, { delay: 80 });
  await delay(500);
  await page.keyboard.press('Enter');
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await delay(3000);

  // --- Click on the first product ---
  const firstProduct = page.locator('h2 a.a-link-normal').first();
  await firstProduct.waitFor({ timeout: 10000 });
  await firstProduct.click();
  
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await delay(3000);

  // --- Extract title ---
  let title = 'Title not found';
  try {
    // Wait for productTitle to be in the DOM
    await page.locator('#productTitle').waitFor({ timeout: 10000 });
    
    const titleElement = page.locator('#productTitle');
    title = (await titleElement.textContent())?.trim() || 'Title not found';
  } catch (e) {
    console.error('Error extracting title:', e.message);
  }

  // --- Extract price ---
  let price = 'Price not found';
  const priceSelectors = [
    '.a-price .a-offscreen',
    '.apexPriceToPay .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
  ];

  for (const sel of priceSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        const extractedPrice = (await el.textContent())?.trim();
        if (extractedPrice && extractedPrice !== 'Price not found') {
          price = extractedPrice;
          break;
        }
      }
    } catch (e) {
      // Continue
    }
  }

  return { title, price };
}

async function addToCart(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await delay(1500);

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
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
        await el.click();
        added = true;
        break;
      }
    } catch (e) {
      // Continue
    }
  }

  if (!added) {
    throw new Error('Add to cart button not found');
  }

  await delay(2000);

  for (const sel of [
    '#attachSiNoCoverage',
    'button[aria-label="No thanks"]',
    '.a-button-close',
    '#siNoCoverage',
  ]) {
    const el = page.locator(sel).first();
    try {
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        break;
      }
    } catch (e) {
      // Ignore
    }
  }
}

module.exports = { searchAndGetFirstProduct, addToCart };
