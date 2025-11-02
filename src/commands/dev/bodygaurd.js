const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger.js");
const config = require("../../config/config.js");
const bodyguardState = require("../../utils/bodyguardState.js");

const guardedUsers = config.naig; // Array of user IDs to guard

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bodyguard")
        .setDescription("Manage bodyguard mode and guarded users")
        .addSubcommand(subcommand =>
            subcommand.setName("toggle")
                .setDescription("Toggle bodyguard mode on/off")
                .addBooleanOption(option => 
                    option.setName("enable")
                        .setDescription("Enable or disable bodyguard mode")
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand.setName("adduser")
                .setDescription("Add a user to the guarded list")
                .addStringOption(option =>
                    option.setName("userid")
                        .setDescription("The user ID to add")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName("removeuser")
                .setDescription("Remove a user from the guarded list")
                .addStringOption(option =>
                    option.setName("userid")
                        .setDescription("The user ID to remove")
                        .setRequired(true))),
    
    name: "bodyguard",
    description: "Manage bodyguard mode and guarded users",
    prefix: true,
    
    async execute(interaction) {
        // Only allow the developer to use this command
        if (interaction.user.id !== config.developerId) {
            return interaction.reply({
                content: "Only the bot owner can use this command.",
                flags: MessageFlags.Ephemeral
            });
        }
        
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "toggle") {
            let newState;
            const option = interaction.options.getBoolean("enable");
            if (option === null) {
                newState = bodyguardState.toggle();
            } else {
                newState = option ? bodyguardState.enable() : bodyguardState.disable();
            }
            
            const embed = new EmbedBuilder()
                .setTitle("`🛡️` Bodyguard Mode")
                .setDescription(`Bodyguard mode is now **${newState ? "ENABLED" : "DISABLED"}**`)
                .setColor(newState ? config.embedColors.success : config.embedColors.error)
                .addFields({
                    name: "Status",
                    value: newState ? 
                        "I will join voice channels to guard specified users" : 
                        "I will only monitor voice activity without joining"
                })
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
            logger.info(`Bodyguard mode ${newState ? "enabled" : "disabled"} by ${interaction.user.tag}`);
            
            // Check if any guarded users are already in voice channels when enabling
            if (newState && interaction.guild) {
                const guild = interaction.guild;
                const guardedVoiceMembers = guild.members.cache.filter(member => 
                    guardedUsers.includes(member.user.id) && member.voice.channelId
                );
                
                if (guardedVoiceMembers.size > 0) {
                    for (const [, member] of guardedVoiceMembers) {
                        try {
                            const voiceChannel = member.voice.channel;
                            if (voiceChannel && voiceChannel.joinable) {
                                logger.info(`Joining voice channel ${voiceChannel.name} to guard ${member.user.tag}`);
                                await voiceChannel.join();
                                await interaction.followUp({
                                    content: `Joined voice channel ${voiceChannel.name} to guard ${member.user.tag}`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }
                        } catch (error) {
                            logger.error(`Failed to join voice channel for ${member.user.tag}: ${error.message}`);
                        }
                    }
                }
            }
        } else if (subcommand === "adduser") {
            const userId = interaction.options.getString("userid");
            if (!guardedUsers.includes(userId)) {
                guardedUsers.push(userId);
                await interaction.reply(`User ID ${userId} has been added to the guarded list.`);
                logger.info(`User ID ${userId} added to guarded list by ${interaction.user.tag}`);
                
                // Check if the newly guarded user is already in a voice channel
                if (bodyguardState.isEnabled() && interaction.guild) {
                    const guild = interaction.guild;
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (member && member.voice.channelId) {
                        try {
                            const voiceChannel = member.voice.channel;
                            if (voiceChannel && voiceChannel.joinable) {
                                logger.info(`Joining voice channel ${voiceChannel.name} to guard ${member.user.tag}`);
                                await voiceChannel.join();
                                await interaction.followUp({
                                    content: `Joined voice channel ${voiceChannel.name} to guard ${member.user.tag}`,
                                    flags: MessageFlags.Ephemeral
                                });
                            }
                        } catch (error) {
                            logger.error(`Failed to join voice channel for ${member.user.tag}: ${error.message}`);
                        }
                    }
                }
            } else {
                await interaction.reply(`User ID ${userId} is already in the guarded list.`);
            }
        } else if (subcommand === "removeuser") {
            const userId = interaction.options.getString("userid");
            const index = guardedUsers.indexOf(userId);
            if (index !== -1) {
                guardedUsers.splice(index, 1);
                await interaction.reply(`User ID ${userId} has been removed from the guarded list.`);
                logger.info(`User ID ${userId} removed from guarded list by ${interaction.user.tag}`);
            } else {
                await interaction.reply(`User ID ${userId} is not in the guarded list.`);
            }
        }
    },
    
    /**
     * @param {import('discord.js').Message} message
     * @param {string[]} args
     * @param {import('discord.js').Client} client
     */
    async run(message, args) {
        // Only allow the developer to use this command
        if (message.author.id !== config.developerId) {
            return message.reply("Only the bot owner can use this command.");
        }
        
        if (args.length === 0) {
            return message.reply("Please specify a subcommand: toggle, adduser, or removeuser.");
        }
        
        const subcommand = args[0].toLowerCase();
        if (subcommand === "toggle") {
            let newState;
            if (args.length === 1) {
                newState = bodyguardState.toggle();
            } else {
                const arg = args[1].toLowerCase();
                if (["true", "on", "enable", "yes", "1"].includes(arg)) {
                    newState = bodyguardState.enable();
                } else if (["false", "off", "disable", "no", "0"].includes(arg)) {
                    newState = bodyguardState.disable();
                } else {
                    return message.reply("Invalid option. Use true/false, on/off, enable/disable, or no arguments to toggle.");
                }
            }
            
            const embed = new EmbedBuilder()
                .setTitle("`🛡️` Bodyguard Mode")
                .setDescription(`Bodyguard mode is now **${newState ? "ENABLED" : "DISABLED"}**`)
                .setColor(newState ? config.embedColors.success : config.embedColors.error)
                .addFields({
                    name: "Status",
                    value: newState ? 
                        "I will join voice channels to guard specified users" : 
                        "I will only monitor voice activity without joining"
                })
                .setTimestamp();
                
            await message.reply({ embeds: [embed] });
            logger.info(`Bodyguard mode ${newState ? "enabled" : "disabled"} by ${message.author.tag}`);
            
            // Check if any guarded users are already in voice channels when enabling
            if (newState && message.guild) {
                const guild = message.guild;
                const guardedVoiceMembers = guild.members.cache.filter(member => 
                    guardedUsers.includes(member.user.id) && member.voice.channelId
                );
                
                if (guardedVoiceMembers.size > 0) {
                    for (const [, member] of guardedVoiceMembers) {
                        try {
                            const voiceChannel = member.voice.channel;
                            if (voiceChannel && voiceChannel.joinable) {
                                logger.info(`Joining voice channel ${voiceChannel.name} to guard ${member.user.tag}`);
                                await voiceChannel.join();
                                await message.channel.send(`Joined voice channel ${voiceChannel.name} to guard ${member.user.tag}`);
                            }
                        } catch (error) {
                            logger.error(`Failed to join voice channel for ${member.user.tag}: ${error.message}`);
                        }
                    }
                }
            }
        } else if (subcommand === "adduser") {
            if (args.length < 2) {
                return message.reply("Please provide a user ID to add.");
            }
            const userId = args[1];
            if (!guardedUsers.includes(userId)) {
                guardedUsers.push(userId);
                await message.reply(`User ID ${userId} has been added to the guarded list.`);
                logger.info(`User ID ${userId} added to guarded list by ${message.author.tag}`);
                
                // Check if the newly guarded user is already in a voice channel
                if (bodyguardState.isEnabled() && message.guild) {
                    const guild = message.guild;
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (member && member.voice.channelId) {
                        try {
                            const voiceChannel = member.voice.channel;
                            if (voiceChannel && voiceChannel.joinable) {
                                logger.info(`Joining voice channel ${voiceChannel.name} to guard ${member.user.tag}`);
                                await voiceChannel.join();
                                await message.channel.send(`Joined voice channel ${voiceChannel.name} to guard ${member.user.tag}`);
                            }
                        } catch (error) {
                            logger.error(`Failed to join voice channel for ${member.user.tag}: ${error.message}`);
                        }
                    }
                }
            } else {
                await message.reply(`User ID ${userId} is already in the guarded list.`);
            }
        } else if (subcommand === "removeuser") {
            if (args.length < 2) {
                return message.reply("Please provide a user ID to remove.");
            }
            const userId = args[1];
            const index = guardedUsers.indexOf(userId);
            if (index !== -1) {
                guardedUsers.splice(index, 1);
                await message.reply(`User ID ${userId} has been removed from the guarded list.`);
                logger.info(`User ID ${userId} removed from guarded list by ${message.author.tag}`);
            } else {
                await message.reply(`User ID ${userId} is not in the guarded list.`);
            }
        } else {
            return message.reply("Invalid subcommand. Use toggle, adduser, or removeuser.");
        }
    }
};
