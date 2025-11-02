const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get user or server avatar')
        .addStringOption(option =>
            option.setName('option')
                .setDescription('Choose user or server avatar')
                .setRequired(false)
                .addChoices(
                    { name: 'User', value: 'user' },
                    { name: 'Server', value: 'server' }
                )
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get avatar from')
                .setRequired(false)
        ),

    async execute(interaction) {
        const option = interaction.options.getString('option') || 'user';
        const targetUser = interaction.options.getUser('user') || interaction.user;

        if (option === 'server') {
            const guild = interaction.guild;
            if (!guild) {
                return interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
            }

            const serverIcon = guild.iconURL({ dynamic: true, size: 4096 });
            if (!serverIcon) {
                return interaction.reply({ content: 'This server doesn\'t have an avatar!', flags: MessageFlags.Ephemeral });
            }

            const embed = new EmbedBuilder()
                .setTitle(`${guild.name}'s Avatar`)
                .setImage(serverIcon)
                .setColor(config.embedColors.main)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });
        } else {
            const userAvatar = targetUser.displayAvatarURL({ dynamic: true, size: 4096 });

            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.tag}'s Avatar`)
                .setImage(userAvatar)
                .setColor(config.embedColors.main)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });
        }
    },

    // Prefix command support
    async run(message, args) {
        if (args[0] === 'server') {
            const guild = message.guild;
            if (!guild) {
                return message.reply('This command can only be used in a server!');
            }

            const serverIcon = guild.iconURL({ dynamic: true, size: 4096 });
            if (!serverIcon) {
                return message.reply('This server doesn\'t have an avatar!');
            }

            const embed = new EmbedBuilder()
                .setTitle(`${guild.name}'s Avatar`)
                .setImage(serverIcon)
                .setColor()
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

            await message.reply({ embeds: [embed] });
        } else {
            let targetUser = message.author;
            
            // Check if user mentioned someone or provided user ID
            if (message.mentions.users.size > 0) {
                targetUser = message.mentions.users.first();
            } else if (args[0] && !isNaN(args[0])) {
                try {
                    targetUser = await message.client.users.fetch(args[0]);
                } catch (error) {
                    return message.reply('User not found!');
                }
            }

            const userAvatar = targetUser.displayAvatarURL({ dynamic: true, size: 4096 });

            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.tag}'s Avatar`)
                .setImage(userAvatar)
                .setColor(config.embedColors.main)
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

            await message.reply({ embeds: [embed] });
        }
    }
};