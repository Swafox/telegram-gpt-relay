import { OpenAI } from "https://deno.land/x/openai@1.3.0/mod.ts";
import { load } from "https://deno.land/std@0.170.0/dotenv/mod.ts";
const configData: Record<string, string> = await load();
const aikey: string = configData["OPENAI_API_KEY"];

const openAI = new OpenAI(aikey);

async function createTranscription(file: string) {
    const response = await openAI.createTranscription({
        file: file,
        model: "whisper-1",
    });
    return response;
}

export { createTranscription };
