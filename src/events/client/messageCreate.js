const { EmbedBuilder } = require("discord.js");
const config = require("../../config/config.js");
const logger = require("../../utils/logger.js");

// Track recent message notifications to prevent duplicates
const recentMessageNotifications = new Map();

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    try {
      const guardedUsers = config.naig; // Array of user IDs to guard

      // Check if the message author is in the guarded list
      if (!guardedUsers.includes(message.author.id)) return;

      const currentTime = Date.now();
      const notificationKey = `${message.author.id}:${
        message.channel.id
      }:${Math.floor(currentTime / 5000)}`;

      // Track user activity status
      if (message.author.inactivityTimeout) {
        clearTimeout(message.author.inactivityTimeout);
      }

      // Set inactivity timeout - will trigger after 3 minutes of no messages
      message.author.inactivityTimeout = setTimeout(async () => {
        try {
          const user = await client.users.fetch(config.developerId);
          const embed = new EmbedBuilder()
            .setTitle("`⏰` Inactivity Alert")
            .setDescription(
              `*<@${message.author.id}>* has been inactive for \`5 minutes\` in **<#${message.channel.id}>**.`
            )
            .setColor(config.embedColors.warning) // Add fallback color value
            .setTimestamp();

          await user.send({ embeds: [embed] });
          logger.info(
            `Inactivity alert sent to ${user.username} for ${message.author.username}`
          );
        } catch (error) {
          logger.error("Error sending inactivity alert:", error);
        }
      }, 5 * 60 * 1000); // 5 minutes

      // Only send notification if we haven't sent one for this user/channel in the last 5 seconds
      if (!recentMessageNotifications.has(notificationKey)) {
        recentMessageNotifications.set(notificationKey, true);

        // Clean up the notification key after 10 seconds
        setTimeout(() => {
          recentMessageNotifications.delete(notificationKey);
        }, 10000);

        try {
          const user = await client.users.fetch(config.developerId);
          const embed = new EmbedBuilder()
            .setTitle("`📩` New Message from Amy / naig-CHAN!")
            .setDescription(
              `<@${message.author.id}> sent a message in **<#${message.channel.id}>**.`
            )
            .addFields(
              {
                name: "Content",
                value: `\`${message.content}\`` || "*No text content*",
              },
              {
                name: "Link",
                value: `[Jump to message](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id})`,
                inline: true,
              },
              {
                name: "Timestamp",
                value: new Date(message.createdTimestamp).toLocaleString(
                  "en-US",
                  {
                    timeZone: "Asia/Manila",
                  }
                ),
                inline: true,
              }
            )
            .setColor(config.embedColors.main)
            .setTimestamp();

          // Check if there's an attachment and set it as the image
          if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            const imageUrl = attachment.url;
            embed.setImage(imageUrl);
            // Add attachment name as a field if available
            if (attachment.name) {
              embed.addFields({
                name: "Attachment",
                value: attachment.name,
                inline: true,
              });
            }
          } else if (message.embeds.length > 0 && message.embeds[0].image) {
            // Also check for images in embeds
            embed.setImage(message.embeds[0].image.url);
          }

          await user.send({ embeds: [embed] });
          logger.info(
            `Message alert sent to ${user.username} for message from ${message.author.username}`
          );
        } catch (error) {
          logger.error("Error sending message DM:", error);
        }
      }

      // Handle command processing - separate from security alerts
      // Ignore bot messages and messages without the prefix
      if (message.author.bot || !message.content.startsWith(config.prefix))
        return;

      // Extract command name and arguments
      const args = message.content
        .slice(config.prefix.length)
        .trim()
        .split(/ +/);
      const commandName = args.shift().toLowerCase();

      // Find the command in the collection
      const command = client.commands.get(commandName);
      if (!command) return;

      // Check if the command is available for prefix usage
      if (command.prefix === false) {
        return message.reply("This command is not available for prefix usage.");
      }

      // Execute the command
      try {
        // Run the command's message-based logic (try run method first, then execute)
        if (typeof command.run === "function") {
          await command.run(message, args, client);
        } else if (typeof command.execute === "function") {
          await command.execute(message, args, client);
        } else {
          throw new Error("Command has no run or execute method");
        }
      } catch (error) {
        logger.error(`Command execution error (${commandName}):`, error);

        // Create a detailed error embed
        const errorEmbed = new EmbedBuilder()
          .setTitle("Command Error")
          .setColor(config.embedColors.error || 0xff0000)
          .addFields(
            { name: "Command", value: commandName || "Unknown" },
            { name: "User", value: message.author.tag },
            { name: "Channel", value: `#${message.channel.name}` },
            { name: "Error", value: `\`\`\`${error.message}\`\`\`` },
            {
              name: "Stack Trace",
              value: `\`\`\`${
                error.stack ? error.stack.substring(0, 1000) : "No stack trace"
              }\`\`\``,
            }
          )
          .setTimestamp();

        // Notify the user of the failure
        try {
          await message.reply({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
          });
        } catch (replyError) {
          logger.error("Failed to reply to the user:", replyError.message);
        }

        // Notify the developer
        if (config.developerId) {
          try {
            const developer = await client.users.fetch(config.developerId);
            await developer.send({ embeds: [errorEmbed] });
          } catch (devError) {
            logger.error("Failed to notify the developer:", devError.message);
          }
        }
      }
    } catch (globalError) {
      // Catch any unexpected errors in the event handler itself
      logger.error("Unexpected error in messageCreate event:", globalError);
    }
  },
};
