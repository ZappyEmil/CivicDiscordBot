import 'dotenv/config';
import { ActivityType, Client, GatewayIntentBits } from 'discord.js';

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Missing DISCORD_TOKEN environment variable.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
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
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong. Civic bot is online.');
  }
});

client.login(token);
