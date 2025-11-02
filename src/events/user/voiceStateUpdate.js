const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const config = require("../../config/config.js");
const logger = require("../../utils/logger.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
const bodyguardState = require("../../utils/bodyguardState.js");

// Move outside to persist between events
const voiceTimes = {};
// Track recent notifications to prevent duplicates
const recentVoiceNotifications = new Map();

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    try {
      const guardedUsers = config.naig; // Array of user IDs to guard
      const naig = config.developerId;

      // Handle case where member might be null
      const userId = newState.member?.id || oldState.member?.id;
      if (!guardedUsers.includes(userId)) return;

      const currentTime = Date.now();
      const user = await client.users.fetch(naig);
      const username = newState.member?.user.username || oldState.member?.user.username;

      // BODYGUARD FUNCTIONALITY
      // When a guarded user joins a voice channel
      if (newState.channelId && (!oldState.channelId || oldState.channelId !== newState.channelId)) {
        try {
          // Only follow if bodyguard is enabled
          if (bodyguardState.status()) {
            // Check if we have permission to join the voice channel
            const channel = newState.channel;
            if (!channel) {
              logger.warn(`Bodyguard: Channel object not available for channel ID ${newState.channelId}`);
              return;
            }
            
            const permissions = channel.permissionsFor(client.user);
            if (!permissions) {
              logger.warn(`Bodyguard: Cannot get permissions for channel ${channel.name}`);
              return;
            }
            
            if (permissions.has(PermissionsBitField.Flags.Connect) && 
                permissions.has(PermissionsBitField.Flags.Speak)) {
              
              // Join the same voice channel
              joinVoiceChannel({
                channelId: newState.channelId,
                guildId: newState.guild.id,
                adapterCreator: newState.guild.voiceAdapterCreator,
              });
              
              logger.info(`Bodyguard: Joined channel ${channel.name} to follow ${username}`);
            } else {
              logger.warn(`Bodyguard: Cannot join channel ${channel.name} - Missing permissions`);
            }
          } else {
            logger.info(`Bodyguard: Not following ${username} because bodyguard mode is disabled`);
          }
        } catch (error) {
          logger.error(`Bodyguard: Error joining voice channel:`, error);
        }
      }
      
      // When a guarded user leaves voice entirely
      if (!newState.channelId && oldState.channelId) {
        try {
          // Get and destroy the voice connection for this guild if we're connected
          const connection = getVoiceConnection(oldState.guild.id);
          if (connection) {
            connection.destroy();
            logger.info(`Bodyguard: Left voice channel because ${username} left`);
          }
        } catch (error) {
          logger.error(`Bodyguard: Error leaving voice channel:`, error);
        }
      }

      // NOTIFICATION FUNCTIONALITY
      // Join/Leave voice channel notifications
      if (newState.channelId && !oldState.channelId) {
        // User joined VC
        // Create unique notification key
        const notificationKey = `${userId}:join:${newState.channelId}:${Math.floor(currentTime/5000)}`;
        
        // Check if we've sent this notification recently
        if (recentVoiceNotifications.has(notificationKey)) {
          logger.info(`Skipping duplicate voice join notification`);
          return;
        }
        
        // Mark this notification as sent
        recentVoiceNotifications.set(notificationKey, true);
        
        // Clean up after 10 seconds
        setTimeout(() => {
          recentVoiceNotifications.delete(notificationKey);
        }, 10000);
        
        voiceTimes[userId] = currentTime;
        const embed = new EmbedBuilder()
          .setTitle("`🔊` Voice Channel Join")
          .setDescription(
            `**${username}** joined <#${newState.channel.id}>. ${
              bodyguardState.status() ? "I'm following as bodyguard." : "Bodyguard mode is disabled."
            }`
          )
          .setColor(config.embedColors.main)
          .setTimestamp();
        await user.send({ embeds: [embed] });
        logger.info(
          `Notified ${user.username} about ${username} joining VC.`
        );
      } else if (!newState.channelId && oldState.channelId) {
        // User left VC
        // Create unique notification key
        const notificationKey = `${userId}:leave:${oldState.channelId}:${Math.floor(currentTime/5000)}`;
        
        // Check if we've sent this notification recently
        if (recentVoiceNotifications.has(notificationKey)) {
          logger.info(`Skipping duplicate voice leave notification`);
          return;
        }
        
        // Mark this notification as sent
        recentVoiceNotifications.set(notificationKey, true);
        
        // Clean up after 10 seconds
        setTimeout(() => {
          recentVoiceNotifications.delete(notificationKey);
        }, 10000);
        
        const joinTime = voiceTimes[userId];
        if (joinTime) {
          const duration = currentTime - joinTime;
          const formattedDuration = formatDuration(duration);
          
          const embed = new EmbedBuilder()
            .setTitle("`🔇` Voice Channel Leave")
            .setDescription(
              `**${username}** left **<#${oldState.channel.id}>**. ${
              bodyguardState.status() ? "I'm leaving as bodyguard." : "Bodyguard mode is disabled."
            }`
            )
            .setColor(config.embedColors.warning)
            .addFields({ name: "Duration", value: `Was in VC for ${formattedDuration}` })
            .setTimestamp();
            
          await user.send({ embeds: [embed] });
          logger.info(
            `Notified ${user.username} about ${username} leaving VC.`
          );
          
          // Clear the join time
          delete voiceTimes[userId];
        }
      } else if (newState.channelId !== oldState.channelId && newState.channelId && oldState.channelId) {
        // Channel change
        // Create unique notification key for channel change
        const notificationKey = `${userId}:move:${oldState.channelId}:${newState.channelId}:${Math.floor(currentTime/5000)}`;
        
        // Check if we've sent this notification recently
        if (recentVoiceNotifications.has(notificationKey)) {
          logger.info(`Skipping duplicate voice move notification`);
          return;
        }
        
        // Mark this notification as sent
        recentVoiceNotifications.set(notificationKey, true);
        
        // Clean up after 10 seconds
        setTimeout(() => {
          recentVoiceNotifications.delete(notificationKey);
        }, 10000);
        
        const embed = new EmbedBuilder()
          .setTitle("`🔀` Voice Channel Move")
          .setDescription(
            `**${username}** moved from **<#${oldState.channel.id}>** to **<#${newState.channel.id}>**. I'm following.`
          )
          .setColor(config.embedColors.main)
          .setTimestamp();
          
        await user.send({ embeds: [embed] });
        logger.info(
          `Notified ${user.username} about ${username} moving VC.`
        );
      }
      
      // Microphone state changes
      if (oldState.selfMute !== newState.selfMute) {
        const notificationKey = `${userId}:mute:${newState.selfMute}:${Math.floor(currentTime/5000)}`;
        if (recentVoiceNotifications.has(notificationKey)) return;
        
        recentVoiceNotifications.set(notificationKey, true);
        setTimeout(() => recentVoiceNotifications.delete(notificationKey), 10000);
        
        const embed = new EmbedBuilder()
          .setTitle(newState.selfMute ? "`🎙️` Microphone Muted" : "`🎙️` Microphone Unmuted")
          .setDescription(`**${username}** ${newState.selfMute ? "muted" : "unmuted"} their microphone.`)
          .setColor(config.embedColors.main)
          .setTimestamp();
        await user.send({ embeds: [embed] });
      }
      
      // Camera state changes
      if (oldState.selfVideo !== newState.selfVideo) {
        const notificationKey = `${userId}:video:${newState.selfVideo}:${Math.floor(currentTime/5000)}`;
        if (recentVoiceNotifications.has(notificationKey)) return;
        
        recentVoiceNotifications.set(notificationKey, true);
        setTimeout(() => recentVoiceNotifications.delete(notificationKey), 10000);
        
        const embed = new EmbedBuilder()
          .setTitle(newState.selfVideo ? "`📹` Camera Turned On" : "`📹` Camera Turned Off")
          .setDescription(`**${username}** ${newState.selfVideo ? "turned on" : "turned off"} their camera.`)
          .setColor(config.embedColors.main)
          .setTimestamp();
        await user.send({ embeds: [embed] });
      }
      
      // Deafen state changes
      if (oldState.selfDeaf !== newState.selfDeaf) {
        const notificationKey = `${userId}:deaf:${newState.selfDeaf}:${Math.floor(currentTime/5000)}`;
        if (recentVoiceNotifications.has(notificationKey)) return;
        
        recentVoiceNotifications.set(notificationKey, true);
        setTimeout(() => recentVoiceNotifications.delete(notificationKey), 10000);
        
        const embed = new EmbedBuilder()
          .setTitle(newState.selfDeaf ? "`🔇` User Deafened" : "`🎧` User Undeafened")
          .setDescription(`**${username}** ${newState.selfDeaf ? "deafened" : "undeafened"} themselves.`)
          .setColor(config.embedColors.main)
          .setTimestamp();
        await user.send({ embeds: [embed] });
      }
    } catch (error) {
      logger.error("Error in voiceStateUpdate event:", error);
    }
  }
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