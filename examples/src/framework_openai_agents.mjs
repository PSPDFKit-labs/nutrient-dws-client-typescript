import { NutrientClient } from "@nutrient-sdk/dws-client-typescript";
import { Agent, Runner, tool } from "@openai/agents";

const client = new NutrientClient({
  apiKey: process.env.NUTRIENT_API_KEY ?? "nutr_sk_placeholder",
});

const extractText = tool({
  name: "extract_text",
  description: "Extract text from a document using Nutrient DWS.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string" },
    },
    required: ["path"],
  },
  async execute(input) {
    const result = await client.extractText(input.path);
    return JSON.stringify(result);
  },
});

const agent = new Agent({
  name: "nutrient-openai-agents-typescript",
  instructions: "Use tools to process documents and summarize outcomes.",
  tools: [extractText],
});

async function main() {
  const run = await Runner.run(
    agent,
    "Extract text from ./assets/sample.pdf and summarize key points."
  );
  console.log(run.finalOutput);
}

void main();
