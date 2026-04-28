/**
 * amazonHelper.js
 * Shared utilities for Amazon test cases — with anti-bot evasion.
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchAndGetFirstProduct(page, searchTerm) {

  // --- Go to Amazon ---
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
    throw new Error('Search box #twotabsearchtextbox not found after 3 attempts.');
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

  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await delay(2000);

  // --- Extract title from product details page ---
  let title = 'Title not found';
  
  // Try to find the main product title
  const titleSelectors = [
    '#productTitle',                          // Main product title
    'h1 #productTitle',                       // Title inside h1
    'span[id="productTitle"]',                // Alternative span version
    '[data-feature-name="title"] h1',         // Feature name version
    '.a-size-large.product-title',            // Product title class
    '.a-price-range h1 span',                 // In price range section
    'h1.a-size-large span',                   // H1 with size-large
    '.a-section h1 span:first-of-type',       // First span in h1
  ];

  for (const sel of titleSelectors) {
    try {
      const el = page.locator(sel).first();
      const isVisible = await el.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        const extractedTitle = (await el.textContent())?.trim();
        
        // Filter out empty or irrelevant text
        if (extractedTitle && extractedTitle.length > 5 && !extractedTitle.includes('Amazon')) {
          title = extractedTitle;
          console.log(`✅ Found title with selector: ${sel}`);
          console.log(`   Title: ${title}`);
          break;
        }
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  // --- Extract price ---
  let price = 'Price not found';
  const priceSelectors = [
    '.a-price .a-offscreen',                  // Current price
    '.apexPriceToPay .a-offscreen',           // Apex price
    '#corePriceDisplay_desktop_feature_div .a-offscreen',  // Core price
    '#priceblock_ourprice',                   // Our price block
    '#priceblock_dealprice',                  // Deal price block
    '.a-price-whole',                         // Whole price
    '#price_inside_buybox',                   // Buy box price
    '[data-a-color="price"]',                 // Price color attribute
    '.a-span12 .a-price .a-offscreen',        // Price in span
  ];

  for (const sel of priceSelectors) {
    try {
      const el = page.locator(sel).first();
      const isVisible = await el.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        const extractedPrice = (await el.textContent())?.trim();
        if (extractedPrice && extractedPrice !== 'Price not found' && extractedPrice.length > 0) {
          price = extractedPrice;
          console.log(`✅ Found price with selector: ${sel}`);
          console.log(`   Price: ${price}`);
          break;
        }
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  return { title, price };
}

async function addToCart(page) {
  // Wait for page to load
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await delay(1500);

  // Try multiple selectors for "Add to cart" button
  const cartSelectors = [
    '#add-to-cart-button',
    'input[name="submit.add-to-cart"]',
    'button[name="submit.add-to-cart"]',
    '[data-feature-name="a-button"][data-action="a-asin-prime-subscribe"]',
    'button:has-text("Add to cart")',
    'button:has-text("ADD TO CART")',
    '[aria-label*="Add to cart"]',
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
    // Take a screenshot to debug
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
