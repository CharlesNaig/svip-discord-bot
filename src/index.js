const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
} = require("discord.js");
const fs = require("fs");
const mongoose = require("mongoose");
const config = require("./config/config.js");
const chalk = require("chalk");
const logger = require("./utils/logger.js");

class Bot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution,
        GatewayIntentBits.GuildInvites,
      ],
      partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.User,
        Partials.Reaction,
      ],
    });

    this.client.commands = new Collection();
    this.client.slashCommands = new Collection();
    this.config = config;

    this.init();
  }

  async init() {
    // Connect to MongoDB
    try {
      await mongoose.connect(this.config.mongoURI, {});
      logger.success("Connected to MongoDB");
    } catch (err) {
      logger.error(err);
    }

    // Load commands
    const commandFolders = fs.readdirSync("./src/commands");
    for (const folder of commandFolders) {
      const commandFiles = fs
        .readdirSync(`./src/commands/${folder}`)
        .filter((file) => file.endsWith(".js"));
      for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        if (command.data && command.execute) {
          this.client.slashCommands.set(command.data.name, command);
          logger.info(
            chalk.hex("#87aaeb")`Loaded [ / COMMAND ]: ${command.data.name}`
          );
        }
        if (command.name && command.execute) {
          this.client.commands.set(command.name, command);
          logger.info(
            `Loaded [ ${this.config.prefix} COMMAND ]: ${command.name}`
          );
        }
      }
    }

    
    // Load events
    const eventFiles = fs
      .readdirSync("./src/events")
      .filter((file) => file.endsWith(".js"));
    const eventFolders = fs.readdirSync("./src/events");
    for (const folder of eventFolders) {
      const eventFiles = fs
      .readdirSync(`./src/events/${folder}`)
      .filter((file) => file.endsWith(".js"));
      for (const file of eventFiles) {
      const event = require(`./events/${folder}/${file}`);
      if (event.once) {
        this.client.once(event.name, (...args) =>
        event.execute(...args, this.client)
        );
        logger.info(chalk.blue(`Loaded [ Event ]: ${event.name}`));
      } else {
        this.client.on(event.name, (...args) =>
        event.execute(...args, this.client)
        );
        logger.info(chalk.blue(`Loaded [ Event ]: ${event.name}`));
      }
      }
    }

    // Login to Discord
    this.client.login(this.config.token);
  }
}

const client = new Bot().client;
module.exports = client;

const { loadPlugins } = require("./utils/plugin.js");
loadPlugins(client)
  .then(() => {
    logger.success("Plugins successfully loaded.");
  })
  .catch((err) => {
    logger.error("Error loading plugins:", err);
  });

// Temporary Memorystore
client.activeAdvertisements = new Map();
