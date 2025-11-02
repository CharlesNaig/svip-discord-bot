const { EmbedBuilder, MessageFlags } = require("discord.js");
const logger = require("./logger.js");
const config = require("../config/config.js");
const { formatDuration } = require("./svipUtils.js");

/**
 * Generate and update the live role list embed
 */
async function updateRoleListEmbed(client) {
  try {
    const CustomRole = require("../schema/CustomRole.js");
    const CustomRoleMessage = require("../schema/CustomRoleMessage.js");
    
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;
    
    const channel = guild.channels.cache.get("1284150618235338906");
    if (!channel) return;
    
    const customRoles = await CustomRole.find({ isActive: true }).sort({ createdAt: -1 });
    
    if (customRoles.length === 0) {
      const noRolesEmbed = new EmbedBuilder()
        .setTitle(`📋 SVIP Custom Roles`)
        .setDescription(
          `No active custom roles found.\n\n` +
          `Boost the server to create your own custom role!`
        )
        .setColor(config.embedColors.info)
        .setFooter({
          text: `Last updated: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })}`,
          iconURL: guild.iconURL()
        })
        .setTimestamp();

      // Find existing message or send new one
      const existingMessages = await CustomRoleMessage.find();
      if (existingMessages.length > 0) {
        const message = await channel.messages.fetch(existingMessages[0].messageId).catch(() => null);
        if (message) {
          await message.edit({ embeds: [noRolesEmbed] });
        } else {
          const newMessage = await channel.send({ embeds: [noRolesEmbed] });
          await CustomRoleMessage.findOneAndUpdate(
            { messageId: existingMessages[0].messageId },
            { messageId: newMessage.id }
          );
        }
      } else {
        const newMessage = await channel.send({ embeds: [noRolesEmbed] });
        const messageDoc = new CustomRoleMessage({ messageId: newMessage.id });
        await messageDoc.save();
      }
      return;
    }

    // Create role fields
    const roleFields = [];
    
    for (const roleData of customRoles) {
      const role = guild.roles.cache.get(roleData.roleId);
      if (!role) {
        // Role was deleted, mark as inactive
        roleData.isActive = false;
        await roleData.save();
        continue;
      }

      const owner = `<@${roleData.ownerId}>`;
      const membersInRole = role.members.size;
      const userLimit = 25;
      
      // Calculate trial and permanent members
      const trialCount = roleData.trialUsers.length;
      const permanentCount = roleData.permanentUsers.length;
      
      const memberStatus = membersInRole >= userLimit 
        ? "`🔴 FULL`" 
        : `\`🟢 ${membersInRole}/${userLimit}\``;

      // Voice channel info
      const voiceChannel = roleData.voiceChannelId
        ? `<#${roleData.voiceChannelId}>`
        : "`❌ None`";

      // Expiration info
      const expirationInfo = roleData.expirationDate
        ? `<t:${Math.floor(roleData.expirationDate.getTime() / 1000)}:R>`
        : "`♾️ Permanent`";

      const bl = "`🔹`"; // Blue diamond

      const fieldValue = [
        `${bl} **Owner:** ${owner}`,
        `${bl} **Members:** ${memberStatus}`,
        `${bl} **Trial Users:** \`${trialCount}\``,
        `${bl} **Permanent Users:** \`${permanentCount}\``,
        `${bl} **Voice Channel:** ${voiceChannel}`,
        `${bl} **Expires:** ${expirationInfo}`,
        `${bl} **Created:** <t:${Math.floor(roleData.createdAt.getTime() / 1000)}:R>`
      ].join('\n');

      roleFields.push({
        name: `🎭 ${role.name}`,
        value: fieldValue,
        inline: false
      });
    }

    // Split into multiple embeds if needed (Discord limit)
    const embedsToSend = [];
    const maxFieldsPerEmbed = 5;
    
    for (let i = 0; i < roleFields.length; i += maxFieldsPerEmbed) {
      const chunk = roleFields.slice(i, i + maxFieldsPerEmbed);
      const isFirstEmbed = i === 0;
      
      const embed = new EmbedBuilder()
        .setColor("#ffd700")
        .setTimestamp();

      if (isFirstEmbed) {
        embed.setTitle(`📋 SVIP Custom Roles (${customRoles.length})`)
          .setDescription(
            `Here are all the active custom roles created by SVIP boosters!\n\n` +
            `🟢 = Available slots | 🔴 = Full | ♾️ = Permanent\n` +
            `Use the SVIP menu to request access to any role.`
          )
          .setThumbnail(guild.iconURL({ dynamic: true }))
          .setFooter({
            text: `Last updated: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })} | Total Roles: ${customRoles.length}`,
            iconURL: guild.iconURL()
          });
      }

      embed.addFields(chunk);
      embedsToSend.push(embed);
    }

    // Update or create messages
    const existingMessages = await CustomRoleMessage.find().sort({ _id: 1 });
    
    // Delete excess messages
    if (existingMessages.length > embedsToSend.length) {
      for (let i = embedsToSend.length; i < existingMessages.length; i++) {
        const message = await channel.messages.fetch(existingMessages[i].messageId).catch(() => null);
        if (message) await message.delete();
        await CustomRoleMessage.deleteOne({ _id: existingMessages[i]._id });
      }
    }

    // Update existing messages and create new ones
    for (let i = 0; i < embedsToSend.length; i++) {
      if (i < existingMessages.length) {
        // Update existing message
        const message = await channel.messages.fetch(existingMessages[i].messageId).catch(() => null);
        if (message) {
          await message.edit({ embeds: [embedsToSend[i]] });
        } else {
          // Message was deleted, create new one
          const newMessage = await channel.send({ embeds: [embedsToSend[i]] });
          existingMessages[i].messageId = newMessage.id;
          await existingMessages[i].save();
        }
      } else {
        // Create new message
        const newMessage = await channel.send({ embeds: [embedsToSend[i]] });
        const messageDoc = new CustomRoleMessage({ messageId: newMessage.id });
        await messageDoc.save();
      }
    }

    logger.info(`Updated SVIP role list with ${customRoles.length} roles`);

  } catch (error) {
    logger.error("Error updating role list embed:", error);
  }
}

/**
 * Handle role list button interaction
 */
async function handleRoleListButton(interaction) {
  try {
    const CustomRole = require("../../schema/CustomRole.js");
    
    const customRoles = await CustomRole.find({ isActive: true }).sort({ createdAt: -1 });
    
    if (customRoles.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(`📋 No Custom Roles`)
        .setDescription(`There are currently no active custom roles.`)
        .setColor(config.embedColors.info);

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 SVIP Custom Roles (${customRoles.length})`)
      .setDescription(
        `Here's a quick overview of all active custom roles:\n\n` +
        customRoles.slice(0, 10).map((role, index) => {
          const discordRole = interaction.guild.roles.cache.get(role.roleId);
          if (!discordRole) return '';
          
          const memberCount = discordRole.members.size;
          const status = memberCount >= 25 ? '🔴' : '🟢';
          
          return `${status} **${discordRole.name}** - <@${role.ownerId}> (${memberCount}/25)`;
        }).filter(line => line).join('\n')
      )
      .setColor("#ffd700")
      .setFooter({
        text: `Showing ${Math.min(customRoles.length, 10)} of ${customRoles.length} roles`,
        iconURL: interaction.guild.iconURL()
      })
      .setTimestamp();

    if (customRoles.length > 10) {
      embed.addFields({
        name: `📄 Full List`,
        value: `See <#1284150618235338906> for the complete list of all ${customRoles.length} roles.`,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

  } catch (error) {
    logger.error("Error handling role list button:", error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle(`❌ Error`)
      .setDescription(`Failed to load role list. Please try again later.`)
      .setColor(config.embedColors.error);

    await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
  }
}

module.exports = {
  updateRoleListEmbed,
  handleRoleListButton
};
