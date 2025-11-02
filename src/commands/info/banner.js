const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Get user or server banner')
        .addStringOption(option =>
            option.setName('option')
                .setDescription('Choose user or server banner')
                .setRequired(false)
                .addChoices(
                    { name: 'User', value: 'user' },
                    { name: 'Server', value: 'server' }
                )
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get banner from')
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

            const serverBanner = guild.bannerURL({ dynamic: true, size: 4096 });
            if (!serverBanner) {
                return interaction.reply({ content: 'This server doesn\'t have a banner!', flags: MessageFlags.Ephemeral });
            }

            const embed = new EmbedBuilder()
                .setTitle(`${guild.name}'s Banner`)
                .setImage(serverBanner)
                .setColor(config.embedColors.main)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });
        } else {
            // Fetch the user to get banner data
            try {
                const fetchedUser = await interaction.client.users.fetch(targetUser.id, { force: true });
                const userBanner = fetchedUser.bannerURL({ dynamic: true, size: 4096 });

                if (!userBanner) {
                    return interaction.reply({ content: `${targetUser.tag} doesn't have a banner!`, flags: MessageFlags.Ephemeral });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`${targetUser.tag}'s Banner`)
                    .setImage(userBanner)
                    .setColor(config.embedColors.main)
                    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error fetching user banner:', error);
                return interaction.reply({ content: 'Failed to fetch user banner!', flags: MessageFlags.Ephemeral });
            }
        }
    },

    // Prefix command support
    async run(message, args) {
        if (args[0] === 'server') {
            const guild = message.guild;
            if (!guild) {
                return message.reply('This command can only be used in a server!');
            }

            const serverBanner = guild.bannerURL({ dynamic: true, size: 4096 });
            if (!serverBanner) {
                return message.reply('This server doesn\'t have a banner!');
            }

            const embed = new EmbedBuilder()
                .setTitle(`${guild.name}'s Banner`)
                .setImage(serverBanner)
                .setColor(config.embedColors.main)
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

            // Fetch the user to get banner data
            try {
                const fetchedUser = await message.client.users.fetch(targetUser.id, { force: true });
                const userBanner = fetchedUser.bannerURL({ dynamic: true, size: 4096 });

                if (!userBanner) {
                    return message.reply(`${targetUser.tag} doesn't have a banner!`);
                }

                const embed = new EmbedBuilder()
                    .setTitle(`${targetUser.tag}'s Banner`)
                    .setImage(userBanner)
                    .setColor(config.embedColors.main)
                    .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

                await message.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error fetching user banner:', error);
                return message.reply('Failed to fetch user banner!');
            }
        }
    }
};