const { EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger.js");
const config = require("../../config/config.js");
const { initializeSvipCron } = require("../../utils/cronJobs.js");
const { updateRoleListEmbed } = require("../../utils/roleListManager.js");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    // Check if SVIP system is enabled
    if (!config.svip.enabled) {
      logger.warn("SVIP system is disabled in config");
      return;
    }

    try {
      logger.info("Initializing SVIP system...");
      
      // Initialize cron jobs
      await initializeSvipCron(client);
      
      // Initial role list update
      await updateRoleListEmbed(client);
      
      // Set up periodic role list updates (every 30 seconds)
      setInterval(async () => {
        try {
          await updateRoleListEmbed(client);
        } catch (error) {
          logger.error("Error in periodic role list update:", error);
        }
      }, 30 * 1000);
      
      // Verify SVIP configuration
      const guild = client.guilds.cache.get(config.guildId);
      if (guild) {
        const svipRole = guild.roles.cache.get(config.svip.svipRoleId);
        const boostChannel = guild.channels.cache.get(config.svip.boostChannelId);
        const notifyChannel = guild.channels.cache.get(config.svip.notifyChannelId);
        const category = guild.channels.cache.get(config.svip.categoryId);
        
        if (!svipRole) {
          logger.warn(`SVIP role not found: ${config.svip.svipRoleId}`);
        }
        
        if (!boostChannel) {
          logger.warn(`Boost channel not found: ${config.svip.boostChannelId}`);
        }
        
        if (!notifyChannel) {
          logger.warn(`Notify channel not found: ${config.svip.notifyChannelId}`);
        }
        
        if (!category) {
          logger.warn(`SVIP category not found: ${config.svip.categoryId}`);
        }
        
        if (svipRole && boostChannel && notifyChannel && category) {
          logger.success("SVIP system configuration verified successfully");
        }
      }
      
      // Send startup notification
      const startupEmbed = new EmbedBuilder()
        .setTitle(`\`🟢\` SVIP System Online`)
        .setDescription(
          `The SVIP system has been successfully initialized and is now running!\n\n` +
          `**Features Active:**\n` +
          `✅ Automatic boost detection\n` +
          `✅ Role expiration management\n` +
          `✅ Grace period monitoring\n` +
          `✅ Live role list updates\n` +
          `✅ DM notifications\n` +
          `✅ Monthly boost verification\n\n` +
          `**Next Update:** <t:${Math.floor((Date.now() + 30000) / 1000)}:R>`
        )
        .setColor(config.embedColors.success)
        .setTimestamp();

      // Send to logs channel
      const logsChannel = guild?.channels.cache.get(config.logsChannel);
      if (logsChannel) {
        await logsChannel.send({ embeds: [startupEmbed] });
      }
      
      logger.success("SVIP system fully initialized and ready!");
      
    } catch (error) {
      logger.error("Error initializing SVIP system:", error);
    }
  },
};
