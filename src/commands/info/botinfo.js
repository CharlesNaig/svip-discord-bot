const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const os = require("os");
const client = require("../../index.js");
const config = require("../../config/config.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Displays information about the bot."),
  name: "botinfo",
  description: "Displays information about the bot.",
  prefix: true,

  async execute(interaction) {
    const embed = createBotInfoEmbed(client, interaction.user);
    await interaction.reply({ embeds: [embed] });
  },

  async run(message) {
    const embed = createBotInfoEmbed(client, message.author);
    await message.channel.send({ embeds: [embed] });
  },
};

// Helper: Creates the bot info embed
function createBotInfoEmbed(client, user) {
  const guild = client.guilds.cache.get(config.guildId);
  const { version: discordJsVersion } = require("discord.js");
  const { version: nodeJsVersion } = process;
  const cpu = os.cpus()[0].model;
  const cpuUsage = (process.cpuUsage().user / 1024 / 1024).toFixed(2);
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
  const totalMemoryInMB = (totalMemory / 1024 / 1024).toFixed(2);
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  const uptimeSeconds = Math.floor(uptime % 60);

  return new EmbedBuilder()
    .setColor(config.embedColors.main) // Adjust this color as per your config
    .setTitle(`${client.user.username} - Bot Information`)
    .setThumbnail(client.user.displayAvatarURL())
    .setImage(config.bannerUrl)
    .addFields(
      {
        name: "`⏳` Uptime",
        value: `\`${uptimeHours}H ${uptimeMinutes}M ${uptimeSeconds}S\``,
        inline: true,
      },
      {
        name: "`💾` Memory Usage",
        value: `\`${usedMemory} MB / ${totalMemoryInMB} MB\``,
        inline: true,
      },
      { name: "`🖥️` CPU", value: `\`${cpu}\``, inline: true },
      {
        name: "`⚙️` CPU Usage",
        value: `\`${cpuUsage}%\``,
        inline: true,
      },
      { name: "`👥` Users", value: `\`${guild.memberCount}\``, inline: true },
      {
        name: "`📚` Discord.js Version",
        value: `\`v${discordJsVersion}\``,
        inline: true,
      },
      {
        name: "`🔧` Node.js Version",
        value: `\`${nodeJsVersion}\``,
        inline: true,
      },
      {
        name: "`🌐` Servers",
        value: `\`${client.guilds.cache.size}\``,
        inline: true,
      },
      {
        name: "`📅` Created On",
        value: `\`${client.user.createdAt.toDateString()}\``,
        inline: true,
      },
      {
        name: "`🏓` Ping",
        value: `\`${Math.round(client.ws.ping)}ms\``,
        inline: true,
      },
      { name: "`🔢` Shard ID", value: `\`${guild.shardId}\``, inline: true },
      {
        name: "`📜` Total Commands",
        value: `\`${client.commands.size}\``,
        inline: true,
      }
    )
    .setFooter({
      text: `Requested by ${
        user.username
      } • ${new Date().toLocaleDateString()}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp();
}
