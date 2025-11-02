const {
  SlashCommandBuilder,
  EmbedBuilder,
  Client,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
  version: discordJsVersion
} = require("discord.js");
const util = require("util");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require("../../config/config.js");
const client = require("../../index.js");

// Pre-defined useful modules and utilities for eval
const os = require("os");
const fs = require("fs");
const path = require("path");
const { version: nodeJsVersion } = process;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("eval")
    .setDescription("Evaluates JavaScript code.")
    .addStringOption(option =>
      option.setName('code')
        .setDescription('The JavaScript code to evaluate')
        .setRequired(true)
    ),
  name: "eval",
  description: "Evaluates JavaScript code.",
  prefix: true,
  
  async execute(interaction) {
    const Devs = [config.developerId];
    if (!Devs.includes(interaction.user.id)) {
      return await interaction.reply({
        content: "You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral
      });
    }

    const code = interaction.options.getString("code");
    
    if (!code) {
      return await interaction.reply({
        content: "Please provide code to evaluate.",
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      // Define useful variables for eval context
      const guild = interaction.guild;
      const channel = interaction.channel;
      const user = interaction.user;
      const member = interaction.member;
      
      // Utility functions
      const embed = (title, description, color = 0x00ff00) => {
        return new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(color)
          .setTimestamp();
      };
      
      const button = (label, style = ButtonStyle.Primary, customId = 'button') => {
        return new ButtonBuilder()
          .setLabel(label)
          .setStyle(style)
          .setCustomId(customId);
      };
      
      // Evaluate the code
      let evaled = await eval(`(async () => {
        ${code}
      })()`);
      
      // Security check
      if (evaled === client.config || evaled === config) {
        evaled = "Nice try! 🔒";
      }
      
      // Convert to string if needed
      if (typeof evaled !== "string") {
        evaled = util.inspect(evaled, { depth: 2 });
      }
      
      // Handle long outputs
      if (evaled.length > 1900) {
        try {
          const response = await fetch("https://hasteb.in/documents", {
            method: "POST",
            headers: {
              "Content-Type": "text/plain",
            },
            body: evaled,
          });
          const json = await response.json();
          const hasteUrl = `https://hasteb.in/${json.key}`;
          
          return await interaction.reply({
            content: `📄 Output too long, uploaded to: ${hasteUrl}`,
          });
        } catch (hasteError) {
          return await interaction.reply({
            content: "Output too long and failed to upload to hastebin.",
            flags: MessageFlags.Ephemeral
          });
        }
      }
      
      // Create delete button
      const deleteButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel("🗑️ Delete")
        .setCustomId("eval-delete");
      
      const row = new ActionRowBuilder().addComponents(deleteButton);
      
      const msg = await interaction.reply({
        content: `\`\`\`js\n${evaled}\n\`\`\``,
        components: [row],
        fetchReply: true,
      });
      
      // Set up delete button collector
      const filter = (i) =>
        i.customId === "eval-delete" && i.user.id === interaction.user.id;
      
      const collector = msg.createMessageComponentCollector({
        time: 60000,
        filter,
      });
      
      collector.on("collect", async (i) => {
        await i.deferUpdate();
        await msg.delete().catch(() => {});
      });
      
    } catch (error) {
      const errorMsg = error.stack || error.message || error.toString();
      await interaction.reply({
        content: `\`\`\`js\n❌ Error:\n${errorMsg}\n\`\`\``,
        flags: MessageFlags.Ephemeral
      });
    }
  },

  async run(message, args) {
    const Devs = [config.developerId];
    if (!Devs.includes(message.author.id)) {
      return await message.channel.send(
        "You do not have permission to use this command."
      );
    }

    const code = args.join(" ");
    
    if (!code) {
      return await message.channel.send("Please provide code to evaluate.");
    }

    try {
      // Define useful variables for eval context
      const guild = message.guild;
      const channel = message.channel;
      const author = message.author;
      const member = message.member;
      
      // Utility functions
      const embed = (title, description, color = 0x00ff00) => {
        return new EmbedBuilder()
          .setTitle(title)
          .setDescription(description)
          .setColor(color)
          .setTimestamp();
      };
      
      const button = (label, style = ButtonStyle.Primary, customId = 'button') => {
        return new ButtonBuilder()
          .setLabel(label)
          .setStyle(style)
          .setCustomId(customId);
      };
      
      // Evaluate the code
      let evaled = await eval(`(async () => {
        ${code}
      })()`);
      
      // Security check
      if (evaled === client.config || evaled === config) {
        evaled = "Nice try! 🔒";
      }
      
      if (typeof evaled !== "string") {
        evaled = util.inspect(evaled, { depth: 2 });
      }
      
      // Handle long outputs
      if (evaled.length > 1900) {
        try {
          const response = await fetch("https://hasteb.in/documents", {
            method: "POST",
            headers: {
              "Content-Type": "text/plain",
            },
            body: evaled,
          });
          const json = await response.json();
          const hasteUrl = `https://hasteb.in/${json.key}`;
          
          return await message.channel.send({
            content: `📄 Output too long, uploaded to: ${hasteUrl}`,
          });
        } catch (hasteError) {
          return await message.channel.send("Output too long and failed to upload to hastebin.");
        }
      }
      
      const deleteButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel("🗑️ Delete")
        .setCustomId("eval-delete");
      
      const row = new ActionRowBuilder().addComponents(deleteButton);
      
      const msg = await message.channel.send({
        content: `\`\`\`js\n${evaled}\n\`\`\``,
        components: [row],
      });
      
      const filter = (i) =>
        i.customId === "eval-delete" && i.user.id === message.author.id;
      
      const collector = msg.createMessageComponentCollector({
        time: 60000,
        filter,
      });
      
      collector.on("collect", async (i) => {
        await i.deferUpdate();
        await msg.delete().catch(() => {});
      });
      
    } catch (error) {
      const errorMsg = error.stack || error.message || error.toString();
      await message.channel.send(`\`\`\`js\n❌ Error:\n${errorMsg}\n\`\`\``);
    }
  },
};