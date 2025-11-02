const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActivityType } = require("discord.js");
const Status = require("../../schema/status.js");
const logger = require("../../utils/logger.js");
const config = require("../../config/config.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("status")
        .setDescription("Manage bot status messages")
        .addSubcommand(subcommand =>
            subcommand.setName("add")
                .setDescription("Add a new status message")
                .addStringOption(option =>
                    option.setName("type")
                        .setDescription("Type of activity")
                        .setRequired(true)
                        .addChoices(
                            { name: "Playing", value: "Playing" },
                            { name: "Streaming", value: "Streaming" },
                            { name: "Listening", value: "Listening" },
                            { name: "Watching", value: "Watching" },
                            { name: "Custom", value: "Custom" },
                            { name: "Competing", value: "Competing" }
                        ))
                .addStringOption(option =>
                    option.setName("message")
                        .setDescription("The status message")
                        .setRequired(true)
                        .setMaxLength(128))
                .addStringOption(option =>
                    option.setName("url")
                        .setDescription("Streaming URL (only for streaming type)")
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName("status")
                        .setDescription("Bot's online status")
                        .setRequired(false)
                        .addChoices(
                            { name: "Online", value: "online" },
                            { name: "Idle", value: "idle" },
                            { name: "Do Not Disturb", value: "dnd" },
                            { name: "Invisible", value: "invisible" }
                        )))
        .addSubcommand(subcommand =>
            subcommand.setName("remove")
                .setDescription("Remove a status message")
                .addStringOption(option =>
                    option.setName("id")
                        .setDescription("Status ID to remove")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName("list")
                .setDescription("List all status messages"))
        .addSubcommand(subcommand =>
            subcommand.setName("edit")
                .setDescription("Edit an existing status message")
                .addStringOption(option =>
                    option.setName("id")
                        .setDescription("Status ID to edit")
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName("type")
                        .setDescription("Type of activity")
                        .setRequired(false)
                        .addChoices(
                            { name: "Playing", value: "Playing" },
                            { name: "Streaming", value: "Streaming" },
                            { name: "Listening", value: "Listening" },
                            { name: "Watching", value: "Watching" },
                            { name: "Custom", value: "Custom" },
                            { name: "Competing", value: "Competing" }
                        ))
                .addStringOption(option =>
                    option.setName("message")
                        .setDescription("The status message")
                        .setRequired(false)
                        .setMaxLength(128))
                .addStringOption(option =>
                    option.setName("url")
                        .setDescription("Streaming URL (only for streaming type)")
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName("status")
                        .setDescription("Bot's online status")
                        .setRequired(false)
                        .addChoices(
                            { name: "Online", value: "online" },
                            { name: "Idle", value: "idle" },
                            { name: "Do Not Disturb", value: "dnd" },
                            { name: "Invisible", value: "invisible" }
                        )))
        .addSubcommand(subcommand =>
            subcommand.setName("toggle")
                .setDescription("Enable or disable a status message")
                .addStringOption(option =>
                    option.setName("id")
                        .setDescription("Status ID to toggle")
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName("enabled")
                        .setDescription("Enable or disable the status")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName("reload")
                .setDescription("Reload status rotation from database"))
        .addSubcommand(subcommand =>
            subcommand.setName("clear")
                .setDescription("Clear all status messages")
                .addBooleanOption(option =>
                    option.setName("confirm")
                        .setDescription("Confirm you want to delete all statuses")
                        .setRequired(true))),

    name: "status",
    description: "Manage bot status messages",
    prefix: false, // This command is not prefixed, only slash command
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        try {
            switch (subcommand) {
                case "add":
                    await this.handleAdd(interaction);
                    break;
                case "remove":
                    await this.handleRemove(interaction);
                    break;
                case "list":
                    await this.handleList(interaction);
                    break;
                case "edit":
                    await this.handleEdit(interaction);
                    break;
                case "toggle":
                    await this.handleToggle(interaction);
                    break;
                case "reload":
                    await this.handleReload(interaction);
                    break;
                case "clear":
                    await this.handleClear(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: "Unknown subcommand.",
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            logger.error(`Error in status command: ${error.message}`);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "An error occurred while processing the command.",
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },

    async handleAdd(interaction) {
        const type = interaction.options.getString("type");
        const message = interaction.options.getString("message");
        const url = interaction.options.getString("url");
        const status = interaction.options.getString("status") || "online";

        // Validate streaming URL if type is streaming
        if (type === "Streaming" && !url) {
            return interaction.reply({
                content: "A URL is required for streaming status.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const newStatus = new Status({
                name: message,
                type: type,
                url: url,
                status: status,
                createdBy: interaction.user.id
            });

            await newStatus.save();

            const embed = new EmbedBuilder()
                .setTitle("`✅` Status Added")
                .setDescription("New status message has been added successfully!")
                .addFields(
                    { name: "ID", value: `\`${newStatus._id}\``, inline: false },
                    { name: "Type", value: type, inline: true },
                    { name: "Message", value: message, inline: true },
                    { name: "Status", value: status, inline: true }
                )
                .setColor(config.embedColors.success)
                .setTimestamp();

            if (url) {
                embed.addFields({ name: "URL", value: url });
            }

            await interaction.reply({ embeds: [embed] });
            logger.info(`Status added by ${interaction.user.tag}: ${type} - ${message}`);

            // Reload status rotation
            await this.reloadStatusRotation(interaction.client);
        } catch (error) {
            logger.error(`Error adding status: ${error.message}`);
            await interaction.reply({
                content: "Failed to add status message.",
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async handleRemove(interaction) {
        const statusId = interaction.options.getString("id");

        try {
            const statusToDelete = await Status.findById(statusId);
            
            if (!statusToDelete) {
                return interaction.reply({
                    content: "Status not found. Use `/status list` to see available status IDs.",
                    flags: MessageFlags.Ephemeral
                });
            }

            await Status.findByIdAndDelete(statusId);

            const embed = new EmbedBuilder()
                .setTitle("`🗑️` Status Removed")
                .setDescription(`Status message has been removed successfully!`)
                .addFields(
                    { name: "Removed Status", value: `[${statusToDelete.type}] ${statusToDelete.name}` }
                )
                .setColor(config.embedColors.error)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            logger.info(`Status removed by ${interaction.user.tag}: ${statusToDelete.name}`);

            // Reload status rotation
            await this.reloadStatusRotation(interaction.client);
        } catch (error) {
            logger.error(`Error removing status: ${error.message}`);
            await interaction.reply({
                content: "Failed to remove status message. Please check the ID and try again.",
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async handleList(interaction) {
        try {
            const statuses = await Status.find({}).sort({ createdAt: 1 });

            if (statuses.length === 0) {
                return interaction.reply({
                    content: "No status messages found. Use `/status add` to create one!",
                    flags: MessageFlags.Ephemeral
                });
            }

            const embed = new EmbedBuilder()
                .setTitle("`📋` Bot Status Messages")
                .setColor(config.embedColors.main)
                .setTimestamp()
                .setFooter({ text: `Total: ${statuses.length} statuses` });

            let description = "";
            statuses.forEach((status, index) => {
                const enabledIcon = status.enabled ? "✅" : "❌";
                const statusEmoji = this.getStatusEmoji(status.type);
                description += `${enabledIcon} **${index + 1}.** ${statusEmoji} [${status.type}] ${status.name}\n`;
                description += `   🆔 \`${status._id}\` | 🌐 ${status.status}`;
                if (status.url) description += ` | 🔗 [URL](${status.url})`;
                description += `\n\n`;
            });

            // Split into multiple embeds if too long
            if (description.length > 4000) {
                const chunks = this.chunkString(description, 4000);
                const embeds = chunks.map((chunk, index) => {
                    const chunkEmbed = new EmbedBuilder()
                        .setTitle(index === 0 ? "`📋` Bot Status Messages" : "`📋` Status Messages (continued)")
                        .setDescription(chunk)
                        .setColor(config.embedColors.main)
                        .setTimestamp();
                    
                    if (index === chunks.length - 1) {
                        chunkEmbed.setFooter({ text: `Total: ${statuses.length} statuses` });
                    }
                    
                    return chunkEmbed;
                });
                
                await interaction.reply({ embeds: embeds.slice(0, 10) }); // Discord limit
            } else {
                embed.setDescription(description);
                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            logger.error(`Error listing statuses: ${error.message}`);
            await interaction.reply({
                content: "Failed to list status messages.",
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async handleEdit(interaction) {
        const statusId = interaction.options.getString("id");
        const type = interaction.options.getString("type");
        const message = interaction.options.getString("message");
        const url = interaction.options.getString("url");
        const status = interaction.options.getString("status");

        try {
            const statusToEdit = await Status.findById(statusId);
            
            if (!statusToEdit) {
                return interaction.reply({
                    content: "Status not found. Use `/status list` to see available status IDs.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const oldValues = {
                type: statusToEdit.type,
                name: statusToEdit.name,
                url: statusToEdit.url,
                status: statusToEdit.status
            };

            // Update fields if provided
            if (type) statusToEdit.type = type;
            if (message) statusToEdit.name = message;
            if (url !== null) statusToEdit.url = url;
            if (status) statusToEdit.status = status;

            await statusToEdit.save();

            const embed = new EmbedBuilder()
                .setTitle("`✏️` Status Updated")
                .setDescription("Status message has been updated successfully!")
                .addFields(
                    { name: "ID", value: `\`${statusToEdit._id}\``, inline: false },
                    { name: "Type", value: `${oldValues.type} → **${statusToEdit.type}**`, inline: true },
                    { name: "Message", value: `${oldValues.name} → **${statusToEdit.name}**`, inline: true },
                    { name: "Status", value: `${oldValues.status} → **${statusToEdit.status}**`, inline: true }
                )
                .setColor(config.embedColors.warning)
                .setTimestamp();

            if (statusToEdit.url || oldValues.url) {
                embed.addFields({ 
                    name: "URL", 
                    value: `${oldValues.url || 'None'} → **${statusToEdit.url || 'None'}**` 
                });
            }

            await interaction.reply({ embeds: [embed] });
            logger.info(`Status edited by ${interaction.user.tag}: ${statusToEdit.name}`);

            // Reload status rotation
            await this.reloadStatusRotation(interaction.client);
        } catch (error) {
            logger.error(`Error editing status: ${error.message}`);
            await interaction.reply({
                content: "Failed to edit status message. Please check the ID and try again.",
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async handleToggle(interaction) {
        const statusId = interaction.options.getString("id");
        const enabled = interaction.options.getBoolean("enabled");

        try {
            const statusToToggle = await Status.findById(statusId);
            
            if (!statusToToggle) {
                return interaction.reply({
                    content: "Status not found. Use `/status list` to see available status IDs.",
                    flags: MessageFlags.Ephemeral
                });
            }

            statusToToggle.enabled = enabled;
            await statusToToggle.save();

            const embed = new EmbedBuilder()
                .setTitle("`🔄` Status Toggled")
                .setDescription(`Status has been **${enabled ? 'enabled' : 'disabled'}** successfully!`)
                .addFields(
                    { name: "Status", value: `[${statusToToggle.type}] ${statusToToggle.name}` },
                    { name: "State", value: enabled ? "✅ Enabled" : "❌ Disabled" }
                )
                .setColor(enabled ? config.embedColors.success : config.embedColors.error)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            logger.info(`Status toggled by ${interaction.user.tag}: ${statusToToggle.name} - ${enabled ? 'enabled' : 'disabled'}`);

            // Reload status rotation
            await this.reloadStatusRotation(interaction.client);
        } catch (error) {
            logger.error(`Error toggling status: ${error.message}`);
            await interaction.reply({
                content: "Failed to toggle status message. Please check the ID and try again.",
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async handleReload(interaction) {
        try {
            await this.reloadStatusRotation(interaction.client);

            const statuses = await Status.find({ enabled: true });

            const embed = new EmbedBuilder()
                .setTitle("`🔄` Status Rotation Reloaded")
                .setDescription("Status rotation has been reloaded from the database.")
                .addFields(
                    { name: "Active Statuses", value: `${statuses.length} enabled statuses`, inline: true },
                    { name: "Rotation Interval", value: "15 seconds", inline: true }
                )
                .setColor(config.embedColors.success)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            logger.info(`Status rotation reloaded by ${interaction.user.tag}`);
        } catch (error) {
            logger.error(`Error reloading status rotation: ${error.message}`);
            await interaction.reply({
                content: "Failed to reload status rotation.",
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async handleClear(interaction) {
        const confirm = interaction.options.getBoolean("confirm");

        if (!confirm) {
            return interaction.reply({
                content: "Please set `confirm` to `true` if you really want to delete all statuses.",
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const deleteResult = await Status.deleteMany({});

            const embed = new EmbedBuilder()
                .setTitle("`🗑️` All Statuses Cleared")
                .setDescription("All status messages have been permanently deleted.")
                .addFields(
                    { name: "Deleted Count", value: `${deleteResult.deletedCount} statuses` }
                )
                .setColor(config.embedColors.error)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            logger.warn(`All statuses cleared by ${interaction.user.tag} - ${deleteResult.deletedCount} deleted`);

            // Reload status rotation (will fall back to defaults)
            await this.reloadStatusRotation(interaction.client);
        } catch (error) {
            logger.error(`Error clearing statuses: ${error.message}`);
            await interaction.reply({
                content: "Failed to clear status messages.",
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async reloadStatusRotation(client) {
        try {
            // Clear existing interval if it exists
            if (global.statusInterval) {
                clearInterval(global.statusInterval);
            }

            // Get enabled statuses from database
            const statuses = await Status.find({ enabled: true }).sort({ createdAt: 1 });

            if (statuses.length === 0) {
                logger.warn("No enabled status messages found in database, stopping rotation");
                // Set a default status when no statuses are available
                client.user.setPresence({
                    status: "online",
                    activities: [{
                        name: "No status configured",
                        type: ActivityType.Custom
                    }]
                });
                return;
            }

            // Convert database statuses to Discord format
            const presences = statuses.map(status => {
                const activityType = this.getActivityType(status.type);
                
                const presence = {
                    status: status.status,
                    activities: [{
                        name: status.name,
                        type: activityType
                    }]
                };

                // Add URL for streaming
                if (status.type === 'Streaming' && status.url) {
                    presence.activities[0].url = status.url;
                }

                return presence;
            });

            // Start rotation
            let index = 0;
            
            // Set initial status
            if (presences.length > 0) {
                client.user.setPresence(presences[0]);
            }

            // Set up interval for rotation
            global.statusInterval = setInterval(() => {
                if (presences.length > 0) {
                    client.user.setPresence(presences[index]);
                    index = (index + 1) % presences.length;
                }
            }, 15000); // 15 seconds interval

            logger.info(`Status rotation started with ${presences.length} statuses`);
        } catch (error) {
            logger.error(`Error in status rotation: ${error.message}`);
        }
    },

    getActivityType(typeString) {
        const activityTypes = {
            'Playing': ActivityType.Playing,
            'Streaming': ActivityType.Streaming,
            'Listening': ActivityType.Listening,
            'Watching': ActivityType.Watching,
            'Custom': ActivityType.Custom,
            'Competing': ActivityType.Competing
        };

        return activityTypes[typeString] || ActivityType.Playing;
    },

    getStatusEmoji(type) {
        const emojis = {
            'Playing': '🎮',
            'Streaming': '📡',
            'Listening': '🎵',
            'Watching': '📺',
            'Custom': '⭐',
            'Competing': '🏆'
        };

        return emojis[type] || '❓';
    },

    chunkString(str, length) {
        const chunks = [];
        let index = 0;
        while (index < str.length) {
            chunks.push(str.slice(index, index + length));
            index += length;
        }
        return chunks;
    }
};