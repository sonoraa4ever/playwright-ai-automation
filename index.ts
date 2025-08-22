import { BrowserContext, Page, Stagehand } from "@browserbasehq/stagehand";
import chalk from "chalk";
import StagehandConfig from "./stagehand.config.js";
import { actWithAdvancedCache, actWithCache } from "./utils.js";

/**
 * 🤘 Welcome to Stagehand! Thanks so much for trying us out!
 * 🛠️ CONFIGURATION: stagehand.config.ts will help you configure Stagehand
 *
 * 📝 Check out our docs for more fun use cases, like building agents
 * https://docs.stagehand.dev/
 *
 * 💬 If you have any feedback, reach out to us on Slack!
 * https://stagehand.dev/slack
 *
 * 📚 You might also benefit from the docs for Zod, Browserbase, and Playwright:
 * - https://zod.dev/
 * - https://docs.browserbase.com/
 * - https://playwright.dev/docs/intro
 */
async function main({
  page,
  context,
  stagehand,
}: {
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {
  const prompt = 'Click on "Select token"';
  const key = prompt;
  await actWithCache(page, key, prompt, true);

  const prompt1 = 'Click on "USDC"';
  const simpleKey = prompt1; // Simple cache key
  await actWithCache(page, simpleKey, prompt1, true); // selfHeal enabled

  // Example 3: Advanced caching with custom key
  const customKey = `swap-page-${Date.now()}`; // Unique key with timestamp
  await actWithAdvancedCache(page, 'Enter "0.1" ETH', {
    selfHeal: false,
    customKey: customKey,
  });
}

/**
 * This is the main function that runs when you do npm run start
 *
 * YOU PROBABLY DON'T NEED TO MODIFY ANYTHING BELOW THIS POINT!
 *
 */
async function run() {
  const stagehand = new Stagehand({
    ...StagehandConfig,
  });
  await stagehand.init();

  const page = stagehand.page;

  await page.goto("https://app.uniswap.org/swap");

  const context = stagehand.context;

  await main({
    page,
    context,
    stagehand,
  });
  // await stagehand.close();
  console.log(stagehand.metrics);
  stagehand.log({
    category: "create-browser-app",
    message: `\n🤘 Thanks so much for using Stagehand! Reach out to us on Slack if you have any feedback: ${chalk.blue(
      "https://stagehand.dev/slack"
    )}\n`,
  });
}

run();
