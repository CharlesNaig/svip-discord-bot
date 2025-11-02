const { EmbedBuilder } = require("discord.js");
const config = require("../../config/config.js");
const logger = require("../../utils/logger.js");

// Track recent notifications to prevent duplicates
const recentUserUpdateNotifications = new Map();

module.exports = {
  name: "userUpdate",
  async execute(oldUser, newUser, client) {
    try {
      const guardedUsers = config.naig; // Array of user IDs to guard
      const naig = config.developerId;

      // Check if the user is in the guarded list
      if (!guardedUsers.includes(newUser.id)) return;

      const currentTime = Date.now();
      const notificationKey = `${newUser.id}:${Math.floor(currentTime / 5000)}`;

      // Prevent duplicate notifications
      if (recentUserUpdateNotifications.has(notificationKey)) return;
      
      recentUserUpdateNotifications.set(notificationKey, true);
      setTimeout(() => {
        recentUserUpdateNotifications.delete(notificationKey);
      }, 5000);

      const changes = [];
      let shouldNotify = false;

      // Check for username changes
      if (oldUser.username !== newUser.username) {
        changes.push({
          name: "Username Changed",
          value: `${oldUser.username} → ${newUser.username}`
        });
        shouldNotify = true;
      }

      // Check for discriminator changes (relevant for legacy usernames)
      if (oldUser.discriminator !== newUser.discriminator && oldUser.discriminator !== '0' && newUser.discriminator !== '0') {
        changes.push({
          name: "Discriminator Changed",
          value: `#${oldUser.discriminator} → #${newUser.discriminator}`
        });
        shouldNotify = true;
      }

      // Check if the user switched to or from new username style
      if ((oldUser.discriminator === '0' && newUser.discriminator !== '0') || 
          (oldUser.discriminator !== '0' && newUser.discriminator === '0')) {
        changes.push({
          name: "Username System Changed",
          value: oldUser.discriminator === '0' 
            ? "Switched from new username style to legacy username#discriminator" 
            : "Switched to new username style"
        });
        shouldNotify = true;
      }

      // Check for avatar changes
      if (oldUser.avatar !== newUser.avatar) {
        changes.push({
          name: "Avatar Changed",
          value: "User has updated their profile picture"
        });
        shouldNotify = true;
      }

      // Check for banner changes
      if (oldUser.banner !== newUser.banner) {
        changes.push({
          name: "Banner Changed",
          value: "User has updated their profile banner"
        });
        shouldNotify = true;
      }

      // If no relevant changes were detected, return early
      if (!shouldNotify || changes.length === 0) return;

      const developer = await client.users.fetch(naig);
      
      // Create the embed for the notification
      const embed = new EmbedBuilder()
        .setTitle("`👤` User Profile Updated")
        .setDescription(`<@${newUser.id}> (${newUser.tag}) has updated their Discord profile.`)
        .addFields(changes)
        .setColor(config.embedColors.main)
        .setTimestamp();

      // Add current avatar as thumbnail
      embed.setThumbnail(newUser.displayAvatarURL({ dynamic: true, size: 1024 }));
      
      // If avatar changed, try to show the old avatar as an image
      if (oldUser.avatar && oldUser.avatar !== newUser.avatar) {
        const oldAvatarURL = `https://cdn.discordapp.com/avatars/${oldUser.id}/${oldUser.avatar}.${oldUser.avatar.startsWith("a_") ? "gif" : "png"}?size=1024`;
        embed.setImage(oldAvatarURL);
        embed.addFields({
          name: "Previous Avatar",
          value: "[View Previous Avatar](" + oldAvatarURL + ")"
        });
      }

      await developer.send({ embeds: [embed] });
      logger.info(`User update notification sent for ${newUser.tag}`);
    } catch (error) {
      logger.error("Error in userUpdate event:", error);
    }
  },
};