const { SlashCommandBuilder } = require("@discordjs/builders");
const { AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const discordTranscripts = require("discord-html-transcripts");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("export")
    .setDescription("Export channel messages (dev only)")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to export messages from")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Number of messages to export (max 500)")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("dm")
        .setDescription("Send the export to your DMs")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (interaction.user.id !== config.developerId) {
      return interaction.reply({
        content: "Only the bot owner can use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let channel = interaction.options.getChannel("channel");
    const sendToDM = interaction.options.getBoolean("dm") || false;
    const messageLimit = Math.min(
      interaction.options.getInteger("limit") || 200,
      500
    ); // Default 200, max 500

    try {
      // If channel is a string ID, fetch the channel
      if (typeof channel === "string") {
        channel = await interaction.client.channels.fetch(channel);
      }

      if (!channel) {
        return await interaction.editReply({
          content: "Invalid channel specified.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Generate transcript
      const transcript = await discordTranscripts.createTranscript(channel, {
        limit: messageLimit,
        fileName: `${channel.name}-transcript.html`,
        poweredBy: false,
        saveImages: true,
      });

      if (sendToDM) {
        try {
          // Send to DM
          await interaction.user.send({
            content: `Exported ${messageLimit} messages from #${channel.name} in ${channel.guild.name}`,
            files: [transcript],
          });

          await interaction.editReply({
            content: `Exported messages from #${channel.name}. Check your DMs for the file.`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          console.error("Error sending DM:", error);
          await interaction.editReply({
            content:
              "Failed to send you a DM. Please make sure your DMs are open.",
            flags: MessageFlags.Ephemeral,
          });
        }
      } else {
        // Send in the channel as reply
        await interaction.editReply({
          content: `Exported messages from #${channel.name}`,
          files: [transcript],
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      console.error("Error exporting messages:", error);
      await interaction.editReply({
        content: "An error occurred while exporting messages.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
