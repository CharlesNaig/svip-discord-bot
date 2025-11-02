const config = require("../../config/config.js");
const logger = require("../../utils/logger.js");
const { EmbedBuilder } = require("discord.js");

// Move outside to persist between events
const presenceTimes = {};
// Track recent notifications to prevent duplicates
const recentNotifications = new Map();

module.exports = {
  name: "presenceUpdate",
  async execute(oldPresence, newPresence, client) {
    try {
      const guardedUsers = config.naig; // Array of user IDs to guard
      const naig = config.developerId;

      // Check if the user is in the guarded list
      if (!guardedUsers.includes(newPresence.userId)) return;

      const newStatus = newPresence.status; // online, offline, dnd, idle
      const currentTime = Date.now();
      
      // Initialize presence times if needed
      if (!presenceTimes[newPresence.userId]) {
        presenceTimes[newPresence.userId] = {};
      }

      if (oldPresence) {
        const oldStatus = oldPresence.status;
        if (oldStatus !== newStatus) {
          // Create a unique key for this status change
          const notificationKey = `${newPresence.userId}:${oldStatus}:${newStatus}:${Math.floor(currentTime/5000)}`;
          
          // Check if we've sent this notification recently (within 5 seconds)
          if (recentNotifications.has(notificationKey)) {
            //logger.info(`Skipping duplicate notification for status change: ${oldStatus} → ${newStatus}`);
            return;
          }
          
          // Mark this notification as sent
          recentNotifications.set(notificationKey, true);
          
          // Clean up old entries from the Map (keep it from growing too large)
          setTimeout(() => {
            recentNotifications.delete(notificationKey);
          }, 10000);
          
          const lastChangeTime = presenceTimes[newPresence.userId][oldStatus] || currentTime;
          const duration = currentTime - lastChangeTime;
          
          // Format the duration
          const formattedDuration = formatDuration(duration);
          
          // Create an embed to notify
          const embed = new EmbedBuilder()
            .setTitle("`👤` Status Change")
            .setDescription(
              `<@${newPresence.member?.user.id}> **(${newPresence.member?.user.username || 'User'})** changed status from **${oldStatus}** to **${newStatus}**.`
            )
            .setColor(getStatusColor(newStatus))
            .addFields({ name: "Duration", value: `Was ${oldStatus} for ${formattedDuration}` })
            .setTimestamp();
            
          const user = await client.users.fetch(naig);
          await user.send({ embeds: [embed] });
          logger.info(
            `Notified ${user.username} about ${newPresence.member?.user.username || 'User'} changing status.`
          );
          
          // Update the time for the new status
          presenceTimes[newPresence.userId][newStatus] = currentTime;
        }
      } else {
        // First time seeing this user, just record current status
        presenceTimes[newPresence.userId][newStatus] = currentTime;
      }
    } catch (error) {
      logger.error("Error in presenceUpdate event:", error);
    }
  },
};

function formatDuration(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  
  return parts.join(' ');
}

function getStatusColor(status) {
  switch (status) {
    case "online": return config.embedColors.success;
    case "idle": return config.embedColors.warning;
    case "dnd": return config.embedColors.error;
    case "offline": return "#747f8d";
    default: return "#747f8d";
  }
}