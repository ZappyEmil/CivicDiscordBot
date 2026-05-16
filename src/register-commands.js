import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID environment variable.');
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check whether the civic bot is online.'),
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show CivicBot, GitHub, and webhook configuration status.'),
  new SlashCommandBuilder()
    .setName('test-politics-webhook')
    .setDescription('Send a test post through the Political Discord webhook.'),
  new SlashCommandBuilder()
    .setName('test-jobs-webhook')
    .setDescription('Send a test post through the NAV jobs Discord webhook.'),
  new SlashCommandBuilder()
    .setName('run-politics')
    .setDescription('Trigger the Political briefing GitHub Actions workflow.'),
  new SlashCommandBuilder()
    .setName('run-jobs')
    .setDescription('Trigger the NAV jobs GitHub Actions workflow.')
    .addBooleanOption((option) =>
      option
        .setName('backfill')
        .setDescription('Run the NAV sync in backfill mode.')
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName('max-posts')
        .setDescription('Maximum jobs to post during this run.')
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(false)
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
console.log(`Registered ${commands.length} slash commands.`);
