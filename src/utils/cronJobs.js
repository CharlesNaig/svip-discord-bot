const cron = require("node-cron");
const { EmbedBuilder } = require("discord.js");
const logger = require("./logger.js");
const config = require("../config/config.js");
const {
  sendSvipNotification,
  sendUserDM,
  removeSvipRole,
  meetsBoostRequirements
} = require("./svipUtils.js");

let client = null;

/**
 * Initialize cron jobs
 */
function initializeSvipCron(discordClient) {
  client = discordClient;
  
  // Check expired trials every 10 minutes
  cron.schedule("*/10 * * * *", checkExpiredTrials);
  
  // Check grace periods every hour
  cron.schedule("0 * * * *", checkGracePeriods);
  
  // Send grace period warnings every 6 hours
  cron.schedule("0 */6 * * *", sendGraceWarnings);
  
  // Monthly boost verification (1st day of month at 00:00)
  cron.schedule("0 0 1 * *", monthlyBoostCheck);
  
  logger.success("SVIP cron jobs initialized");
}

/**
 * Check and remove expired trial users
 */
async function checkExpiredTrials() {
  try {
    const CustomRole = require("../schema/CustomRole.js");
    const now = new Date();
    
    const customRoles = await CustomRole.find({ isActive: true });
    
    for (const customRole of customRoles) {
      let hasExpired = false;
      const expiredUsers = [];
      
      // Check trial users
      for (const trialUser of customRole.trialUsers) {
        if (trialUser.expiration && trialUser.expiration <= now) {
          expiredUsers.push(trialUser.userId);
          hasExpired = true;
        }
      }
      
      if (hasExpired) {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) continue;
        
        const role = guild.roles.cache.get(customRole.roleId);
        if (!role) continue;
        
        // Remove expired users
        for (const userId of expiredUsers) {
          const member = guild.members.cache.get(userId);
          if (member && member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            
            // Send DM notification
            const dmEmbed = new EmbedBuilder()
              .setTitle(`⏰ Trial Access Expired`)
              .setDescription(
                `Your trial access to **${role.name}** has expired.\n\n` +
                `**Role:** <@&${role.id}>\n` +
                `**Owner:** <@${customRole.ownerId}>\n\n` +
                `You can request access again if needed.`
              )
              .setColor(config.embedColors.warning)
              .setTimestamp();
            
            await sendUserDM(client, userId, dmEmbed);
            
            logger.info(`Removed expired trial access for ${member.user.tag} from role ${role.name}`);
          }
        }
        
        // Remove from database
        customRole.trialUsers = customRole.trialUsers.filter(
          user => !expiredUsers.includes(user.userId)
        );
        
        await customRole.save();
        
        // Send notification to SVIP channel
        if (expiredUsers.length > 0) {
          const notifyEmbed = new EmbedBuilder()
            .setTitle(`⏰ Trial Access Expired`)
            .setDescription(
              `**Role:** <@&${role.id}>\n` +
              `**Owner:** <@${customRole.ownerId}>\n` +
              `**Expired users:** ${expiredUsers.map(id => `<@${id}>`).join(", ")}\n\n` +
              `Trial access has been automatically removed.`
            )
            .setColor(config.embedColors.warning)
            .setTimestamp();
          
          await sendSvipNotification(client, notifyEmbed);
        }
      }
    }
    
  } catch (error) {
    logger.error("Error checking expired trials:", error);
  }
}

/**
 * Check and process expired grace periods
 */
async function checkGracePeriods() {
  try {
    const SvipUser = require("../schema/SvipUser.js");
    const CustomRole = require("../schema/CustomRole.js");
    const now = new Date();
    
    const expiredGraceUsers = await SvipUser.find({
      graceExpirationDate: { $lte: now },
      isActive: true
    });
    
    for (const svipUser of expiredGraceUsers) {
      const guild = client.guilds.cache.get(config.guildId);
      if (!guild) continue;
      
      const member = guild.members.cache.get(svipUser.userId);
      if (!member) continue;
      
      // Check if user has re-boosted
      const stillMeetsRequirements = await meetsBoostRequirements(guild, svipUser.userId);
      
      if (stillMeetsRequirements) {
        // User re-boosted, cancel grace period
        svipUser.graceExpirationDate = null;
        svipUser.notificationsSent.graceWarning = false;
        svipUser.notificationsSent.finalWarning = false;
        await svipUser.save();
        
        const restoreEmbed = new EmbedBuilder()
          .setTitle(`✅ Grace Period Cancelled`)
          .setDescription(
            `<@${svipUser.userId}> has re-boosted! Their SVIP privileges have been restored.`
          )
          .setColor(config.embedColors.success)
          .setTimestamp();
        
        await sendSvipNotification(client, restoreEmbed);
        continue;
      }
      
      // Grace period expired, remove SVIP privileges
      await removeSvipRole(guild, svipUser.userId);
      
      // Find and delete custom role
      const customRole = await CustomRole.findOne({ ownerId: svipUser.userId });
      if (customRole) {
        const role = guild.roles.cache.get(customRole.roleId);
        const voiceChannel = customRole.voiceChannelId ? 
          guild.channels.cache.get(customRole.voiceChannelId) : null;
        
        // Delete Discord role and voice channel
        if (role) await role.delete("SVIP grace period expired");
        if (voiceChannel) await voiceChannel.delete("SVIP grace period expired");
        
        // Remove from database
        await CustomRole.deleteOne({ _id: customRole._id });
        
        logger.info(`Deleted custom role ${role?.name || 'unknown'} for ${member.user.tag} (grace period expired)`);
      }
      
      // Update SVIP user
      svipUser.isActive = false;
      svipUser.hasCustomRole = false;
      svipUser.customRoleId = null;
      svipUser.graceExpirationDate = null;
      await svipUser.save();
      
      // Send final notification
      const expiredEmbed = new EmbedBuilder()
        .setTitle(`❌ SVIP Privileges Expired`)
        .setDescription(
          `<@${svipUser.userId}>'s SVIP privileges have been removed due to not re-boosting within the grace period.\n\n` +
          `**Actions taken:**\n` +
          `• SVIP role removed\n` +
          `• Custom role deleted\n` +
          `• Voice channel deleted (if any)\n` +
          `• All role members removed\n\n` +
          `They can regain access by boosting the server again.`
        )
        .setColor(config.embedColors.error)
        .setTimestamp();
      
      await sendSvipNotification(client, expiredEmbed);
      
      // Send DM to user
      const userDmEmbed = new EmbedBuilder()
        .setTitle(`❌ SVIP Privileges Expired`)
        .setDescription(
          `Your SVIP privileges have been removed because you didn't re-boost within the 7-day grace period.\n\n` +
          `**What was removed:**\n` +
          `• SVIP role and permissions\n` +
          `• Your custom role\n` +
          `• Your voice channel (if any)\n` +
          `• All members from your role\n\n` +
          `**To regain access:** Boost the server again to unlock SVIP features.`
        )
        .setColor(config.embedColors.error)
        .setTimestamp();
      
      await sendUserDM(client, svipUser.userId, userDmEmbed);
      
      logger.warn(`Removed SVIP privileges for ${member.user.tag} (grace period expired)`);
    }
    
  } catch (error) {
    logger.error("Error checking grace periods:", error);
  }
}

/**
 * Send grace period warnings
 */
async function sendGraceWarnings() {
  try {
    const SvipUser = require("../../schema/SvipUser.js");
    const now = new Date();
    
    // Find users in grace period
    const graceUsers = await SvipUser.find({
      graceExpirationDate: { $gt: now },
      isActive: true
    });
    
    for (const svipUser of graceUsers) {
      const timeUntilExpiration = svipUser.graceExpirationDate.getTime() - now.getTime();
      const hoursUntilExpiration = timeUntilExpiration / (1000 * 60 * 60);
      
      // Send 48-hour warning
      if (hoursUntilExpiration <= 48 && hoursUntilExpiration > 24 && !svipUser.notificationsSent.graceWarning) {
        const warningEmbed = new EmbedBuilder()
          .setTitle(`⚠️ Grace Period Warning - 48 Hours Left`)
          .setDescription(
            `<@${svipUser.userId}>, you have **48 hours** left to re-boost the server to keep your SVIP privileges.\n\n` +
            `**Expires:** <t:${Math.floor(svipUser.graceExpirationDate.getTime() / 1000)}:R>\n\n` +
            `**To prevent loss:** Boost the server before the deadline.`
          )
          .setColor(config.embedColors.warning)
          .setTimestamp();
        
        await sendSvipNotification(client, warningEmbed, `<@${svipUser.userId}>`);
        await sendUserDM(client, svipUser.userId, warningEmbed);
        
        svipUser.notificationsSent.graceWarning = true;
        await svipUser.save();
      }
      
      // Send 24-hour final warning
      else if (hoursUntilExpiration <= 24 && hoursUntilExpiration > 1 && !svipUser.notificationsSent.finalWarning) {
        const finalWarningEmbed = new EmbedBuilder()
          .setTitle(`🚨 FINAL WARNING - 24 Hours Left`)
          .setDescription(
            `<@${svipUser.userId}>, this is your **FINAL WARNING**! You have less than 24 hours to re-boost the server.\n\n` +
            `**Expires:** <t:${Math.floor(svipUser.graceExpirationDate.getTime() / 1000)}:R>\n\n` +
            `**What you'll lose:**\n` +
            `❌ SVIP role and permissions\n` +
            `❌ Your custom role\n` +
            `❌ Your voice channel\n` +
            `❌ All members from your role\n\n` +
            `**BOOST NOW to prevent this!**`
          )
          .setColor(config.embedColors.error)
          .setTimestamp();
        
        await sendSvipNotification(client, finalWarningEmbed, `<@${svipUser.userId}>`);
        await sendUserDM(client, svipUser.userId, finalWarningEmbed);
        
        svipUser.notificationsSent.finalWarning = true;
        await svipUser.save();
      }
    }
    
  } catch (error) {
    logger.error("Error sending grace warnings:", error);
  }
}

/**
 * Monthly boost verification
 */
async function monthlyBoostCheck() {
  try {
    const SvipUser = require("../../schema/SvipUser.js");
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;
    
    await guild.members.fetch(); // Ensure all members are cached
    
    const activeUsers = await SvipUser.find({ isActive: true });
    
    for (const svipUser of activeUsers) {
      const member = guild.members.cache.get(svipUser.userId);
      if (!member) continue;
      
      const stillMeetsRequirements = await meetsBoostRequirements(guild, svipUser.userId);
      
      if (!stillMeetsRequirements && !svipUser.graceExpirationDate) {
        // User no longer meets requirements, start grace period
        const graceExpirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        svipUser.graceExpirationDate = graceExpirationDate;
        svipUser.notificationsSent.graceWarning = false;
        svipUser.notificationsSent.finalWarning = false;
        await svipUser.save();
        
        const monthlyWarningEmbed = new EmbedBuilder()
          .setTitle(`⚠️ Monthly Boost Check - Grace Period Started`)
          .setDescription(
            `<@${svipUser.userId}>, our monthly boost verification shows you no longer meet SVIP requirements.\n\n` +
            `You have **7 days** to re-boost to keep your SVIP privileges.\n\n` +
            `**Grace period expires:** <t:${Math.floor(graceExpirationDate.getTime() / 1000)}:R>`
          )
          .setColor(config.embedColors.warning)
          .setTimestamp();
        
        await sendSvipNotification(client, monthlyWarningEmbed, `<@${svipUser.userId}>`);
        await sendUserDM(client, svipUser.userId, monthlyWarningEmbed);
      }
      
      // Update last boost check
      svipUser.lastBoostCheck = new Date();
      await svipUser.save();
    }
    
    logger.info("Monthly boost check completed");
    
  } catch (error) {
    logger.error("Error in monthly boost check:", error);
  }
}

module.exports = {
  initializeSvipCron,
  checkExpiredTrials,
  checkGracePeriods,
  sendGraceWarnings,
  monthlyBoostCheck
};
