import { ObserveResult, Page } from "@browserbasehq/stagehand";
import boxen from "boxen";
import chalk from "chalk";
import fs from "fs/promises";
import { z } from "zod";

export function announce(message: string, title?: string) {
  console.log(
    boxen(message, {
      padding: 1,
      margin: 3,
      title: title || "Stagehand",
    })
  );
}

/**
 * Get an environment variable and throw an error if it's not found
 * @param name - The name of the environment variable
 * @returns The value of the environment variable
 */
export function getEnvVar(name: string, required = true): string | undefined {
  const value = process.env[name];
  if (!value && required) {
    throw new Error(`${name} not found in environment variables`);
  }
  return value;
}

/**
 * Validate a Zod schema against some data
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Whether the data is valid against the schema
 */
export function validateZodSchema(schema: z.ZodTypeAny, data: unknown) {
  try {
    schema.parse(data);
    return true;
  } catch {
    return false;
  }
}

export async function drawObserveOverlay(page: Page, results: ObserveResult[]) {
  // Convert single xpath to array for consistent handling
  const xpathList = results.map((result) => result.selector);

  // Filter out empty xpaths
  const validXpaths = xpathList.filter((xpath) => xpath !== "xpath=");

  await page.evaluate((selectors) => {
    selectors.forEach((selector) => {
      let element;
      if (selector.startsWith("xpath=")) {
        const xpath = selector.substring(6);
        element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      } else {
        element = document.querySelector(selector);
      }

      if (element instanceof HTMLElement) {
        const overlay = document.createElement("div");
        overlay.setAttribute("stagehandObserve", "true");
        const rect = element.getBoundingClientRect();
        overlay.style.position = "absolute";
        overlay.style.left = rect.left + "px";
        overlay.style.top = rect.top + "px";
        overlay.style.width = rect.width + "px";
        overlay.style.height = rect.height + "px";
        overlay.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
        overlay.style.pointerEvents = "none";
        overlay.style.zIndex = "10000";
        document.body.appendChild(overlay);
      }
    });
  }, validXpaths);
}

export async function clearOverlays(page: Page) {
  // remove existing stagehandObserve attributes
  await page.evaluate(() => {
    const elements = document.querySelectorAll('[stagehandObserve="true"]');
    elements.forEach((el) => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent?.insertBefore(el.firstChild, el);
      }
      parent?.removeChild(el);
    });
  });
}

export async function simpleCache(instruction: string, actionToCache: ObserveResult) {
  // Save action to cache.json
  try {
    // Read existing cache if it exists
    let cache: Record<string, ObserveResult> = {};
    try {
      const existingCache = await fs.readFile("cache.json", "utf-8");
      cache = JSON.parse(existingCache);
    } catch (error) {
      // File doesn't exist yet, use empty cache
    }

    // Add new action to cache
    cache[instruction] = actionToCache;

    // Write updated cache to file
    await fs.writeFile("cache.json", JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error(chalk.red("Failed to save to cache:"), error);
  }
}

export async function readCache(instruction: string): Promise<ObserveResult | null> {
  try {
    const existingCache = await fs.readFile("cache.json", "utf-8");
    const cache: Record<string, ObserveResult> = JSON.parse(existingCache);
    return cache[instruction] || null;
  } catch (error) {
    return null;
  }
}

/**
 * This function is used to act with a cacheable action.
 * It will first try to get the action from the cache.
 * If not in cache, it will observe the page and cache the result.
 * Then it will execute the action.
 * @param instruction - The instruction to act with.
 */
// Get the cached value (undefined if it doesn't exist)
export async function getCache<T = ObserveResult>(key: string): Promise<T | undefined> {
  try {
    const cache = await fs.readFile("cache.json", "utf-8");
    const parsed = JSON.parse(cache);
    return parsed[key];
  } catch {
    return undefined;
  }
}

// Set the cache value
export async function setCache<T = ObserveResult>(key: string, value: T): Promise<void> {
  let cache: Record<string, any> = {};
  try {
    const existingCache = await fs.readFile("cache.json", "utf-8");
    cache = JSON.parse(existingCache);
  } catch {
    // File doesn't exist yet, use empty cache
  }
  cache[key] = value;
  await fs.writeFile("cache.json", JSON.stringify(cache, null, 2));
}

// Generate a unique cache key based on prompt and page content
export async function generateCacheKey(page: Page, prompt: string): Promise<string> {
  // Get page URL and title for context
  const url = page.url();
  const title = await page.title();

  // Get a simplified version of page content (first 500 chars of text content)
  const textContent = await page.evaluate(() => {
    const bodyText = document.body?.innerText || "";
    return bodyText.substring(0, 500);
  });

  // Create a simple hash from the content
  const contentHash = Buffer.from(textContent).toString("base64").substring(0, 20);

  // Combine URL, title, content hash, and prompt for unique key
  const key = `${url}|${title}|${contentHash}|${prompt}`;
  return key;
}

// Check the cache, get the action, and run it
// If selfHeal is true, we'll attempt to self-heal if the action fails
export async function observeWithCache(page: Page, key: string, prompt: string, selfHeal = false): Promise<ObserveResult[]> {
  try {
    const cachedObserve = await getCache<ObserveResult[]>(key);
    if (cachedObserve && Array.isArray(cachedObserve)) {
      // Use the cached observe results
      console.log(chalk.green("✓ Using cached observe for:"), prompt);
      
      if (selfHeal) {
        // Verify the cached elements still exist
        try {
          for (const element of cachedObserve) {
            await page.locator(element.selector).waitFor({ state: 'visible', timeout: 2000 });
          }
          return cachedObserve;
        } catch (error) {
          console.log(chalk.yellow("⚠️ Cached elements not found, re-observing..."));
          // Fall through to re-observe
        }
      } else {
        return cachedObserve;
      }
    }
    
    // Get the observe results
    console.log(chalk.yellow("⚡ Observing page for:"), prompt);
    const results = await page.observe(prompt);
    // Cache the results
    await setCache<ObserveResult[]>(key, results);
    console.log(chalk.blue("💾 Observe results cached with key:"), key);
    return results;
  } catch (error) {
    console.error(chalk.red("✗ Observe failed:"), error);
    throw error;
  }
}

export async function actWithCache(page: Page, key: string, prompt: string, selfHeal = false): Promise<void> {
  try {
    const cachedAction = await getCache(key);

    let action: ObserveResult;
    if (cachedAction) {
      // Use the cached action
      console.log(chalk.green("✓ Using cached action for:"), prompt);
      action = cachedAction;
    } else {
      // Get the observe result (the action)
      console.log(chalk.yellow("⚡ Observing page for:"), prompt);
      const results = await page.observe(prompt);
      action = results[0];

      // Cache the action
      await setCache(key, action);
      console.log(chalk.blue("💾 Action cached with key:"), key.substring(0, 50) + "...");
    }

    // Run the action (no LLM inference)
    await page.act(action);
  } catch (e) {
    console.error(chalk.red("❌ Action failed:"), e);
    // in selfHeal mode, we'll retry the action
    if (selfHeal) {
      console.log(chalk.yellow("🔧 Attempting to self-heal..."));
      await page.act({ action: prompt });
    } else {
      throw e;
    }
  }
}

// Advanced caching with automatic key generation
export async function actWithAdvancedCache(
  page: Page,
  prompt: string,
  options?: {
    selfHeal?: boolean;
    customKey?: string;
  }
): Promise<void> {
  const key = options?.customKey || (await generateCacheKey(page, prompt));
  await actWithCache(page, key, prompt, options?.selfHeal);
}
