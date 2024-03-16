# Telegram GPT Relay

Enables the use of Chat-GPT on Telegram. With database support for multiple
users, bot has context for each user and can continue conversations in a
chat-like manner.

Built using [Deno](https://deno.land/), [grammY](https://grammy.dev/), [OpenAI](https://openai.com/) and [Ollama](https://ollama.com/).

All chat completions are done using Ollama 7B. OpenAI is only used for voice to text conversion.

## Setup

- Install [Deno](https://deno.land/)
- Install [FFmpeg](https://ffmpeg.org/)
- Install [Ollama](https://ollama.com/)

```zsh
git clone https://github.com/Swafox/telegram-gpt-relay.git
cd telegram-gpt-relay
cp .env.example .env # Fill in the environment variables
ollama pull llama2
ollama run llama2
deno task run
```

### Environment Variables

Fill in the following environment variables in the `.env` file after running
`cp .env.example .env`:

**TG_AUTH** - Generate via [@BotFather](https://t.me/BotFather)

**DB_HOST** - Hostname of your [MongoDB Atlas](https://cloud.mongodb.com/)
instance

**DB_USERNAME** - Username for a user with read/write access

**DB_PASSWORD** - Password for the user

**OPENAI_API_KEY** - [API key](https://platform.openai.com/account/api-keys) for
OpenAI

## Usage

### Telegram Commands

**/start** - Starts the bot and adds user to the database.

**/clear** - Clears the user's chat history and drops context.
