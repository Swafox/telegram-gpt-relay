import { OpenAI } from "https://deno.land/x/openai@1.3.0/mod.ts";
import { load } from "https://deno.land/std@0.170.0/dotenv/mod.ts";
const configData: Record<string, string> = await load();
const aikey: string = configData["OPENAI_API_KEY"];

const openAI = new OpenAI(aikey);

// deno-lint-ignore no-explicit-any
async function chatCompletion(messages: any[]) {
  const completion = await openAI.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
  });
  return completion;
}

async function createCompletion(prompt: string) {
  const completion = await openAI.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    maxTokens: 150,
    temperature: 0.5,
  });
  return completion;
}

export { chatCompletion, createCompletion };
