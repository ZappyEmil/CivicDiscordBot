import 'dotenv/config';
import {
  ActivityType,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token) {
  console.error('Missing DISCORD_TOKEN environment variable.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function registerCommands() {
  if (!clientId || !guildId) {
    console.warn('Skipping slash command registration. Missing CLIENT_ID or GUILD_ID.');
    return;
  }

  const commands = [
    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Check whether the civic bot is online.')
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log('Registered slash commands for this server.');
}

client.once('clientReady', async () => {
  console.log(`Online as ${client.user.tag}`);

  client.user.setPresence({
    activities: [
      {
        name: 'Norwegian politics',
        type: ActivityType.Watching,
      },
    ],
    status: 'online',
  });

  try {
    await registerCommands();
  } catch (error) {
    console.error('Failed to register slash commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong. Civic bot is online.');
  }
});

client.login(token);
