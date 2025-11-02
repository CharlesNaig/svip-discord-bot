const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config.js');
const { prefix } = require('../admins/advertise');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Checks the bot and API latency'),
    name: 'ping',
    description: 'Checks the bot and API latency',
    prefix: true,
    
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const botLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        const embed = this.generatePingEmbed(botLatency, apiLatency, interaction.guild.iconURL());
        await interaction.editReply({ content: '`🏓` Pong!', embeds: [embed] });
    },
    async run(message) {
        const sentMessage = await message.channel.send('Pinging...');
        const botLatency = sentMessage.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(message.client.ws.ping);

        const embed = this.generatePingEmbed(botLatency, apiLatency, message.guild.iconURL());
        await sentMessage.edit({ content: '`🏓` Pong!', embeds: [embed] });
    },
    generatePingEmbed(botLatency, apiLatency, guildIcon) {
        // Default to green
        let botLatencyEmoji = '<:green:1317764526682279937>';
        let apiLatencyEmoji = '<:green:1317764526682279937>';
        let embedColor = config.embedColors.success;
        let latencyBotText = `\`\`\`ansi\n[2;32m[0m[2;32m${botLatency}[0m\n\`\`\``;
        let latencyApiText = `\`\`\`ansi\n[2;32m[0m[2;32m${apiLatency}[0m\n\`\`\``;

        // Update colors and emojis based on thresholds
        if (botLatency >= 800) {
            embedColor = config.embedColors.error; // Red
            botLatencyEmoji = '<:red:1317764639844728852>';
            latencyBotText = `\`\`\`ansi\n[2;31m${botLatency}[0m\n\`\`\``;
        } else if (botLatency >= 500) {
            embedColor = config.embedColors.warning; // Yellow
            botLatencyEmoji = '<:yellow:1317764616025014302>';
            latencyBotText = `\`\`\`ansi\n[2;33m${botLatency}[0m\n\`\`\``;
        }

        if (apiLatency >= 800) {
            apiLatencyEmoji = '<:red:1317764639844728852>';
            latencyApiText = `\`\`\`ansi\n[2;31m${apiLatency}[0m\n\`\`\``;
        } else if (apiLatency >= 500) {
            apiLatencyEmoji = '<:yellow:1317764616025014302>';
            latencyApiText = `\`\`\`ansi\n[2;33m${apiLatency}[0m\n\`\`\``;
        } else if (apiLatency < 0) {
            apiLatencyEmoji = '<:red:1317764639844728852>'; // Red for negative latency
            latencyApiText = `\`\`\`ansi\n[2;31m${apiLatency}[0m\n\`\`\``;
        }

        return new EmbedBuilder()
            .setAuthor({ name: '🏓 Pong', iconURL: guildIcon })
            .setColor(embedColor)
            .addFields(
                { name: `Latency ${botLatencyEmoji}`, value: latencyBotText, inline: true },
                { name: `API Latency ${apiLatencyEmoji}`, value: latencyApiText, inline: true }
            )
            .setTimestamp();
    }
};
