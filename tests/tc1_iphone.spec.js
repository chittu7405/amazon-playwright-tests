/**
 * Test Case 1
 * Navigate to Amazon, search for an iPhone, add it to the cart,
 * and print the device price to the console.
 */

const { test, expect } = require('@playwright/test');
const { searchAndGetFirstProduct, addToCart } = require('../utils/amazonHelper');

test('TC1 - Search iPhone, add to cart, print price', async ({ page }) => {
  console.log('\n========================================');
  console.log('TEST CASE 1: iPhone');
  console.log('========================================');

  // Step 1: Search for iPhone and get product info
  const { title, price } = await searchAndGetFirstProduct(page, 'iPhone');

  console.log(`\n📱 Product Found : ${title}`);
  console.log(`💰 Device Price  : ${price}`);

  // Step 2: Validate a price was found
  expect(price).not.toBe('Price not found');

  // Step 3: Add to cart
  await addToCart(page);
  console.log('🛒 Status        : Successfully added to cart');

  // Step 4: Verify cart count updated
  const cartCount = page.locator('#nav-cart-count');
  await expect(cartCount).not.toHaveText('0', { timeout: 8000 });

  console.log('✅ Test Case 1 PASSED');
  console.log('========================================\n');
});
