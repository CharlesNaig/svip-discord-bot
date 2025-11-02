const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    MessageFlags
} = require("discord.js");
const config = require("../../config/config.js");
const logger = require("../../utils/logger.js");
const { meetsBoostRequirements } = require("../../utils/svipUtils.js");
const { devBoostManager } = require("../../utils/devBoostManager.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sviptest")
        .setDescription("[DEV] Test SVIP system with current boost requirements")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("User to test SVIP access for (defaults to yourself)")
                .setRequired(false)
        ),
    name: "sviptest",
    description: "[DEV] Test SVIP system with current boost requirements",
    prefix: true,
    
    // Permission check method
    hasPermission(userId) {
        return config.naig.includes(userId) || userId === config.developerId;
    },
    
    async execute(interaction) {
        // Check permissions
        if (!this.hasPermission(interaction.user.id)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Access Denied")
                .setDescription("You don't have permission to use this command.")
                .setColor(config.embedColors.error);
                
            return interaction.reply({
                embeds: [errorEmbed],
                flags: MessageFlags.Ephemeral
            });
        }

        // Check if SVIP system is enabled
        if (!config.svip.enabled) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ SVIP System Disabled")
                .setDescription("The SVIP system is currently disabled in the config.")
                .setColor(config.embedColors.error);
                
            return interaction.reply({
                embeds: [errorEmbed],
                flags: MessageFlags.Ephemeral
            });
        }

        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            const meetsRequirements = await meetsBoostRequirements(interaction.guild, targetUser.id);
            const isDevMode = devBoostManager.isDevMode();
            const stats = devBoostManager.getStats();

            let boostInfo = "";
            let systemInfo = "";

            if (isDevMode) {
                const userBoost = devBoostManager.getUserBoost(targetUser.id);
                boostInfo = `**Development Mode Boost Data:**\n` +
                           `👤 User has fake boost: ${userBoost ? '✅ Yes' : '❌ No'}\n` +
                           `📊 Server fake boost count: ${stats.totalBoosts}\n` +
                           `🏆 Fake boost tier: ${stats.boostTier}\n` +
                           `${userBoost ? `📅 Fake boost since: ${new Date(userBoost.boostSince).toLocaleDateString()}\n` : ''}`;
                
                systemInfo = "🟢 **Development Mode Active**\n✅ Using fake boost data for testing";
            } else {
                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                const realBoostCount = interaction.guild.premiumSubscriptionCount || 0;
                
                boostInfo = `**Real Discord Boost Data:**\n` +
                           `👤 User is boosting: ${member?.premiumSince ? '✅ Yes' : '❌ No'}\n` +
                           `📊 Server boost count: ${realBoostCount}\n` +
                           `🏆 Server boost tier: ${interaction.guild.premiumTier || 0}\n` +
                           `${member?.premiumSince ? `📅 Boosting since: ${member.premiumSince.toLocaleDateString()}\n` : ''}`;
                
                systemInfo = "🔴 **Production Mode Active**\n❌ Using real Discord boost data";
            }

            const embed = new EmbedBuilder()
                .setTitle("🧪 SVIP System Test Results")
                .setDescription(
                    `**Test Subject:** ${targetUser}\n` +
                    `**SVIP Access:** ${meetsRequirements ? '✅ **GRANTED**' : '❌ **DENIED**'}\n\n` +
                    `${systemInfo}\n\n` +
                    `${boostInfo}\n` +
                    `**Requirements:**\n` +
                    `🎯 Server must have: ${config.svip.boostrequire}+ boosts\n` +
                    `👤 User must be boosting: Required\n\n` +
                    `**Result Analysis:**\n` +
                    `${stats.totalBoosts >= parseInt(config.svip.boostrequire) ? '✅' : '❌'} Server meets boost requirement (${stats.totalBoosts}/${config.svip.boostrequire})\n` +
                    `${meetsRequirements ? '✅' : '❌'} User meets all requirements`
                )
                .setColor(meetsRequirements ? config.embedColors.success : config.embedColors.error)
                .setTimestamp();

            // Add quick action buttons for dev mode
            if (isDevMode && this.hasPermission(interaction.user.id)) {
                const userBoost = devBoostManager.getUserBoost(targetUser.id);
                
                const addButton = new ButtonBuilder()
                    .setCustomId(`devtest_add_${targetUser.id}`)
                    .setLabel(`${userBoost ? 'Already Boosting' : 'Add Fake Boost'}`)
                    .setStyle(userBoost ? ButtonStyle.Secondary : ButtonStyle.Success)
                    .setDisabled(!!userBoost);

                const removeButton = new ButtonBuilder()
                    .setCustomId(`devtest_remove_${targetUser.id}`)
                    .setLabel(`${userBoost ? 'Remove Fake Boost' : 'No Boost to Remove'}`)
                    .setStyle(userBoost ? ButtonStyle.Danger : ButtonStyle.Secondary)
                    .setDisabled(!userBoost);

                const row = new ActionRowBuilder().addComponents(addButton, removeButton);

                await interaction.reply({ 
                    embeds: [embed], 
                    components: [row], 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

        } catch (error) {
            logger.error("Error in sviptest command:", error);

            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Test Error")
                .setDescription("An error occurred while testing SVIP access.")
                .setColor(config.embedColors.error);

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }
    }
};