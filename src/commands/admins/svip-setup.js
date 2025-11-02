const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const permanentSvipMenu = require("../../utils/permanentMenu.js");
const logger = require("../../utils/logger.js");
const config = require("../../config/config.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("svip-setup")
    .setDescription("Admin command to manage the permanent SVIP menu")
    .addSubcommand(subcommand =>
      subcommand
        .setName("post")
        .setDescription("Post/update the permanent SVIP menu")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("refresh")
        .setDescription("Manually refresh the SVIP menu buttons")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("status")
        .setDescription("Check the status of the permanent SVIP menu")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    // Check if SVIP system is enabled
    if (!config.svip.enabled) {
      return interaction.reply({
        content: "❌ The SVIP system is currently disabled.",
        flags: MessageFlags.Ephemeral
      });
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "post":
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
          await permanentSvipMenu.updateMenu(interaction.client);
          await interaction.editReply({
            content: "✅ **SVIP Menu Posted/Updated Successfully!**\n\n" +
                    `📍 **Channel:** <#${permanentSvipMenu.channelId}>\n` +
                    `🔄 **Auto-refresh:** Every 10 minutes\n` +
                    `⏰ **Last updated:** <t:${Math.floor(Date.now() / 1000)}:R>`
          });
        } catch (error) {
          logger.error("Error posting SVIP menu:", error);
          await interaction.editReply({
            content: "❌ **Error posting SVIP menu.** Please check bot permissions and try again."
          });
        }
        break;

      case "refresh":
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
          await permanentSvipMenu.updateMenu(interaction.client);
          await interaction.editReply({
            content: "✅ **SVIP Menu Refreshed!**\n\n" +
                    `🔄 **Buttons updated:** <t:${Math.floor(Date.now() / 1000)}:R>\n` +
                    `⏰ **Next auto-refresh:** <t:${Math.floor((Date.now() + 600000) / 1000)}:R>`
          });
        } catch (error) {
          logger.error("Error refreshing SVIP menu:", error);
          await interaction.editReply({
            content: "❌ **Error refreshing SVIP menu.** Please check bot permissions and try again."
          });
        }
        break;

      case "status":
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const isActive = permanentSvipMenu.refreshInterval !== null;
        const hasMessage = permanentSvipMenu.messageId !== null;
        
        await interaction.editReply({
          content: "📊 **SVIP Menu Status**\n\n" +
                  `🔄 **Auto-refresh:** ${isActive ? "✅ Active" : "❌ Inactive"}\n` +
                  `📨 **Menu message:** ${hasMessage ? "✅ Exists" : "❌ Not found"}\n` +
                  `📍 **Channel:** <#${permanentSvipMenu.channelId}>\n` +
                  `🆔 **Message ID:** \`${permanentSvipMenu.messageId || "None"}\`\n\n` +
                  `${!isActive || !hasMessage ? "💡 Use \`/svip-setup post\` to initialize the menu." : ""}`
        });
        break;
    }
  },
};
