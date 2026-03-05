import "dotenv/config";
import { NutrientClient } from "@nutrient-sdk/dws-client-typescript";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const nutrientApiKey = process.env.NUTRIENT_API_KEY;
if (!nutrientApiKey) {
  throw new Error("Missing NUTRIENT_API_KEY. Add it to examples/.env before running.");
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY. Add it to examples/.env before running.");
}

const client = new NutrientClient({
  apiKey: nutrientApiKey,
});

const redactEmails = tool(
  async ({ path }) => {
    const response = await client.createRedactionsPreset(path, "email-address", "apply");
    return JSON.stringify(response);
  },
  {
    name: "redact_emails",
    description: "Redact email addresses from a document via Nutrient DWS.",
    schema: z.object({
      path: z.string().describe("Local path to the input PDF file."),
    }),
  }
);

async function main() {
  const model = new ChatOpenAI({
    model: "gpt-4.1-mini",
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await model.bindTools([redactEmails]).invoke(
    "Redact email addresses from ./assets/sample.pdf and summarize next steps."
  );

  if (response.tool_calls?.length) {
    for (const call of response.tool_calls) {
      if (call.name === "redact_emails") {
        const args =
          typeof call.args === "object" && call.args !== null ? call.args : {};
        const toolResult = await redactEmails.invoke(args);
        console.log(toolResult);
        return;
      }
    }
  }

  console.log(response.content);
}

void main();
