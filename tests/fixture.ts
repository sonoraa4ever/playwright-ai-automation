import type { Page } from "@browserbasehq/stagehand";
import { test as base } from "@playwright/test";
import { stagehand } from "../stagehand.config.js";

// Create a test fixture that provides Stagehand page
export const test = base.extend<{
  page: Page;
}>({
  page: async ({}, use) => {
    // Initialize Stagehand
    await stagehand.init();

    // Use the Stagehand page which already extends Playwright's Page
    await use(stagehand.page);

    // Cleanup
    await stagehand.close();
  },
});

export { expect } from "@playwright/test";
