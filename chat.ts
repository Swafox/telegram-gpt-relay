import { OpenAI } from "npm:openai";
import { load } from "https://deno.land/std@0.170.0/dotenv/mod.ts";

const configData: Record<string, string> = await load();
const aikey: string = configData["OPENAI_API_KEY"];

function createOpenAIClient(model: string) {
  if (model.startsWith("llama")) {
    return new OpenAI({
      baseURL: "http://localhost:11434/v1/",
      apiKey: "ollama",
    });
  } else {
    return new OpenAI({
      apiKey: aikey,
    });
  }
}

async function chatCompletion(messages: any[], model: string = "llama2") {
  const openAI = createOpenAIClient(model);
  const completion = await openAI.chat.completions.create({
    model: model,
    messages: messages,
  });
  return completion;
}

async function createCompletion(prompt: string, model: string = "llama2") {
  const openAI = createOpenAIClient(model);
  const completion = await openAI.chat.completions.create({
    model: model,
    messages: [{ role: "system", content: prompt }],
  });
  return completion;
}

export { chatCompletion, createCompletion };
