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
const { devBoostManager } = require("../../utils/devBoostManager.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("boostcheck")
        .setDescription("[DEV] Check and separate users by their boost count")
        .addSubcommand(subcommand =>
            subcommand
                .setName("real")
                .setDescription("Check real Discord boost data")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("fake")
                .setDescription("Check fake boost data (development mode)")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("current")
                .setDescription("Check current boost data based on active mode")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("compare")
                .setDescription("Compare real vs fake boost data")
        ),
    name: "boostcheck",
    description: "[DEV] Check and separate users by their boost count",
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
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            switch (subcommand) {
                case 'real':
                    await this.checkRealBoosts(interaction);
                    break;
                case 'fake':
                    await this.checkFakeBoosts(interaction);
                    break;
                case 'current':
                    await this.checkCurrentBoosts(interaction);
                    break;
                case 'compare':
                    await this.compareBoosts(interaction);
                    break;
                default:
                    throw new Error(`Unknown subcommand: ${subcommand}`);
            }

        } catch (error) {
            logger.error(`Error in boostcheck command (${subcommand}):`, error);

            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Command Error")
                .setDescription("An error occurred while checking boost data.")
                .setColor(config.embedColors.error);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    async checkRealBoosts(interaction) {
        const guild = interaction.guild;
        await guild.members.fetch(); // Ensure all members are cached

        const twoBoostUsers = [];
        const oneBoostUsers = [];
        const nonBoostUsers = [];
        let totalBoosts = 0;

        // Check all guild members for real boost status
        for (const [userId, member] of guild.members.cache) {
            if (member.user.bot) continue;

            const boostCount = member.premiumSince ? 1 : 0;
            const userData = {
                user: member.user,
                member: member,
                boostCount: boostCount,
                boostSince: member.premiumSince
            };

            if (boostCount >= 2) {
                // Note: Discord doesn't actually show individual boost counts > 1
                // This is theoretical/future-proofing
                twoBoostUsers.push(userData);
            } else if (boostCount === 1) {
                oneBoostUsers.push(userData);
            } else {
                nonBoostUsers.push(userData);
            }

            totalBoosts += boostCount;
        }

        const serverBoostCount = guild.premiumSubscriptionCount || 0;
        const boostTier = guild.premiumTier || 0;

        const embed = new EmbedBuilder()
            .setTitle("🔍 Real Discord Boost Check")
            .setDescription(
                `**Server Statistics:**\n` +
                `📊 Total Server Boosts: ${serverBoostCount}\n` +
                `🏆 Server Boost Tier: ${boostTier}\n` +
                `👥 Total Members: ${guild.memberCount}\n\n` +
                `**User Breakdown:**\n` +
                `🚀 2+ Boost Users: ${twoBoostUsers.length}\n` +
                `✨ 1 Boost Users: ${oneBoostUsers.length}\n` +
                `👤 Non-Boosters: ${nonBoostUsers.length}\n\n` +
                `**SVIP Requirements:**\n` +
                `🎯 Required Boosts: ${config.svip.boostrequire}\n` +
                `${serverBoostCount >= parseInt(config.svip.boostrequire) ? '✅' : '❌'} Server meets requirement`
            )
            .setColor(config.embedColors.info);

        // Add user lists if not too long
        if (twoBoostUsers.length > 0 && twoBoostUsers.length <= 10) {
            const twoBoostList = twoBoostUsers.map(data => 
                `• ${data.user.username} (${data.member.displayName})`
            ).join('\n');
            embed.addFields({ 
                name: "🚀 2+ Boost Users", 
                value: twoBoostList.substring(0, 1024), 
                inline: false 
            });
        }

        if (oneBoostUsers.length > 0 && oneBoostUsers.length <= 10) {
            const oneBoostList = oneBoostUsers.map(data => 
                `• ${data.user.username} ${data.boostSince ? `(since ${data.boostSince.toLocaleDateString()})` : ''}`
            ).join('\n');
            embed.addFields({ 
                name: "✨ 1 Boost Users", 
                value: oneBoostList.substring(0, 1024), 
                inline: false 
            });
        }

        if (twoBoostUsers.length > 10 || oneBoostUsers.length > 10) {
            embed.addFields({
                name: "📝 Note",
                value: "Some user lists were truncated due to length. Use specific commands to view all users.",
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async checkFakeBoosts(interaction) {
        const fakeBoosts = devBoostManager.getAllBoosts();
        const stats = devBoostManager.getStats();

        const twoBoostUsers = [];
        const oneBoostUsers = [];

        // Separate fake boost users
        for (const boost of fakeBoosts) {
            const userData = {
                userId: boost.userId,
                username: boost.username,
                boostCount: boost.boostCount,
                boostSince: new Date(boost.boostSince)
            };

            if (boost.boostCount >= 2) {
                twoBoostUsers.push(userData);
            } else if (boost.boostCount === 1) {
                oneBoostUsers.push(userData);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle("🧪 Fake Boost Store Check")
            .setDescription(
                `**Development Mode:** ${stats.devMode ? '🟢 Enabled' : '🔴 Disabled'}\n\n` +
                `**Fake Server Statistics:**\n` +
                `📊 Total Fake Boosts: ${stats.totalBoosts}\n` +
                `🏆 Fake Boost Tier: ${stats.boostTier}\n` +
                `👥 Active Fake Boosters: ${stats.activeBooters}\n\n` +
                `**User Breakdown:**\n` +
                `🚀 2+ Boost Users: ${twoBoostUsers.length}\n` +
                `✨ 1 Boost Users: ${oneBoostUsers.length}\n\n` +
                `**SVIP Requirements (Fake):**\n` +
                `🎯 Required Boosts: ${config.svip.boostrequire}\n` +
                `${stats.totalBoosts >= parseInt(config.svip.boostrequire) ? '✅' : '❌'} Fake server meets requirement`
            )
            .setColor(stats.devMode ? config.embedColors.success : config.embedColors.warning);

        // Add user lists
        if (twoBoostUsers.length > 0) {
            const twoBoostList = twoBoostUsers.map(data => 
                `• ${data.username} (${data.boostCount} boosts) - since ${data.boostSince.toLocaleDateString()}`
            ).join('\n');
            embed.addFields({ 
                name: "🚀 2+ Fake Boost Users", 
                value: twoBoostList.substring(0, 1024), 
                inline: false 
            });
        }

        if (oneBoostUsers.length > 0) {
            const oneBoostList = oneBoostUsers.map(data => 
                `• ${data.username} (1 boost) - since ${data.boostSince.toLocaleDateString()}`
            ).join('\n');
            embed.addFields({ 
                name: "✨ 1 Fake Boost Users", 
                value: oneBoostList.substring(0, 1024), 
                inline: false 
            });
        }

        if (fakeBoosts.length === 0) {
            embed.addFields({
                name: "📝 Note",
                value: "No fake boosts found. Use `/booststore add @user` to add fake boosts for testing.",
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async checkCurrentBoosts(interaction) {
        const isDevMode = devBoostManager.isDevMode();
        
        if (isDevMode) {
            await this.checkFakeBoosts(interaction);
        } else {
            await this.checkRealBoosts(interaction);
        }
    },

    async compareBoosts(interaction) {
        // Get real boost data
        const guild = interaction.guild;
        await guild.members.fetch();
        
        const realBoosters = [];
        for (const [userId, member] of guild.members.cache) {
            if (member.user.bot) continue;
            if (member.premiumSince) {
                realBoosters.push({
                    userId: userId,
                    username: member.user.username,
                    displayName: member.displayName,
                    boostSince: member.premiumSince
                });
            }
        }

        // Get fake boost data
        const fakeBoosters = devBoostManager.getAllBoosts();
        const stats = devBoostManager.getStats();

        const embed = new EmbedBuilder()
            .setTitle("⚖️ Real vs Fake Boost Comparison")
            .setDescription(
                `**Current Mode:** ${devBoostManager.isDevMode() ? '🟢 Development' : '🔴 Production'}\n\n` +
                `**Real Discord Data:**\n` +
                `📊 Server Boost Count: ${guild.premiumSubscriptionCount || 0}\n` +
                `🏆 Server Boost Tier: ${guild.premiumTier || 0}\n` +
                `👥 Real Boosters: ${realBoosters.length}\n\n` +
                `**Fake Development Data:**\n` +
                `📊 Fake Boost Count: ${stats.totalBoosts}\n` +
                `🏆 Fake Boost Tier: ${stats.boostTier}\n` +
                `👥 Fake Boosters: ${stats.activeBooters}\n\n` +
                `**SVIP Requirements:**\n` +
                `🎯 Required Boosts: ${config.svip.boostrequire}\n` +
                `${(guild.premiumSubscriptionCount || 0) >= parseInt(config.svip.boostrequire) ? '✅' : '❌'} Real server meets requirement\n` +
                `${stats.totalBoosts >= parseInt(config.svip.boostrequire) ? '✅' : '❌'} Fake server meets requirement`
            )
            .setColor(config.embedColors.info);

        // Add real boosters list
        if (realBoosters.length > 0) {
            const realList = realBoosters.slice(0, 10).map(data => 
                `• ${data.username} (${data.displayName}) - since ${data.boostSince.toLocaleDateString()}`
            ).join('\n');
            embed.addFields({ 
                name: "🔴 Real Boosters" + (realBoosters.length > 10 ? ` (showing first 10 of ${realBoosters.length})` : ''), 
                value: realList || "None", 
                inline: true 
            });
        }

        // Add fake boosters list
        if (fakeBoosters.length > 0) {
            const fakeList = fakeBoosters.slice(0, 10).map(data => 
                `• ${data.username} (${data.boostCount} boosts) - since ${new Date(data.boostSince).toLocaleDateString()}`
            ).join('\n');
            embed.addFields({ 
                name: "🟢 Fake Boosters" + (fakeBoosters.length > 10 ? ` (showing first 10 of ${fakeBoosters.length})` : ''), 
                value: fakeList || "None", 
                inline: true 
            });
        }

        // Add overlap analysis
        const realUserIds = new Set(realBoosters.map(b => b.userId));
        const fakeUserIds = new Set(fakeBoosters.map(b => b.userId));
        const overlap = [...realUserIds].filter(id => fakeUserIds.has(id));
        const realOnly = [...realUserIds].filter(id => !fakeUserIds.has(id));
        const fakeOnly = [...fakeUserIds].filter(id => !realUserIds.has(id));

        embed.addFields({
            name: "📊 Overlap Analysis",
            value: `🤝 Both real & fake: ${overlap.length}\n🔴 Real only: ${realOnly.length}\n🟢 Fake only: ${fakeOnly.length}`,
            inline: false
        });

        await interaction.editReply({ embeds: [embed] });
    }
};