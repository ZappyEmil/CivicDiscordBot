import 'dotenv/config';
import {
  ActivityType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const githubToken = process.env.GITHUB_TOKEN;

const repos = {
  political: {
    label: 'Political briefing',
    owner: process.env.POLITICAL_REPO_OWNER ?? 'ZappyEmil',
    repo: process.env.POLITICAL_REPO_NAME ?? 'Political',
    workflow: process.env.POLITICAL_WORKFLOW_ID ?? 'briefing.yml',
    webhookUrl: process.env.POLITICAL_WEBHOOK_URL,
  },
  jobs: {
    label: 'NAV jobs',
    owner: process.env.JOBS_REPO_OWNER ?? 'ZappyEmil',
    repo: process.env.JOBS_REPO_NAME ?? 'NavJobBotDisc',
    workflow: process.env.JOBS_WORKFLOW_ID ?? 'nav-sync.yml',
    webhookUrl: process.env.JOBS_WEBHOOK_URL,
  },
};

if (!token) {
  console.error('Missing DISCORD_TOKEN environment variable.');
  process.exit(1);
}

const startedAt = Date.now();
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function configured(value) {
  return value ? 'configured' : 'missing';
}

function repoPath(config) {
  return `${config.owner}/${config.repo}`;
}

function githubHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${githubToken}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function dispatchWorkflow(config, inputs = {}) {
  if (!githubToken) {
    throw new Error('GITHUB_TOKEN is missing.');
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflow}/dispatches`;
  const response = await fetch(url, {
    method: 'POST',
    headers: githubHeaders(),
    body: JSON.stringify({ ref: 'main', inputs }),
  });

  if (response.status === 204) return;

  const body = await response.text().catch(() => '');
  throw new Error(`GitHub workflow dispatch failed: ${response.status} ${response.statusText} ${body}`);
}

async function postWebhook(config, message) {
  if (!config.webhookUrl) {
    throw new Error(`${config.label} webhook URL is missing.`);
  }

  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'CivicBot Control',
      embeds: [
        {
          title: `${config.label} webhook test`,
          description: message,
          color: 0x5865f2,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Discord webhook failed: ${response.status} ${response.statusText} ${body}`);
  }
}

function commandDefinitions() {
  return [
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
}

async function registerCommands() {
  if (!clientId || !guildId) {
    console.warn('Skipping slash command registration. Missing CLIENT_ID or GUILD_ID.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commandDefinitions(),
  });
  console.log('Registered slash commands for this server.');
}

async function handleStatus(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('CivicBot Status')
    .setColor(0x2ecc71)
    .addFields(
      { name: 'Bot', value: `online for ${formatDuration(Date.now() - startedAt)}`, inline: false },
      { name: 'GitHub token', value: configured(githubToken), inline: true },
      { name: 'Political repo', value: `${repoPath(repos.political)} / ${repos.political.workflow}`, inline: false },
      { name: 'Political webhook', value: configured(repos.political.webhookUrl), inline: true },
      { name: 'Jobs repo', value: `${repoPath(repos.jobs)} / ${repos.jobs.workflow}`, inline: false },
      { name: 'Jobs webhook', value: configured(repos.jobs.webhookUrl), inline: true }
    )
    .setTimestamp(new Date());

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleWebhookTest(interaction, config) {
  await interaction.deferReply({ ephemeral: true });
  await postWebhook(config, `Test sent by ${interaction.user.tag} from /${interaction.commandName}.`);
  await interaction.editReply(`${config.label} webhook test sent.`);
}

async function handleRunPolitics(interaction) {
  await interaction.deferReply({ ephemeral: true });
  await dispatchWorkflow(repos.political);
  await interaction.editReply(`Triggered ${repos.political.label} workflow in ${repoPath(repos.political)}.`);
}

async function handleRunJobs(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const backfill = interaction.options.getBoolean('backfill') ?? false;
  const maxPosts = interaction.options.getInteger('max-posts') ?? 10;

  await dispatchWorkflow(repos.jobs, {
    backfill: String(backfill),
    max_posts: String(maxPosts),
  });

  await interaction.editReply(
    `Triggered ${repos.jobs.label} workflow in ${repoPath(repos.jobs)}. backfill=${backfill}, max_posts=${maxPosts}.`
  );
}

client.once('clientReady', async () => {
  console.log(`Online as ${client.user.tag}`);

  client.user.setPresence({
    activities: [
      {
        name: 'civic workflows',
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

  try {
    if (interaction.commandName === 'ping') {
      await interaction.reply({ content: 'Pong. Civic bot is online.', ephemeral: true });
      return;
    }

    if (interaction.commandName === 'status') {
      await handleStatus(interaction);
      return;
    }

    if (interaction.commandName === 'test-politics-webhook') {
      await handleWebhookTest(interaction, repos.political);
      return;
    }

    if (interaction.commandName === 'test-jobs-webhook') {
      await handleWebhookTest(interaction, repos.jobs);
      return;
    }

    if (interaction.commandName === 'run-politics') {
      await handleRunPolitics(interaction);
      return;
    }

    if (interaction.commandName === 'run-jobs') {
      await handleRunJobs(interaction);
    }
  } catch (error) {
    console.error(`Command failed: /${interaction.commandName}`, error);
    const message = error instanceof Error ? error.message : 'Unknown error.';

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Command failed: ${message}`);
    } else {
      await interaction.reply({ content: `Command failed: ${message}`, ephemeral: true });
    }
  }
});

client.login(token);
