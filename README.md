# 🤘 Welcome to Stagehand! + Playwright!

Hey! This is a project built with [Stagehand](https://github.com/browserbase/stagehand).

You can build your own web agent using: `npx create-browser-app`!

## Setting the Stage

Stagehand is an SDK for automating browsers. It's built on top of [Playwright](https://playwright.dev/) and provides a higher-level API for better debugging and AI fail-safes.

## Curtain Call

Get ready for a show-stopping development experience. Just run:

```bash
yarn install && yarn start
```

## What's Next?

### Add your API keys

Required API keys/environment variables are in the `.env.example` file. Copy it to `.env` and add your API keys.

```bash
cp .env.example .env && nano .env # Add your API keys to .env
```

### Custom .cursorrules

We have custom .cursorrules for this project. It'll help quite a bit with writing Stagehand easily.

### Available Scripts

```bash
# Development
yarn start          # Run the main script (index.ts)
yarn dev           # Run with auto-reload on file changes
yarn build         # Compile TypeScript to JavaScript

# Testing
yarn test          # Run Playwright tests
yarn test:ui       # Run tests with interactive UI
yarn test:debug    # Run tests in debug mode
yarn test:headed   # Run tests with visible browser
yarn test:report   # Show test report

# Code Quality
yarn lint          # Check TypeScript types
yarn typecheck     # Same as lint

# Maintenance
yarn clean         # Remove dist and cache.json
yarn clean:cache   # Remove only cache.json
```

### Run on Browserbase

To run on Browserbase, add your API keys to .env and change `env: "LOCAL"` to `env: "BROWSERBASE"` in [stagehand.config.ts](stagehand.config.ts).

### Use AWS Bedrock with Claude 3.5 Sonnet v2

This project is configured to use AWS Bedrock with Claude 3.5 Sonnet v2 by default. The configuration in [stagehand.config.ts](stagehand.config.ts) uses:

- Model: `us.anthropic.claude-3-5-sonnet-20241022-v2:0`
- Provider: AWS Bedrock

Make sure to add your AWS credentials to .env:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` (optional)

## Caching

Stagehand includes a built-in caching system to optimize browser automation by storing and reusing observation results and actions. This significantly reduces API calls and speeds up repeated operations.

### How Caching Works

The caching system stores browser observation results and actions in a local `cache.json` file. When you perform the same operation on similar page content, Stagehand can reuse cached results instead of making new LLM calls.

### Available Caching Functions

**Basic Cache Operations:**

- `getCache<T>(key: string)` - Retrieve a cached value by key
- `setCache<T>(key: string, value: T)` - Store a value in the cache
- `readCache(instruction: string)` - Read a specific cached observation result
- `simpleCache(instruction: string, actionToCache: ObserveResult)` - Store an observation result

**Advanced Caching with Automatic Key Generation:**

- `generateCacheKey(page: Page, prompt: string)` - Creates a unique cache key based on page URL, title, content, and prompt
- `observeWithCache(page: Page, key: string, prompt: string, selfHeal?: boolean)` - Observe with caching support
- `actWithCache(page: Page, key: string, prompt: string, selfHeal?: boolean)` - Act with caching support
- `actWithAdvancedCache(page: Page, prompt: string, options?)` - Act with automatic cache key generation

### Usage Examples

```typescript
import { actWithAdvancedCache, observeWithCache, generateCacheKey } from "./utils";

// Use advanced caching with automatic key generation
await actWithAdvancedCache(page, "Click the login button", {
  selfHeal: true, // Automatically retry if cached element not found
});

// Manual caching with custom keys
const cacheKey = await generateCacheKey(page, "Find search box");
const searchResults = await observeWithCache(page, cacheKey, "Find search box", true);

// Use cached observation to perform action
await actWithCache(page, cacheKey, "Type in search box", true);
```

### Self-Healing Mode

When `selfHeal` is enabled, the caching system will:

- Verify cached elements still exist on the page
- Automatically re-observe if cached elements are not found
- Retry actions using fresh observations if cached actions fail

This makes your automation more resilient to minor page changes.

### Cache File Location

The cache is stored in `cache.json` in your project root. You can:

- Delete this file to clear all cached data
- Add it to `.gitignore` to avoid committing cached data
- Share it across team members for consistent automation behavior

### Real-World Example: Caching in Action

Here's what caching looks like during actual test execution:

```bash
[2025-08-22 10:34:43.897 +0700] INFO: local browser started successfully.
    category: "init"

✓ Using cached action for: Click on "Select token"
[2025-08-22 10:34:48.643 +0700] INFO: Performing act from an ObserveResult
    category: "action"
    observeResult: {
        "description": "Button to select a token for trading",
        "method": "click",
        "arguments": [],
        "selector": "xpath=/html[1]/body[1]/div[1]/span[1]/div[1]/div[1]/div[2]/div[4]/div[1]/div[1]/div[1]/div[2]/div[1]/div[1]/div[2]/div[1]/div[1]/div[3]/div[1]/div[1]/div[2]/div[2]/div[1]"
    }

[2025-08-22 10:34:50.316 +0700] INFO: click complete
    category: "action"
    newOpenedTab: "no new tabs opened"

✓ Using cached action for: Click on "USDC"
[2025-08-22 10:34:51.373 +0700] INFO: Performing act from an ObserveResult
    category: "action"
    observeResult: {
        "description": "USDC token selection button",
        "method": "click",
        "arguments": [],
        "selector": "xpath=/html[1]/body[1]/div[4]/span[1]/span[1]/div[1]/div[2]/div[1]/div[1]/dialog[1]/div[1]/div[3]/div[1]/div[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[1]/div[1]/div[1]/div[2]/div[1]"
    }

✓ Using cached action for: Enter "0.1" ETH
[2025-08-22 10:34:54.486 +0700] INFO: Performing act from an ObserveResult
    category: "action"
```

### How It Works

1. **First Run**: When Stagehand encounters a new action (e.g., "Click on Select token"), it:

   - Uses AI to observe and identify the element on the page
   - Stores the observation result (selector, description, method) in `cache.json`
   - Executes the action

2. **Subsequent Runs**: When the same action is requested:

   - The green checkmark (✓) indicates a cache hit: `Using cached action for:`
   - Stagehand retrieves the stored selector from cache
   - Skips the AI observation step (no LLM API call)
   - Directly executes the action using the cached selector

3. **Benefits**:

   - **Speed**: Cached actions execute instantly without AI processing
   - **Cost**: Reduces API calls to your LLM provider
   - **Consistency**: Same elements are targeted across test runs
   - **Debugging**: Cached selectors are visible in logs for troubleshooting

4. **Self-Healing**: If a cached element is not found (page structure changed), the system can:
   - Automatically fall back to fresh AI observation
   - Update the cache with new selectors
   - Continue test execution without manual intervention

## Using @ai-sdk/amazon-bedrock

This project uses the Vercel AI SDK with Amazon Bedrock provider for flexible LLM integration. The configuration is set up in `llm_clients/aisdk_client.ts` and `stagehand.config.ts`.

### Key Features:

- **Model**: Claude 3.5 Sonnet v2 (`us.anthropic.claude-3-5-sonnet-20241022-v2:0`)
- **Provider**: Amazon Bedrock via @ai-sdk/amazon-bedrock
- **Flexibility**: Easy to switch between different AI providers (OpenAI, Anthropic, etc.)

### Configuration Example:

```typescript
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN, // optional
});
```

## Using @playwright/test

While this project primarily uses Stagehand's high-level API, you can also integrate @playwright/test for more advanced testing scenarios.

### Installation:

```bash
yarn add -D @playwright/test
```

### Example Test:

```typescript
import { test, expect } from "@playwright/test";
import { Stagehand } from "@browserbasehq/stagehand";

test("automated login test", async ({ page }) => {
  const stagehand = new Stagehand({
    page,
    env: "LOCAL",
  });

  await stagehand.init();

  // Use Stagehand's AI-powered actions
  await page.act("Click the login button");
  await page.act("Enter username: test@example.com");

  // Mix with standard Playwright assertions
  await expect(page).toHaveURL(/dashboard/);

  await stagehand.close();
});
```

### Running Tests:

```bash
yarn playwright test
```

This combination gives you the best of both worlds: AI-powered browser automation with Stagehand and robust testing capabilities with Playwright Test.
