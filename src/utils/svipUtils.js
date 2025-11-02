const { EmbedBuilder } = require("discord.js");
const logger = require("./logger.js");
const config = require("../config/config.js");

/**
 * Check if user is a developer
 */
function isDeveloper(userId) {
  return userId === config.developerId || config.naig.includes(userId);
}

/**
 * Get user's actual boost count in the guild
 */
async function getUserBoostCount(guild, userId) {
  try {
    await guild.members.fetch();
    const member = guild.members.cache.get(userId);
    if (!member) return 0;
    
    // Count how many times the user has boosted
    const boostCount = member.premiumSinceTimestamp ? 1 : 0;
    
    // For developers, always return 2+ to bypass requirements
    if (isDeveloper(userId)) {
      return 2;
    }
    
    return boostCount;
  } catch (error) {
    logger.error(`Error getting boost count for ${userId}:`, error);
    return 0;
  }
}

/**
 * Check if user meets SVIP requirements (2+ boosts)
 */
async function meetsBoostRequirements(guild, userId) {
  // Check if development mode is enabled
  try {
    const { devBoostManager } = require('./devBoostManager.js');
    
    if (devBoostManager.isDevMode()) {
      // Use development boost manager
      return await devBoostManager.meetsBoostRequirements(guild, userId);
    }
  } catch (error) {
    logger.error('Error accessing development boost manager:', error);
  }
  
  // Use original logic for production mode
  const boostCount = await getUserBoostCount(guild, userId);
  const guildBoostCount = guild.premiumSubscriptionCount || 0;
  
  return boostCount > 0 && guildBoostCount >= parseInt(config.svip.boostrequire);
}

/**
 * Send notification to SVIP channel
 */
async function sendSvipNotification(client, embed, content = null) {
  try {
    const channel = client.channels.cache.get(config.svip.notifyChannelId);
    if (channel) {
      await channel.send({ 
        embeds: [embed], 
        content: content 
      });
    }
  } catch (error) {
    logger.error("Error sending SVIP notification:", error);
  }
}

/**
 * Send DM notification to user
 */
async function sendUserDM(client, userId, embed) {
  try {
    const user = await client.users.fetch(userId);
    if (user) {
      await user.send({ embeds: [embed] });
    }
  } catch (error) {
    logger.error(`Error sending DM to ${userId}:`, error);
  }
}

/**
 * Grant SVIP role to user
 */
async function grantSvipRole(guild, userId) {
  try {
    const member = guild.members.cache.get(userId);
    if (!member) return false;
    
    const svipRole = guild.roles.cache.get(config.svip.svipRoleId);
    if (!svipRole) return false;
    
    if (!member.roles.cache.has(svipRole.id)) {
      await member.roles.add(svipRole);
      logger.success(`Granted SVIP role to ${member.user.tag}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error granting SVIP role to ${userId}:`, error);
    return false;
  }
}

/**
 * Remove SVIP role from user
 */
async function removeSvipRole(guild, userId) {
  try {
    const member = guild.members.cache.get(userId);
    if (!member) return false;
    
    const svipRole = guild.roles.cache.get(config.svip.svipRoleId);
    if (!svipRole) return false;
    
    if (member.roles.cache.has(svipRole.id)) {
      await member.roles.remove(svipRole);
      logger.info(`Removed SVIP role from ${member.user.tag}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error removing SVIP role from ${userId}:`, error);
    return false;
  }
}

/**
 * Check if user has permission to manage a custom role
 */
async function canManageRole(customRole, userId) {
  return customRole.ownerId === userId || 
         customRole.admins.includes(userId) || 
         isDeveloper(userId);
}

/**
 * Get role member count (excluding owner)
 */
async function getRoleMemberCount(guild, roleId) {
  try {
    const role = guild.roles.cache.get(roleId);
    if (!role) return 0;
    
    return role.members.size;
  } catch (error) {
    logger.error(`Error getting role member count for ${roleId}:`, error);
    return 0;
  }
}

/**
 * Check if role is full (max 25 members)
 */
async function isRoleFull(guild, roleId) {
  const memberCount = await getRoleMemberCount(guild, roleId);
  return memberCount >= 25;
}

/**
 * Add user to custom role with notification
 */
async function addUserToRole(client, guild, roleId, userId, addedBy, isPermanent = false, expirationDate = null) {
  try {
    const member = guild.members.cache.get(userId);
    const role = guild.roles.cache.get(roleId);
    
    if (!member || !role) return false;
    
    // Add role to user
    await member.roles.add(role);
    
    // Send DM notification
    const dmEmbed = new EmbedBuilder()
      .setTitle(`✅ Added to Custom Role`)
      .setDescription(
        `You have been added to the custom role **${role.name}**!\n\n` +
        `**Role:** <@&${roleId}>\n` +
        `**Added by:** <@${addedBy}>\n` +
        `**Type:** ${isPermanent ? 'Permanent' : 'Trial'}\n` +
        (expirationDate ? `**Expires:** <t:${Math.floor(expirationDate.getTime() / 1000)}:R>` : '')
      )
      .setColor(config.embedColors.success)
      .setTimestamp();
    
    await sendUserDM(client, userId, dmEmbed);
    
    // Send notification to SVIP channel
    const notifyEmbed = new EmbedBuilder()
      .setTitle(`✅ Member Added to Custom Role`)
      .setDescription(
        `<@${userId}> has been added to **${role.name}**\n\n` +
        `**Added by:** <@${addedBy}>\n` +
        `**Type:** ${isPermanent ? 'Permanent' : 'Trial'}\n` +
        (expirationDate ? `**Expires:** <t:${Math.floor(expirationDate.getTime() / 1000)}:R>` : '')
      )
      .setColor(config.embedColors.success)
      .setTimestamp();
    
    await sendSvipNotification(client, notifyEmbed);
    
    return true;
  } catch (error) {
    logger.error(`Error adding user ${userId} to role ${roleId}:`, error);
    return false;
  }
}

/**
 * Remove user from custom role with notification
 */
async function removeUserFromRole(client, guild, roleId, userId, removedBy) {
  try {
    const member = guild.members.cache.get(userId);
    const role = guild.roles.cache.get(roleId);
    
    if (!member || !role) return false;
    
    // Remove role from user
    await member.roles.remove(role);
    
    // Send DM notification
    const dmEmbed = new EmbedBuilder()
      .setTitle(`❌ Removed from Custom Role`)
      .setDescription(
        `You have been removed from the custom role **${role.name}**.\n\n` +
        `**Role:** <@&${roleId}>\n` +
        `**Removed by:** <@${removedBy}>`
      )
      .setColor(config.embedColors.error)
      .setTimestamp();
    
    await sendUserDM(client, userId, dmEmbed);
    
    // Send notification to SVIP channel
    const notifyEmbed = new EmbedBuilder()
      .setTitle(`❌ Member Removed from Custom Role`)
      .setDescription(
        `<@${userId}> has been removed from **${role.name}**\n\n` +
        `**Removed by:** <@${removedBy}>`
      )
      .setColor(config.embedColors.error)
      .setTimestamp();
    
    await sendSvipNotification(client, notifyEmbed);
    
    return true;
  } catch (error) {
    logger.error(`Error removing user ${userId} from role ${roleId}:`, error);
    return false;
  }
}

/**
 * Parse duration string (e.g., "1d", "2h", "30min", "permanent")
 */
function parseDuration(durationStr) {
  if (!durationStr) return null;
  
  const input = durationStr.toLowerCase().trim();
  
  // Check for permanent
  if (['permanent', 'perma', 'forever', 'never'].includes(input)) {
    return null; // null means permanent
  }
  
  // Parse time duration
  const match = input.match(/^(\d+)\s*(min|mins|minute|minutes|h|hour|hours|d|day|days|w|week|weeks|m|month|months)$/);
  if (!match) return false; // Invalid format
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  let milliseconds = 0;
  
  if (['min', 'mins', 'minute', 'minutes'].includes(unit)) {
    milliseconds = value * 60 * 1000;
  } else if (['h', 'hour', 'hours'].includes(unit)) {
    milliseconds = value * 60 * 60 * 1000;
  } else if (['d', 'day', 'days'].includes(unit)) {
    milliseconds = value * 24 * 60 * 60 * 1000;
  } else if (['w', 'week', 'weeks'].includes(unit)) {
    milliseconds = value * 7 * 24 * 60 * 60 * 1000;
  } else if (['m', 'month', 'months'].includes(unit)) {
    milliseconds = value * 30 * 24 * 60 * 60 * 1000;
  }
  
  return new Date(Date.now() + milliseconds);
}

/**
 * Format duration for display
 */
function formatDuration(date) {
  if (!date) return 'Permanent';
  
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else {
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}

module.exports = {
  isDeveloper,
  getUserBoostCount,
  meetsBoostRequirements,
  sendSvipNotification,
  sendUserDM,
  grantSvipRole,
  removeSvipRole,
  canManageRole,
  getRoleMemberCount,
  isRoleFull,
  addUserToRole,
  removeUserFromRole,
  parseDuration,
  formatDuration
};
