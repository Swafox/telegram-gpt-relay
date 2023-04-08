import { Configuration, OpenAIApi } from "npm:openai";
import { load } from "https://deno.land/std@0.170.0/dotenv/mod.ts";
const configData: Record<string, string> = await load();
const aikey: string = configData["OPENAI_API_KEY"];

const configuration = new Configuration({
    apiKey: aikey,
});
const openai = new OpenAIApi(configuration);

export default async function chatCompletion(messages: any[]) {
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: messages,
    });
    return completion.data.choices[0].message?.content;
}
