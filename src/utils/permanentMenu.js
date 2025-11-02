const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const logger = require("./logger.js");
const config = require("../config/config.js");

/**
 * Manages the permanent SVIP menu message
 */
class PermanentSvipMenu {
  constructor() {
    this.messageId = null;
    this.channelId = "1275380970631200841"; // SVIP menu channel
    this.refreshInterval = null;
  }

  /**
   * Create the SVIP menu embed
   */
  createMenuEmbed(guild) {
    const gld = "<a:t247_Ystar_rolling:1314525168491565098>";
    
    return new EmbedBuilder()
      .setDescription(
        `<:SVIP:1314521308138307615> **SVIP.BOOSTER MENU**\n\n***INTERACTIVE BUTTONS:***\n\n` +
        `${gld} **\`Create Role\`**\n` +
        `> *Creates your own custom role linked to your boost status.*\n` +
        `> By clicking this button you can create a personalized role that lasts as long as you maintain your boost.\n\n` +
        `${gld} **\`Edit Role\`**\n` +
        `> *Edits your existing custom role.*\n` +
        `> Update your role's name, color, and icon through an interactive modal.\n\n` +
        `${gld} **\`Add Member\`**\n` +
        `> *Add members to your personalized role.*\n` +
        `> Select up to 25 members and set duration (minutes, hours, days, or permanent).\n\n` +
        `${gld} **\`Remove Member\`**\n` +
        `> *Remove members from your personalized role.*\n` +
        `> Select members to remove from your custom role.\n\n` +
        `${gld} **\`Request Role\`**\n` +
        `> *Request access to someone's custom role.*\n` +
        `> Browse available custom roles and request temporary access.\n\n` +
        `${gld} **\`Create Voice\`**\n` +
        `> *Creates a personalized voice channel.*\n` +
        `> Creates a voice channel linked to your boost status with custom permissions.\n\n` +
        `${gld} **\`Manage Role\`**\n` +
        `> *Advanced role management options.*\n` +
        `> Add admins, view statistics, and manage role settings.`
      )
      .setThumbnail(guild.iconURL({ dynamic: true, size: 4096 }))
      .setImage(
        "https://cdn.discordapp.com/attachments/1102122941854007327/1314541768091635723/SVIP_MENU.png"
      )
      .setFooter({
        text: `SVIP.BOOSTER MENU | ${guild.name} | Last refreshed`,
        iconURL: guild.iconURL(),
      })
      .setColor("#ffd700")
      .setTimestamp();
  }

  /**
   * Create menu buttons
   */
  createMenuButtons() {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("svip_create_role")
        .setEmoji("1314525168491565098")
        .setLabel("Create Role")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("svip_edit_role")
        .setEmoji("1314525168491565098")
        .setLabel("Edit Role")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("svip_create_voice")
        .setEmoji("1314525168491565098")
        .setLabel("Create Voice")
        .setStyle(ButtonStyle.Success)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("svip_add_member")
        .setEmoji("1314525168491565098")
        .setLabel("Add Member")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("svip_remove_member")
        .setEmoji("1314525168491565098")
        .setLabel("Remove Member")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("svip_request_role")
        .setEmoji("1314525168491565098")
        .setLabel("Request Role")
        .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("svip_manage_role")
        .setEmoji("1314525168491565098")
        .setLabel("Manage Role")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("svip_role_list")
        .setEmoji("1314525168491565098")
        .setLabel("View Roles")
        .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2, row3];
  }

  /**
   * Post or update the permanent menu
   */
  async updateMenu(client) {
    try {
      const guild = client.guilds.cache.get(config.guildId);
      if (!guild) {
        logger.error("Guild not found for permanent SVIP menu");
        return;
      }

      const channel = guild.channels.cache.get(this.channelId);
      if (!channel) {
        logger.error(`SVIP menu channel ${this.channelId} not found`);
        return;
      }

      const embed = this.createMenuEmbed(guild);
      const components = this.createMenuButtons();

      // Try to update existing message
      if (this.messageId) {
        try {
          const existingMessage = await channel.messages.fetch(this.messageId);
          await existingMessage.edit({ embeds: [embed], components });
          logger.info("Updated permanent SVIP menu");
          return;
        } catch (error) {
          logger.warn("Could not update existing SVIP menu message, creating new one");
          this.messageId = null;
        }
      }

      // Create new message
      const message = await channel.send({ embeds: [embed], components });
      this.messageId = message.id;
      
      // Save message ID to database for persistence
      await this.saveMessageId();
      
      logger.success("Created new permanent SVIP menu");

    } catch (error) {
      logger.error("Error updating permanent SVIP menu:", error);
    }
  }

  /**
   * Start auto-refresh interval
   */
  startAutoRefresh(client) {
    // Refresh every 10 minutes to prevent button expiration
    this.refreshInterval = setInterval(() => {
      this.updateMenu(client);
    }, 10 * 60 * 1000); // 10 minutes

    logger.info("Started SVIP menu auto-refresh (every 10 minutes)");
  }

  /**
   * Stop auto-refresh interval
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      logger.info("Stopped SVIP menu auto-refresh");
    }
  }

  /**
   * Load message ID from database
   */
  async loadMessageId() {
    try {
      const SvipMenuMessage = require("../schema/SvipMenuMessage.js");
      const saved = await SvipMenuMessage.findOne();
      if (saved) {
        this.messageId = saved.messageId;
      }
    } catch (error) {
      logger.warn("Could not load saved SVIP menu message ID:", error);
    }
  }

  /**
   * Save message ID to database
   */
  async saveMessageId() {
    try {
      const SvipMenuMessage = require("../schema/SvipMenuMessage.js");
      await SvipMenuMessage.findOneAndUpdate(
        {},
        { 
          messageId: this.messageId,
          channelId: this.channelId,
          lastUpdated: new Date()
        },
        { upsert: true }
      );
    } catch (error) {
      logger.warn("Could not save SVIP menu message ID:", error);
    }
  }

  /**
   * Initialize the permanent menu system
   */
  async initialize(client) {
    await this.loadMessageId();
    await this.updateMenu(client);
    this.startAutoRefresh(client);
  }
}

// Export singleton instance
const permanentSvipMenu = new PermanentSvipMenu();
module.exports = permanentSvipMenu;
