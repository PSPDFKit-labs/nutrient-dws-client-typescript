import { NutrientClient } from "@nutrient-sdk/dws-client-typescript";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";

const client = new NutrientClient({
  apiKey: process.env.NUTRIENT_API_KEY ?? "nutr_sk_placeholder",
});

const redactEmails = tool(
  async ({ path }) => {
    const response = await client.createRedactionsPreset(path, "email-address", "apply");
    return JSON.stringify(response);
  },
  {
    name: "redact_emails",
    description: "Redact email addresses from a document via Nutrient DWS.",
  }
);

async function main() {
  const model = new ChatOpenAI({
    model: "gpt-4.1-mini",
    apiKey: process.env.OPENAI_API_KEY ?? "sk-placeholder",
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
