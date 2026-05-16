# CivicDiscordBot

Always-online Discord slash-command controller for the civic webhook projects.

## What it does

CivicDiscordBot connects to Discord with a bot token and registers server slash commands for checking status, testing Discord webhooks, and manually triggering the GitHub Actions workflows in the `Political` and `NavJobBotDisc` repositories.

It does not store data, add authentication, or replace the webhook projects. It is only a small Discord control surface.

## Project layout

```txt
src/index.js              Main Discord bot process
src/register-commands.js  Manual slash-command registration helper
.env.example              Local environment template with placeholders only
package.json              npm scripts and dependencies
```

## Required secrets

Copy `.env.example` to `.env` for local use. Do not commit `.env`.

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id
GUILD_ID=your_discord_server_id
GITHUB_TOKEN=your_github_personal_access_token
POLITICAL_WEBHOOK_URL=https://discord.com/api/webhooks/your_political_webhook_id/your_political_webhook_token
JOBS_WEBHOOK_URL=https://discord.com/api/webhooks/your_jobs_webhook_id/your_jobs_webhook_token
```

`DISCORD_TOKEN`, `GITHUB_TOKEN`, and webhook URLs are secrets. Keep real values in `.env` locally or in your hosting provider's secret manager.

## Windows PowerShell setup

Run these commands from the repository folder:

```powershell
node --version
npm --version
Copy-Item .env.example .env
notepad .env
npm install
npm run build
npm run register
npm start
```

`npm run build` is a syntax check for this JavaScript project. It does not create a `dist` folder.

## Commands

The bot registers these Discord slash commands:

```txt
/ping
/status
/test-politics-webhook
/test-jobs-webhook
/run-politics
/run-jobs backfill:<true|false> max-posts:<1-50>
```

## GitHub workflow targets

Defaults are set in `.env.example`:

```env
POLITICAL_REPO_OWNER=ZappyEmil
POLITICAL_REPO_NAME=Political
POLITICAL_WORKFLOW_ID=briefing.yml
JOBS_REPO_OWNER=ZappyEmil
JOBS_REPO_NAME=NavJobBotDisc
JOBS_WORKFLOW_ID=nav-sync.yml
```

The GitHub token must have permission to dispatch workflows in those repositories.

## Notes

This project uses `discord.js` and a Discord bot token. The `Political` and `NavJobBotDisc` projects use Discord webhooks. Keep those concepts separate: bot token for slash commands, webhook URLs for posting messages into channels.
