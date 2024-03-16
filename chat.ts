import { OpenAI } from "npm:openai";
import { load } from "https://deno.land/std@0.170.0/dotenv/mod.ts";
const configData: Record<string, string> = await load();
const aikey: string = configData["OPENAI_API_KEY"];

const openAI = new OpenAI({
  baseURL: "http://localhost:11434/v1/",
  apiKey: "ollama",
});

// deno-lint-ignore no-explicit-any
async function chatCompletion(messages: any[]) {
  const completion = await openAI.chat.completions.create({
    model: "llama2",
    messages: messages,
  });
  return completion;
}

async function createCompletion(prompt: string) {
  const completion = await openAI.chat.completions.create({
    model: "llama2",
    messages: [{ role: "system", content: prompt }],
  });
  return completion;
}

export { chatCompletion, createCompletion };
