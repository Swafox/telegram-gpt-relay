import { Bot } from "https://deno.land/x/grammy@v1.15.3/mod.ts";
import { load } from "https://deno.land/std@0.170.0/dotenv/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo@v0.31.2/mod.ts";
import { chatCompletion, createCompletion } from "./chat.ts";

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
  console.log(`Bot is running as ${bot.botInfo.first_name} (${bot.botInfo.username})`);
} catch (error) {
  console.log(error);
}

// Start command handler
bot.command("start", async (ctx) => {
  ctx.reply("Hello! I am a GPT-3 bot. I can answer your questions and help you with your tasks. I will be adding our conversation to the database.");

  // Check if the user is already in the database
  const user = await collection.findOne({ _id: ctx.msg.chat.id });
  if (user) {
    ctx.reply("You are already in the database! Welcome back :)");
  } else {
    collection.insertOne({
      _id: ctx.msg.chat.id,
      messages: [],
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
    ctx.reply("You are not in the database! Please use /start to add yourself to the database");
  }
});

// Message handler
bot.on("message", async (ctx) => {
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

    messages.push({ role: "assistant", content: response });
    collection.updateOne(
      { _id: ctx.msg.chat.id },
      { $set: { messages: messages } },
    );

    ctx.api.editMessageText(ctx.msg.chat.id, thinking.message_id, response as string);
  } else {
    ctx.reply("You are not in the database! Please use /start to add yourself to the database");
  }
});

// Inline query handler
bot.on("inline_query", async (ctx) => {
  if (ctx.inlineQuery.query.includes("!!")) {
    ctx.inlineQuery.query = ctx.inlineQuery.query.replace("!!", "");
    const response = await createCompletion(ctx.inlineQuery.query);

    ctx.answerInlineQuery([
      {
        type: "article",
        id: "1",
        title: response as string,
        input_message_content: {
          message_text: response as string,
        },
      },
    ]);
  }
});

bot.start();
