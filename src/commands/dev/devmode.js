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
        .setName("devmode")
        .setDescription("[DEV] Toggle development mode for boost system")
        .addSubcommand(subcommand =>
            subcommand
                .setName("toggle")
                .setDescription("Toggle development mode on/off")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription("Check current development mode status")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("enable")
                .setDescription("Enable development mode")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("disable")
                .setDescription("Disable development mode")
        ),
    name: "devmode",
    description: "[DEV] Toggle development mode for boost system",
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
                case 'toggle': {
                    const newMode = devBoostManager.toggleDevMode();
                    const embed = new EmbedBuilder()
                        .setTitle(`🔧 Development Mode ${newMode ? 'Enabled' : 'Disabled'}`)
                        .setDescription(
                            `Development mode has been **${newMode ? 'enabled' : 'disabled'}**.\n\n` +
                            `**What this means:**\n` +
                            `${newMode ? '✅' : '❌'} Using local boost store instead of Discord boosts\n` +
                            `${newMode ? '✅' : '❌'} SVIP system will use fake boost data\n` +
                            `${newMode ? '✅' : '❌'} Developer bypass is active\n\n` +
                            `Use \`/booststore\` commands to manage fake boost data.`
                        )
                        .setColor(newMode ? config.embedColors.success : config.embedColors.warning)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    break;
                }

                case 'status': {
                    const stats = devBoostManager.getStats();
                    const embed = new EmbedBuilder()
                        .setTitle("🔧 Development Mode Status")
                        .setDescription(
                            `**Current Mode:** ${stats.devMode ? '🟢 Development' : '🔴 Production'}\n\n` +
                            `**Boost Store Statistics:**\n` +
                            `📊 Total Boosts: ${stats.totalBoosts}\n` +
                            `🏆 Boost Tier: ${stats.boostTier}\n` +
                            `👥 Active Boosters: ${stats.activeBooters}\n` +
                            `📈 Total Users: ${stats.totalBooters}\n\n` +
                            `**System Behavior:**\n` +
                            `${stats.devMode ? '✅ Using local boost data' : '❌ Using real Discord boosts'}\n` +
                            `${stats.devMode ? '✅ SVIP bypass enabled' : '❌ Normal SVIP validation'}`
                        )
                        .setColor(stats.devMode ? config.embedColors.success : config.embedColors.info)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    break;
                }

                case 'enable': {
                    const wasEnabled = devBoostManager.isDevMode();
                    devBoostManager.setDevMode(true);
                    
                    const embed = new EmbedBuilder()
                        .setTitle("🟢 Development Mode Enabled")
                        .setDescription(
                            `${wasEnabled ? 'Development mode was already enabled.' : 'Development mode has been enabled.'}\n\n` +
                            `**Active Features:**\n` +
                            `✅ Local boost store system\n` +
                            `✅ SVIP developer bypass\n` +
                            `✅ Fake boost data for testing\n\n` +
                            `Use \`/booststore\` to manage boost data.`
                        )
                        .setColor(config.embedColors.success)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    break;
                }

                case 'disable': {
                    const wasEnabled = devBoostManager.isDevMode();
                    devBoostManager.setDevMode(false);
                    
                    const embed = new EmbedBuilder()
                        .setTitle("🔴 Development Mode Disabled")
                        .setDescription(
                            `${!wasEnabled ? 'Development mode was already disabled.' : 'Development mode has been disabled.'}\n\n` +
                            `**Current Behavior:**\n` +
                            `❌ Using real Discord boost system\n` +
                            `❌ Normal SVIP validation\n` +
                            `❌ No developer bypass\n\n` +
                            `The bot will now use actual Discord boost data.`
                        )
                        .setColor(config.embedColors.warning)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    break;
                }

                default:
                    throw new Error(`Unknown subcommand: ${subcommand}`);
            }

        } catch (error) {
            logger.error(`Error in devmode command (${subcommand}):`, error);

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