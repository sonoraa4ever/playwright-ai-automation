import { actWithCache, observeWithCache } from "../utils.js";
import { expect, test } from "./fixture";

test.describe("Swap Page Tests with Stagehand", () => {
  test("should complete a token swap flow", async ({ page }) => {
    test.setTimeout(60000); // Increase timeout to 60 seconds
    // Navigate to swap page
    await page.goto("/swap");

    // Select token using cache
    await actWithCache(page, "select-token", 'Click on "Select token"', true);

    // Wait for token list to appear
    // await page.waitForTimeout(1000);

    // Select USDC
    await actWithCache(page, "select-usdc", 'Click on "USDC"', true);

    // Enter amount
    await actWithCache(page, "enter-1-eth", 'Enter "0.1" ETH', true);

    // note: Action not use cached, so we can use the prompt directly
    // await page.act('Enter "0.1" ETH');

    // Wait a moment for the exchange rate to calculate
    await page.waitForTimeout(2000);

    // Try to observe the exchange rate with caching and self-healing
    const exchangeRateElements = await observeWithCache(
      page,
      "exchange-rate-display",
      'Exchange rate showing "1 USDC = " followed by a number and "ETH"',
      true // Enable self-healing
    );

    // Verify at least one element was found
    expect(exchangeRateElements.length).toBeGreaterThan(0);

    // Get the text content
    const exchangeRateText = await page.textContent(exchangeRateElements[0].selector);
    console.log("Found exchange rate:", exchangeRateText);
    expect(exchangeRateText).toMatch(/1 USDC = \d+\.\d+ ETH/);
  });
});
