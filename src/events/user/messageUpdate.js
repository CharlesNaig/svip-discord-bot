const { EmbedBuilder, Util } = require("discord.js");
const config = require("../../config/config.js");
const logger = require("../../utils/logger.js");

// Track recent notifications to prevent duplicates
const recentEditNotifications = new Map();

module.exports = {
  name: "messageUpdate",
  async execute(oldMessage, newMessage, client) {
    try {
      // Skip if message is from a bot or webhook
      if (newMessage.author?.bot) return;
      
      // If the content is the same, it might be an embed or attachment update, not a text edit
      if (oldMessage.content === newMessage.content) return;
      
      const guardedUsers = config.naig; // Array of user IDs to guard
      const naig = config.developerId;

      // Check if the message author is in the guarded list
      if (!newMessage.author || !guardedUsers.includes(newMessage.author.id)) return;

      const currentTime = Date.now();
      const notificationKey = `${newMessage.id}:${Math.floor(currentTime / 5000)}`;

      // Prevent duplicate notifications
      if (recentEditNotifications.has(notificationKey)) return;
      
      recentEditNotifications.set(notificationKey, true);
      setTimeout(() => {
        recentEditNotifications.delete(notificationKey);
      }, 5000);

      const developer = await client.users.fetch(naig);

      // Clean up the message content for nice display
      const oldCleanContent = oldMessage.content ? 
        Util.escapeMarkdown(oldMessage.content).substring(0, 1000) : 
        "*No content*";
        
      const newCleanContent = newMessage.content ? 
        Util.escapeMarkdown(newMessage.content).substring(0, 1000) : 
        "*No content*";
      
      // Create the embed for the notification
      const embed = new EmbedBuilder()
        .setTitle("`✏️` Message Edited")
        .setDescription(`<@${newMessage.author.id}> edited a message in <#${newMessage.channel.id}>`)
        .addFields(
          {
            name: "Before",
            value: `\`\`\`${oldCleanContent}\`\`\``
          },
          {
            name: "After",
            value: `\`\`\`${newCleanContent}\`\`\``
          },
          {
            name: "Channel",
            value: `<#${newMessage.channel.id}>`
          },
          {
            name: "Message Link",
            value: `[Jump to message](${newMessage.url})`
          },
          {
            name: "Edited At",
            value: new Date().toLocaleString("en-US", {
              timeZone: "Asia/Manila"
            })
          }
        )
        .setColor(config.embedColors.warning)
        .setTimestamp();

      // If we can get the user's avatar, add it as a thumbnail
      if (newMessage.author.displayAvatarURL) {
        embed.setThumbnail(newMessage.author.displayAvatarURL({ dynamic: true }));
      }

      await developer.send({ embeds: [embed] });
      logger.info(`Message edit notification sent for ${newMessage.author.tag}`);
    } catch (error) {
      logger.error("Error in messageUpdate event:", error);
    }
  },
};