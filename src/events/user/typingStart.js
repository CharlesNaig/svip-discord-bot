const { EmbedBuilder } = require("discord.js");
const config = require("../../config/config.js");
const logger = require("../../utils/logger.js");

// Track recent notifications to prevent duplicate typing notifications
const recentTypingNotifications = new Map();
// Track when typing started to calculate duration
const typingStartTimes = new Map();

module.exports = {
  name: "typingStart",
  async execute(typing, client) {
    try {
      const guardedUsers = config.naig; // Array of user IDs to guard
      const naig = config.developerId;

      // Check if the user is in the guarded list
      if (!guardedUsers.includes(typing.user.id)) return;

      const currentTime = Date.now();
      const channelId = typing.channel.id;
      const userId = typing.user.id;
      const notificationKey = `${userId}:${channelId}:${Math.floor(currentTime / 30000)}`; // 30-second window

      // Only send one typing notification per channel per 30 seconds
      if (recentTypingNotifications.has(notificationKey)) {
        // Update the typing start time if this is a continued typing session
        typingStartTimes.set(`${userId}:${channelId}`, currentTime);
        return;
      }
      
      // Record typing start time and set notification flag
      typingStartTimes.set(`${userId}:${channelId}`, currentTime);
      recentTypingNotifications.set(notificationKey, true);
      
      // Clear the notification flag after 30 seconds
      setTimeout(() => {
        recentTypingNotifications.delete(notificationKey);
      }, 30000);

      const developer = await client.users.fetch(naig);
      
      // Get channel name safely
      let channelName = "Unknown Channel";
      try {
        if (typing.channel.name) {
          channelName = typing.channel.name;
        } else if (typing.channel.recipient) {
          // For DM channels
          channelName = `DM with ${typing.channel.recipient.tag}`;
        }
      } catch (e) {
        logger.warn(`Could not get channel name: ${e.message}`);
      }

      // Create the embed for the notification
      const embed = new EmbedBuilder()
        .setTitle("`⌨️` Typing Started")
        .setDescription(`<@${typing.user.id}> (${typing.user.tag}) started typing in <#${channelId}>`)
        .addFields(
          {
            name: "Channel",
            value: `<#${channelId}> (${channelName})`,
            inline: true
          },
          {
            name: "Time",
            value: new Date().toLocaleString("en-US", {
              timeZone: "Asia/Manila"
            }),
            inline: true
          }
        )
        .setColor(config.embedColors.main)
        .setThumbnail(typing.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await developer.send({ embeds: [embed] });
      logger.info(`Typing notification sent for ${typing.user.tag} in ${channelName}`);
      
      // Set up a timeout to check if typing stopped
      setTimeout(async () => {
        const startTime = typingStartTimes.get(`${userId}:${channelId}`);
        if (!startTime) return; // No start time recorded
        
        // If it's been more than 10 seconds since the last typing update, consider typing stopped
        if (Date.now() - startTime >= 10000) {
          try {
            const typingDuration = Math.floor((Date.now() - startTime) / 1000);
            
            const stoppedEmbed = new EmbedBuilder()
              .setTitle("`⌨️` Typing Stopped")
              .setDescription(`<@${typing.user.id}> (${typing.user.tag}) stopped typing in <#${channelId}>`)
              .addFields(
                {
                  name: "Channel",
                  value: `<#${channelId}> (${channelName})`,
                  inline: true
                },
                {
                  name: "Duration",
                  value: `${typingDuration} seconds`,
                  inline: true
                },
                {
                  name: "Time",
                  value: new Date().toLocaleString("en-US", {
                    timeZone: "Asia/Manila"
                  })
                }
              )
              .setColor(config.embedColors.warning)
              .setTimestamp();
            
            await developer.send({ embeds: [stoppedEmbed] });
            logger.info(`Typing stopped notification sent for ${typing.user.tag}`);
            
            // Clear the typing start time
            typingStartTimes.delete(`${userId}:${channelId}`);
          } catch (error) {
            logger.error("Error sending typing stopped notification:", error);
          }
        }
      }, 10000); // Check after 10 seconds
      
    } catch (error) {
      logger.error("Error in typingStart event:", error);
    }
  },
};