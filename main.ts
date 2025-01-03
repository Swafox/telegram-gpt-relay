import { Bot } from "https://deno.land/x/grammy@v1.15.3/mod.ts";
import { load } from "https://deno.land/std@0.170.0/dotenv/mod.ts";
import { chatCompletion, createCompletion } from "./chat.ts";
import { createTranscription } from "./voice.ts";
import { availableModels } from "./availablemodels.ts";

const configData: Record<string, string> = await load();
const apiKey: string = configData["TG_AUTH"];

const kv = await Deno.openKv();

const bot = new Bot(apiKey);
try {
  await bot.init();
  console.log(
    `Bot is running as ${bot.botInfo.first_name} (${bot.botInfo.username})`
  );
} catch (error) {
  console.log(error);
}

bot.command("start", async (ctx) => {
  ctx.reply(
    "I am an AI assistant. \n I can answer your questions and chat with you in any language. Send me messages, channel posts or even voice messages. \n Type /clear to remove chat context and start a new conversation."
  );

  const user = await kv.get(["users", ctx.msg.chat.id]);
  if (user.value) {
    ctx.reply("You are already in the database! Welcome back :)");
  } else {
    await kv.set(["users", ctx.msg.chat.id], {
      messages: [],
      usage: 0,
      model: "gpt-4o-mini",
    });
    ctx.reply("Hello! Adding our conversation to the database");
  }
});

bot.command("clear", async (ctx) => {
  const user = await kv.get(["users", ctx.msg.chat.id]);
  if (user.value) {
    await kv.set(["users", ctx.msg.chat.id], {
      ...user.value,
      messages: [],
    });
    ctx.reply("Cleared our conversation from the database");
  } else {
    ctx.reply(
      `You are not in the database! Please use /start at ${bot.botInfo.username}`
    );
  }
});

bot.command("stats", async (ctx) => {
  const user = await kv.get(["users", ctx.msg.chat.id]);
  if (user.value) {
    const messages = user.value.messages;
    let totalCost = 0;

    messages.forEach((msg: any) => {
      const model = msg.model || "llama2";

      if (model.startsWith("llama")) {
        return;
      }

      const tokens = msg.tokens || 0;

      const pricing: Record<string, { input: number; output: number }> = {
        "gpt-4o": { input: 0.0025, output: 0.01 },
        "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
        "gpt-o1": { input: 0.015, output: 0.06 },
        "gpt-o1-mini": { input: 0.003, output: 0.012 },
      };

      if (pricing[model]) {
        const { input, output } = pricing[model];
        totalCost += (tokens / 1000) * (msg.role === "user" ? input : output);
      }
    });

    ctx.reply(
      `You have used ${user.value.usage} tokens.\n` +
        `Estimated cost: $${totalCost.toFixed(4)} USD\n` +
        `Note: Llama models are free and not included in the cost calculation.`
    );
  } else {
    ctx.reply(
      `You are not in the database! Please use /start at ${bot.botInfo.username}`
    );
  }
});

bot.command("model", async (ctx) => {
  const user = await kv.get(["users", ctx.msg.chat.id]);
  if (!user.value) {
    ctx.reply(
      `You are not in the database! Please use /start at ${bot.botInfo.username}`
    );
    return;
  }

  const requestedModel = ctx.msg.text.split(" ")[1];
  const currentModel = user.value.model || "llama2";

  if (!requestedModel) {
    const modelList = availableModels.join("\n");
    ctx.reply(
      `Current model: ${currentModel}\n\nAvailable models:\n${modelList}\n\nTo change model, send /model <model_name>`
    );
    return;
  }

  if (availableModels.includes(requestedModel)) {
    await kv.set(["users", ctx.msg.chat.id], {
      ...user.value,
      model: requestedModel,
    });
    ctx.reply(`Model changed to: ${requestedModel}`);
  } else {
    ctx.reply("Invalid model name. Please choose from the list above.");
  }
});

bot.on("message:text", async (ctx) => {
  const user = await kv.get(["users", ctx.msg.chat.id]);
  if (user.value) {
    const messages = user.value.messages;
    const userModel = user.value.model || "llama2";

    await kv.set(["users", ctx.msg.chat.id], {
      ...user.value,
      messages: messages,
    });

    const thinking = await ctx.reply("Thinking...");

    const response = await chatCompletion(messages, userModel);

    messages.push({
      role: "assistant",
      content: response.choices[0].message?.content as string,
    });

    await kv.set(["users", ctx.msg.chat.id], {
      ...user.value,
      messages: messages,
      usage:
        user.value.usage +
        (response.usage?.completion_tokens ?? 0) +
        (response.usage?.prompt_tokens ?? 0),
    });

    ctx.api.editMessageText(
      ctx.msg.chat.id,
      thinking.message_id,
      response.choices[0].message?.content as string
    );
  } else {
    ctx.reply(
      "You are not in the database! Please use /start to add yourself to the database"
    );
  }
});

bot.on("message:voice", async (ctx) => {
  const user = await kv.get(["users", ctx.msg.chat.id]);
  if (user.value) {
    const voice = ctx.msg.voice;
    const duration = voice.duration;

    if (duration > 300) {
      ctx.reply("Sorry, I can only transcribe voice messages up to 5 minutes");
    } else {
      const file = await ctx.getFile();
      const path = file.file_path as string;
      const file_path = `https://api.telegram.org/file/bot${apiKey}/${path}`;

      const file_save = await fetch(file_path);

      if (!file_save.ok) {
        throw new Error(
          `Failed to download file: ${file_save.status} ${file_save.statusText}`
        );
      }

      const content = await file_save.arrayBuffer();
      const filename = `./tmp/${voice.file_id}.ogg`;
      const mp3Filename = `./tmp/${voice.file_id}.mp3`;
      await Deno.writeFile(filename, new Uint8Array(content));

      await sh(`ffmpeg -i ${filename} ${mp3Filename}`);

      const message = await createTranscription(mp3Filename);
      ctx.reply(message.text || "Sorry, I couldn't transcribe that");

      const tokens = Math.ceil(duration / 60) * 6;
      await kv.set(["users", ctx.msg.chat.id], {
        ...user.value,
        usage: user.value.usage + tokens,
      });

      await Deno.remove(filename);
      await Deno.remove(mp3Filename);
    }
  } else {
    ctx.reply(
      "You are not in the database! Please use /start to add yourself to the database"
    );
  }
});

bot.on("inline_query", async (ctx) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const response = await createCompletion(ctx.inlineQuery.query);
  ctx.answerInlineQuery([
    {
      type: "article",
      id: "1",
      title: response.choices[0].message?.content as string,
      input_message_content: {
        message_text: response.choices[0].message?.content as string,
      },
    },
  ]);
});

bot.start();
