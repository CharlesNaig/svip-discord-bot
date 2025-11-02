const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require("discord.js");
const config = require("../../config/config.js");
const { meetsBoostRequirements } = require("../../utils/svipUtils.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("svip-menu")
    .setDescription("Display the SVIP management menu (Admin-only - use permanent menu instead)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    // Check if SVIP system is enabled
    if (!config.svip.enabled) {
      return interaction.reply({
        content: "❌ The SVIP system is currently disabled.",
        flags: MessageFlags.Ephemeral
      });
    }

    const targetChannelId = "1275380970631200841";
    
    // Check if the command is being used in the correct channel
    if (interaction.channel.id !== targetChannelId) {
      return interaction.reply({
        content: `❌ This command can only be used in <#${targetChannelId}>\n\n` +
                `💡 **Tip:** Use the permanent SVIP menu above instead of this command!`,
        flags: MessageFlags.Ephemeral
      });
    }

    const guild = interaction.guild;
    const gld = "<a:t247_Ystar_rolling:1314525168491565098>";
    
    const menuEmbed = new EmbedBuilder()
      .setDescription(
        `<:SVIP:1314521308138307615> **SVIP.BOOSTER MENU**\n\n***INTERACTIVE BUTTONS:***\n\n` +
        `${gld} **\`Create Role\`**\n` +
        `> *Creates your own custom role linked to your boost status.*\n` +
        `> By clicking this button you can create a personalized role that lasts as long as you maintain your boost.\n\n` +
        `${gld} **\`Edit Role\`**\n` +
        `> *Edits your existing custom role.*\n` +
        `> Update your role's name, color, and icon through an interactive modal.\n\n` +
        `${gld} **\`Add Member\`**\n` +
        `> *Add members to your personalized role.*\n` +
        `> Select up to 25 members and set duration (minutes, hours, days, or permanent).\n\n` +
        `${gld} **\`Remove Member\`**\n` +
        `> *Remove members from your personalized role.*\n` +
        `> Select members to remove from your custom role.\n\n` +
        `${gld} **\`Request Role\`**\n` +
        `> *Request access to someone's custom role.*\n` +
        `> Browse available custom roles and request temporary access.\n\n` +
        `${gld} **\`Create Voice\`**\n` +
        `> *Creates a personalized voice channel.*\n` +
        `> Creates a voice channel linked to your boost status with custom permissions.\n\n` +
        `${gld} **\`Manage Role\`**\n` +
        `> *Advanced role management options.*\n` +
        `> Add admins, view statistics, and manage role settings.`
      )
      .setThumbnail(guild.iconURL({ dynamic: true, size: 4096 }))
      .setImage(
        "https://cdn.discordapp.com/attachments/1102122941854007327/1314541768091635723/SVIP_MENU.png"
      )
      .setFooter({
        text: `SVIP.BOOSTER MENU | ${guild.name}`,
        iconURL: guild.iconURL(),
      })
      .setColor("#ffd700")
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("svip_create_role")
        .setEmoji("1314525168491565098")
        .setLabel("Create Role")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("svip_edit_role")
        .setEmoji("1314525168491565098")
        .setLabel("Edit Role")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("svip_create_voice")
        .setEmoji("1314525168491565098")
        .setLabel("Create Voice")
        .setStyle(ButtonStyle.Success)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("svip_add_member")
        .setEmoji("1314525168491565098")
        .setLabel("Add Member")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("svip_remove_member")
        .setEmoji("1314525168491565098")
        .setLabel("Remove Member")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("svip_request_role")
        .setEmoji("1314525168491565098")
        .setLabel("Request Role")
        .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("svip_manage_role")
        .setEmoji("1314525168491565098")
        .setLabel("Manage Role")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("svip_role_list")
        .setEmoji("1314525168491565098")
        .setLabel("View Roles")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [menuEmbed],
      components: [row1, row2, row3],
      ephemeral: false
    });

    // Send a follow-up message recommending the permanent menu
    setTimeout(async () => {
      try {
        await interaction.followUp({
          content: `⚠️ **Admin Notice:** This temporary menu will expire in 15 minutes.\n\n` +
                  `💡 **Tip:** Use \`/svip-setup post\` to create a permanent menu that auto-refreshes!`,
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        // Ignore if interaction is already expired
      }
    }, 1000);
  },
};
