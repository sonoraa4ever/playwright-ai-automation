import { Stagehand, type ConstructorParams } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
import { AISdkClient } from "./llm_clients/aisdk_client.js";

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

dotenv.config();

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
});

const StagehandConfig: ConstructorParams = {
  verbose: 2 /* Verbosity level for logging: 0 = silent, 1 = info, 2 = all */,
  domSettleTimeoutMs: 30_000 /* Timeout for DOM to settle in milliseconds */,

  // LLM configuration

  llmClient: new AISdkClient({
    model: bedrock("us.anthropic.claude-3-5-sonnet-20241022-v2:0"),
  }),

  // Browser configuration
  env: "LOCAL" /* Environment to run in: LOCAL or BROWSERBASE */,
  apiKey: process.env.BROWSERBASE_API_KEY /* API key for authentication */,
  projectId: process.env.BROWSERBASE_PROJECT_ID /* Project identifier */,
  browserbaseSessionID: undefined /* Session ID for resuming Browserbase sessions */,
  browserbaseSessionCreateParams: {
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings: {
      blockAds: true,
      viewport: {
        width: 1024,
        height: 768,
      },
    },
  },
  localBrowserLaunchOptions: {
    viewport: {
      width: 1024,
      height: 768,
    },
  } /* Configuration options for the local browser */,
  // logInferenceToFile: true,
};

const stagehand = new Stagehand({
  ...StagehandConfig,
});
export { stagehand };
export default StagehandConfig;
