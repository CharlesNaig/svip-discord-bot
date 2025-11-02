const { EmbedBuilder } = require("discord.js");
const config = require("../../config/config.js");
const logger = require("../../utils/logger.js");
const {
  getUserBoostCount,
  meetsBoostRequirements,
  grantSvipRole,
  removeSvipRole,
  sendSvipNotification,
  sendUserDM,
  isDeveloper
} = require("../../utils/svipUtils.js");

// Track recent notifications to prevent duplicates
const recentUpdateNotifications = new Map();

module.exports = {
  name: "guildMemberUpdate",
  async execute(oldMember, newMember, client) {
    try {
      // Handle SVIP boost detection first (only if SVIP is enabled)
      if (config.svip.enabled) {
        await handleSvipBoostChanges(oldMember, newMember, client);
      }

      // Original member update tracking for guarded users
      await handleGuardedUserUpdates(oldMember, newMember, client);

    } catch (error) {
      logger.error("Error in guildMemberUpdate event:", error);
    }
  },
};

/**
 * Handle SVIP boost changes
 */
async function handleSvipBoostChanges(oldMember, newMember, client) {
  try {
    const SvipUser = require("../../schema/SvipUser.js");
    const CustomRole = require("../../schema/CustomRole.js");

    // Only process boost changes
    if (oldMember.premiumSince === newMember.premiumSince) return;

    const userId = newMember.user.id;
    const guild = newMember.guild;
    
    // Get current boost status
    const oldBoostCount = await getUserBoostCount(guild, oldMember.user.id);
    const newBoostCount = await getUserBoostCount(guild, newMember.user.id);
    
    logger.info(`Boost change detected for ${newMember.user.tag}: ${oldBoostCount} -> ${newBoostCount}`);

    // Find or create SVIP user record
    let svipUser = await SvipUser.findOne({ userId });
    if (!svipUser) {
      svipUser = new SvipUser({
        userId,
        boostCount: newBoostCount,
        boostStartDate: newMember.premiumSince,
        lastBoostUpdate: new Date()
      });
    } else {
      svipUser.boostCount = newBoostCount;
      svipUser.lastBoostUpdate = new Date();
      svipUser.boostStartDate = newMember.premiumSince;
    }

    // Check if user now meets requirements
    const meetsRequirements = await meetsBoostRequirements(guild, userId);
    
    // User started boosting and meets requirements
    if (!oldMember.premiumSince && newMember.premiumSince && meetsRequirements) {
      await handleBoostGain(newMember, svipUser, client);
    }
    // User stopped boosting
    else if (oldMember.premiumSince && !newMember.premiumSince) {
      await handleBoostLoss(newMember, svipUser, client);
    }
    // User still boosting but check if they meet requirements
    else if (newMember.premiumSince) {
      if (meetsRequirements && !newMember.roles.cache.has(config.svip.svipRoleId)) {
        await handleBoostGain(newMember, svipUser, client);
      }
    }

    // Reset grace period if user is boosting again
    if (newMember.premiumSince && svipUser.graceExpirationDate) {
      svipUser.graceExpirationDate = null;
      svipUser.notificationsSent.graceWarning = false;
      svipUser.notificationsSent.finalWarning = false;
      
      // Send restored notification
      const restoreEmbed = new EmbedBuilder()
        .setTitle(`✅ Boost Restored`)
        .setDescription(
          `<@${userId}>, welcome back! Your boost has been restored and your SVIP privileges are active again.`
        )
        .setColor(config.embedColors.success)
        .setTimestamp();
      
      await sendSvipNotification(client, restoreEmbed, `<@${userId}>`);
      await sendUserDM(client, userId, restoreEmbed);
    }

    await svipUser.save();

  } catch (error) {
    logger.error("Error handling SVIP boost changes:", error);
  }
}

/**
 * Handle when user gains boost eligibility
 */
async function handleBoostGain(member, svipUser, client) {
  try {
    const userId = member.user.id;
    const guild = member.guild;
    
    // Grant SVIP role
    const roleGranted = await grantSvipRole(guild, userId);
    
    if (roleGranted) {
      // Create congratulatory embed
      const boostEmbed = new EmbedBuilder()
        .setTitle(`🎉 SVIP Access Granted!`)
        .setDescription(
          `Congratulations <@${userId}>! You now have access to SVIP features.\n\n` +
          `**Benefits:**\n` +
          `✨ Create your own custom role\n` +
          `🎨 Customize role appearance\n` +
          `👥 Add up to 25 members to your role\n` +
          `🎤 Create a private voice channel\n` +
          `⚡ Manage role permissions\n\n` +
          `Use the SVIP menu to get started!`
        )
        .setColor(config.embedColors.success)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      // Send notifications
      await sendSvipNotification(client, boostEmbed, `<@${userId}>`);
      await sendUserDM(client, userId, boostEmbed);

      // Also send boost announcement to boost channel
      const boostChannel = guild.channels.cache.get(config.svip.boostChannelId);
      if (boostChannel) {
        const publicBoostEmbed = new EmbedBuilder()
          .setTitle(`🚀 New SVIP Member!`)
          .setAuthor({
            name: member.user.username,
            iconURL: member.user.displayAvatarURL({ dynamic: true }),
          })
          .setDescription(
            `<@${userId}> has unlocked SVIP privileges by boosting the server!\n\n` +
            `Thank you for supporting **${guild.name}**! 💜`
          )
          .setImage("https://cdn.discordapp.com/attachments/1102122941854007327/1280523314879664282/TBYN-SINGLEBOOST.png")
          .setColor("#ff73fa")
          .setFooter({
            text: `Total Server Boosts: ${guild.premiumSubscriptionCount || 0}`,
            iconURL: guild.iconURL(),
          })
          .setTimestamp();

        await boostChannel.send({
          content: `<@${userId}> 🎉`,
          embeds: [publicBoostEmbed],
        });
      }

      // Update SVIP user record
      svipUser.isActive = true;
      svipUser.graceExpirationDate = null;
      svipUser.notificationsSent.graceWarning = false;
      svipUser.notificationsSent.finalWarning = false;
    }

  } catch (error) {
    logger.error(`Error handling boost gain for ${member.user.tag}:`, error);
  }
}

/**
 * Handle when user loses boost
 */
async function handleBoostLoss(member, svipUser, client) {
  try {
    const userId = member.user.id;
    const guild = member.guild;
    
    // Set 7-day grace period
    const graceExpirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    svipUser.graceExpirationDate = graceExpirationDate;
    svipUser.notificationsSent.graceWarning = false;
    svipUser.notificationsSent.finalWarning = false;

    // Create warning embed
    const warningEmbed = new EmbedBuilder()
      .setTitle(`⚠️ Boost Removed - Grace Period Started`)
      .setDescription(
        `<@${userId}>, your server boost has been removed. You have **7 days** to re-boost to keep your SVIP privileges.\n\n` +
        `**What happens if you don't re-boost:**\n` +
        `❌ SVIP role will be removed\n` +
        `❌ Custom role will be deleted\n` +
        `❌ Voice channel will be deleted\n` +
        `❌ All role members will be removed\n\n` +
        `**Grace period expires:** <t:${Math.floor(graceExpirationDate.getTime() / 1000)}:R>\n\n` +
        `**To prevent this:** Re-boost the server within 7 days.`
      )
      .setColor(config.embedColors.warning)
      .setTimestamp();

    // Send notifications
    await sendSvipNotification(client, warningEmbed, `<@${userId}>`);
    await sendUserDM(client, userId, warningEmbed);

    logger.warn(`${member.user.tag} lost boost - 7 day grace period started`);

  } catch (error) {
    logger.error(`Error handling boost loss for ${member.user.tag}:`, error);
  }
}

/**
 * Handle original guarded user updates
 */
async function handleGuardedUserUpdates(oldMember, newMember, client) {
  try {
    const guardedUsers = config.naig; // Array of user IDs to guard
    const naig = config.developerId;

    // Check if the updated member is in the guarded list
    if (!guardedUsers.includes(newMember.id)) return;

    const currentTime = Date.now();
    const notificationKey = `${newMember.id}:${Math.floor(currentTime / 5000)}`;

    // Prevent duplicate notifications within 5 seconds
    if (recentUpdateNotifications.has(notificationKey)) return;
    
    recentUpdateNotifications.set(notificationKey, true);
    setTimeout(() => {
      recentUpdateNotifications.delete(notificationKey);
    }, 5000);

    const user = await client.users.fetch(naig);
    const changes = [];

    // Check for nickname changes
    if (oldMember.nickname !== newMember.nickname) {
      changes.push({
        name: "Nickname Change",
        value: `${oldMember.nickname || "*No nickname*"} → ${newMember.nickname || "*No nickname*"}`
      });
    }

    // Check for role changes
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
    
    if (addedRoles.size > 0) {
      changes.push({
        name: "Roles Added",
        value: addedRoles.map(r => `${r.name}`).join(", ")
      });
    }
    
    if (removedRoles.size > 0) {
      changes.push({
        name: "Roles Removed",
        value: removedRoles.map(r => `${r.name}`).join(", ")
      });
    }

    // Check for timeout (mute) status changes
    if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
      const timeoutDuration = Math.floor((newMember.communicationDisabledUntil - new Date()) / 1000 / 60);
      changes.push({
        name: "Timeout Applied",
        value: `User has been timed out for ${timeoutDuration} minutes`
      });
    }
    
    if (oldMember.communicationDisabledUntil && !newMember.communicationDisabledUntil) {
      changes.push({
        name: "Timeout Removed",
        value: "User's timeout has been removed"
      });
    }

    // If no changes were detected that we track, return early
    if (changes.length === 0) return;

    // Create and send the notification
    const embed = new EmbedBuilder()
      .setTitle("`👤` Member Updated")
      .setDescription(`<@${newMember.id}> (${newMember.user.tag}) has been updated in ${newMember.guild.name}`)
      .addFields(changes)
      .setColor(config.embedColors.warning)
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await user.send({ embeds: [embed] });
    logger.info(`Member update notification sent for ${newMember.user.tag}`);
  } catch (error) {
    logger.error("Error in guarded user updates:", error);
  }
}