const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    Colors,
    MessageFlags
} = require("discord.js");
const config = require("../../config/config.js");
const logger = require("../../utils/logger.js");
const { devBoostManager } = require("../../utils/devBoostManager.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("booststore")
        .setDescription("[DEV] Manage the fake boost store for testing")
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add a fake boost for a user")
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("User to add boost for")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove a fake boost from a user")
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("User to remove boost from")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("List all fake boosts")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("reset")
                .setDescription("Reset the entire boost store")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("stats")
                .setDescription("Show boost store statistics")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("check")
                .setDescription("Check if a user meets boost requirements")
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("User to check boost status for")
                        .setRequired(true)
                )
        ),
    name: "booststore",
    description: "[DEV] Manage the fake boost store for testing",
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

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'add': {
                    const user = interaction.options.getUser('user');
                    const success = devBoostManager.addBoost(user.id, user.username);
                    
                    if (success) {
                        const stats = devBoostManager.getStats();
                        const embed = new EmbedBuilder()
                            .setTitle("✅ Boost Added")
                            .setDescription(
                                `Successfully added fake boost for ${user}!\n\n` +
                                `**Updated Statistics:**\n` +
                                `📊 Total Server Boosts: ${stats.totalBoosts}\n` +
                                `🏆 Server Boost Tier: ${stats.boostTier}\n` +
                                `👥 Active Boosters: ${stats.activeBooters}\n\n` +
                                `**Note:** ${devBoostManager.isDevMode() ? 'Development mode is enabled - using fake data.' : '⚠️ Development mode is disabled - this won\'t affect SVIP checks!'}`
                            )
                            .setColor(config.embedColors.success)
                            .setTimestamp();

                        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    } else {
                        throw new Error("Failed to add boost");
                    }
                    break;
                }

                case 'remove': {
                    const user = interaction.options.getUser('user');
                    const success = devBoostManager.removeBoost(user.id);
                    
                    if (success) {
                        const stats = devBoostManager.getStats();
                        const embed = new EmbedBuilder()
                            .setTitle("✅ Boost Removed")
                            .setDescription(
                                `Successfully removed fake boost from ${user}!\n\n` +
                                `**Updated Statistics:**\n` +
                                `📊 Total Server Boosts: ${stats.totalBoosts}\n` +
                                `🏆 Server Boost Tier: ${stats.boostTier}\n` +
                                `👥 Active Boosters: ${stats.activeBooters}`
                            )
                            .setColor(config.embedColors.warning)
                            .setTimestamp();

                        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    } else {
                        const embed = new EmbedBuilder()
                            .setTitle("❌ Boost Not Found")
                            .setDescription(`${user} doesn't have a fake boost to remove.`)
                            .setColor(config.embedColors.error);

                        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    }
                    break;
                }

                case 'list': {
                    const allBoosts = devBoostManager.getAllBoosts();
                    
                    if (allBoosts.length === 0) {
                        const embed = new EmbedBuilder()
                            .setTitle("📋 Boost Store List")
                            .setDescription("No fake boosts found in the store.")
                            .setColor(config.embedColors.info);

                        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                        break;
                    }

                    const boostList = allBoosts.map((boost, index) => {
                        const date = new Date(boost.boostSince);
                        return `${index + 1}. <@${boost.userId}> (${boost.username})\n   • Boosts: ${boost.boostCount}\n   • Since: ${date.toLocaleDateString()}`;
                    }).join('\n\n');

                    const stats = devBoostManager.getStats();
                    const embed = new EmbedBuilder()
                        .setTitle("📋 Fake Boost Store List")
                        .setDescription(
                            `**Server Statistics:**\n` +
                            `📊 Total Boosts: ${stats.totalBoosts}\n` +
                            `🏆 Boost Tier: ${stats.boostTier}\n` +
                            `👥 Active Boosters: ${stats.activeBooters}\n\n` +
                            `**Active Boosters:**\n${boostList}`
                        )
                        .setColor(config.embedColors.info)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    break;
                }

                case 'reset': {
                    // Show confirmation buttons
                    const confirmButton = new ButtonBuilder()
                        .setCustomId('booststore_reset_confirm')
                        .setLabel('Yes, Reset')
                        .setStyle(ButtonStyle.Danger);

                    const cancelButton = new ButtonBuilder()
                        .setCustomId('booststore_reset_cancel')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary);

                    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                    const embed = new EmbedBuilder()
                        .setTitle("⚠️ Confirm Reset")
                        .setDescription(
                            "Are you sure you want to reset the entire boost store?\n\n" +
                            "**This will:**\n" +
                            "❌ Remove all fake boosts\n" +
                            "❌ Reset server boost count to 0\n" +
                            "❌ Set boost tier to 0\n" +
                            "❌ Clear all boost history\n\n" +
                            "**This action cannot be undone!**"
                        )
                        .setColor(config.embedColors.warning);

                    await interaction.reply({ 
                        embeds: [embed], 
                        components: [row], 
                        flags: MessageFlags.Ephemeral 
                    });
                    break;
                }

                case 'stats': {
                    const stats = devBoostManager.getStats();
                    const allBoosts = devBoostManager.getAllBoosts();
                    
                    const embed = new EmbedBuilder()
                        .setTitle("📊 Boost Store Statistics")
                        .setDescription(
                            `**Development Mode:** ${stats.devMode ? '🟢 Enabled' : '🔴 Disabled'}\n\n` +
                            `**Server Statistics:**\n` +
                            `📊 Total Boosts: ${stats.totalBoosts}\n` +
                            `🏆 Boost Tier: ${stats.boostTier}\n` +
                            `👥 Active Boosters: ${stats.activeBooters}\n` +
                            `📈 Total Users: ${stats.totalBooters}\n\n` +
                            `**SVIP Requirements:**\n` +
                            `🎯 Required Boosts: ${config.svip.boostrequire}\n` +
                            `${stats.totalBoosts >= parseInt(config.svip.boostrequire) ? '✅' : '❌'} Server meets boost requirement\n\n` +
                            `**System Status:**\n` +
                            `${stats.devMode ? '✅ Using fake boost data' : '❌ Using real Discord data'}\n` +
                            `${stats.devMode ? '✅ SVIP developer bypass active' : '❌ Normal SVIP validation'}`
                        )
                        .setColor(stats.devMode ? config.embedColors.success : config.embedColors.info)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    break;
                }

                case 'check': {
                    const user = interaction.options.getUser('user');
                    const meetsRequirements = await devBoostManager.meetsBoostRequirements(interaction.guild, user.id);
                    const userBoost = devBoostManager.getUserBoost(user.id);
                    const stats = devBoostManager.getStats();
                    
                    const embed = new EmbedBuilder()
                        .setTitle(`🔍 Boost Check: ${user.username}`)
                        .setDescription(
                            `**User:** ${user}\n` +
                            `**Boost Status:** ${meetsRequirements ? '✅ Meets Requirements' : '❌ Does Not Meet Requirements'}\n\n` +
                            `**Current System:** ${devBoostManager.isDevMode() ? '🟢 Development Mode' : '🔴 Production Mode'}\n\n` +
                            `**Details:**\n` +
                            `👤 User has boost: ${userBoost ? '✅ Yes' : '❌ No'}\n` +
                            `📊 Server boost count: ${stats.totalBoosts}\n` +
                            `🎯 Required boosts: ${config.svip.boostrequire}\n` +
                            `🏆 Server boost tier: ${stats.boostTier}\n\n` +
                            `${userBoost ? `**User Boost Info:**\n📅 Boosting since: ${new Date(userBoost.boostSince).toLocaleDateString()}\n🔢 Boost count: ${userBoost.boostCount}` : ''}`
                        )
                        .setColor(meetsRequirements ? config.embedColors.success : config.embedColors.error)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    break;
                }

                default:
                    throw new Error(`Unknown subcommand: ${subcommand}`);
            }

        } catch (error) {
            logger.error(`Error in booststore command (${subcommand}):`, error);

            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Command Error")
                .setDescription("An error occurred while executing the command.")
                .setColor(config.embedColors.error);

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }
    }
};