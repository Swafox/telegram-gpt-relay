import { Bot } from "https://deno.land/x/grammy@v1.15.3/mod.ts";
import { load } from "https://deno.land/std@0.170.0/dotenv/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.31.2/mod.ts";
import { chatCompletion, createCompletion } from "./chat.ts";
import { createTranscription } from "./voice.ts";

// Get the API key from the .env file
const configData: Record<string, string> = await load();
const apiKey: string = configData["TG_AUTH"];
const dbhost: string = configData["DB_HOST"];
const dbuser: string = configData["DB_USERNAME"];
const dbpass: string = configData["DB_PASSWORD"];

// Connect to the database
const client = new MongoClient();
await client.connect(
  `mongodb+srv://${dbuser}:${dbpass}@${dbhost}/?authMechanism=SCRAM-SHA-1`,
);
const db = client.database("gptcluster");
const collection = db.collection("users");

// Initialize the bot
const bot = new Bot(apiKey);
try {
  await bot.init();
  console.log(
    `Bot is running as ${bot.botInfo.first_name} (${bot.botInfo.username})`,
  );
} catch (error) {
  console.log(error);
}

// Start command handler
bot.command("start", async (ctx) => {
  ctx.reply(
    "I am an AI based on GPT-3 language model. \n I can answer your questions and chat with you in any language. \n Type /clear to remove chat context and start a new conversation.",
  );
  const user = await collection.findOne({ _id: ctx.msg.chat.id });
  if (user) {
    ctx.reply("You are already in the database! Welcome back :)");
  } else {
    collection.insertOne({
      _id: ctx.msg.chat.id,
      messages: [],
      usage: 0,
    });
    ctx.reply("Hello! Adding our conversation to the database");
  }
});

// Clear command handler
bot.command("clear", async (ctx) => {
  const user = await collection.findOne({ _id: ctx.msg.chat.id });
  if (user) {
    collection.updateOne(
      { _id: ctx.msg.chat.id },
      { $set: { messages: [] } },
    );
    ctx.reply("Cleared our conversation from the database");
  } else {
    ctx.reply(
      `You are not in the database! Please use /start at ${bot.botInfo.username}`,
    );
  }
});

// Stats command handler
bot.command("stats", async (ctx) => {
  const user = await collection.findOne({ _id: ctx.msg.chat.id });
  if (user) {
    const monetary = (user.usage / 1000) * 0.002;
    ctx.reply(
      `You have used ${user.usage} tokens, which is ${monetary} USD at the current rate of 0.002 USD per 1000 tokens.`,
    );
  } else {
    ctx.reply(
      `You are not in the database! Please use /start at ${bot.botInfo.username}`,
    );
  }
});

// Message handler
bot.on("message:text", async (ctx) => {
  const user = await collection.findOne({ _id: ctx.msg.chat.id });
  if (user) {
    const messages = user.messages;
    messages.push({ role: "user", content: ctx.msg.text });
    collection.updateOne(
      { _id: ctx.msg.chat.id },
      { $set: { messages: messages } },
    );

    const thinking = await ctx.reply("Thinking...");

    const response = await chatCompletion(messages);

    messages.push({
      role: "assistant",
      content: response.choices[0].message?.content as string,
    });
    collection.updateOne(
      { _id: ctx.msg.chat.id },
      {
        $set: { messages: messages },
        $inc: { usage: response.usage.completion_tokens + response.usage.prompt_tokens },
      },
    );

    ctx.api.editMessageText(
      ctx.msg.chat.id,
      thinking.message_id,
      response.choices[0].message?.content as string,
    );
  } else {
    ctx.reply(
      "You are not in the database! Please use /start to add yourself to the database",
    );
  }
});

// Voice message handler
bot.on("message:voice", async (ctx) => {
  const voice = ctx.msg.voice;
  const duration = voice.duration;

  if (duration > 60) {
    ctx.reply("Sorry, I can only transcribe voice messages up to 60 seconds");
  } else {
    const file = await ctx.getFile();
    const path = file.file_path as string;
    const file_path = `https://api.telegram.org/file/bot${apiKey}/${path}`;

    const file_save = await fetch(file_path);

    if (!file_save.ok) {
      throw new Error(`Failed to download file: ${file_save.status} ${file_save.statusText}`);
    }

    const content = await file_save.arrayBuffer();
    const filename = `./tmp/${voice.file_id}.ogg`;
    await Deno.writeFile(filename, new Uint8Array(content));

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const convert = Deno.run({
      cmd: ["./tmp/convert.sh", voice.file_id],
    });

    const mp3Filename = `./tmp/${voice.file_id}.mp3`;

    const message = await createTranscription(mp3Filename);
    ctx.reply(message.text || "Sorry, I couldn't transcribe that");
  }
});

// Inline query handler
bot.on("inline_query", async (ctx) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const response = await createCompletion(ctx.inlineQuery.query);
  ctx.answerInlineQuery([
    {
      type: "article",
      id: "1",
      title: response.choices[0].text as string,
      input_message_content: {
        message_text: response.choices[0].text as string,
      },
    },
  ]);
});

bot.start();
