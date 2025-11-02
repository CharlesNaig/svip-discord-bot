const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  StringSelectMenuBuilder,
  ComponentType,
  MessageFlags,
  PermissionFlagsBits
} = require("discord.js");
const logger = require("../../utils/logger.js");
const config = require("../../config/config.js");
const {
  meetsBoostRequirements,
  canManageRole,
  isRoleFull,
  addUserToRole,
  removeUserFromRole,
  parseDuration,
  formatDuration,
  sendSvipNotification,
  sendUserDM,
  isDeveloper
} = require("../../utils/svipUtils.js");
const { handleRoleListButton } = require("../../utils/roleListManager.js");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith("svip_")) return;

    // Check if SVIP system is enabled
    if (!config.svip.enabled) {
      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        return interaction.reply({
          content: "❌ The SVIP system is currently disabled.",
          flags: MessageFlags.Ephemeral
        });
      } else if (interaction.isModalSubmit()) {
        return interaction.reply({
          content: "❌ The SVIP system is currently disabled.",
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    const CustomRole = require("../../schema/CustomRole.js");
    const SvipUser = require("../../schema/SvipUser.js");

    // Helper function to check SVIP access
    async function checkSvipAccess(interaction) {
      const hasAccess = await meetsBoostRequirements(interaction.guild, interaction.user.id);
      if (!hasAccess) {
        const errorEmbed = new EmbedBuilder()
          .setTitle(`❌ SVIP Access Required`)
          .setDescription(
            `You need to boost the server to use this feature!\n\n` +
            `**Requirements:**\n` +
            `🚀 Boost the server\n` +
            `📈 Server must have ${config.svip.boostrequire}+ total boosts`
          )
          .setColor(config.embedColors.error);

        // Only reply if we haven't replied/deferred yet
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
        return false;
      }
      return true;
    }

    // Helper function to safely reply to interaction
    async function safeReply(interaction, options) {
      try {
        if (interaction.replied) {
          return await interaction.followUp(options);
        } else if (interaction.deferred) {
          return await interaction.editReply(options);
        } else {
          return await interaction.reply(options);
        }
      } catch (error) {
        logger.error("Error in safeReply:", error);
        
        // Try to send an ephemeral error message if possible
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "❌ An error occurred while processing your request.",
              flags: MessageFlags.Ephemeral
            });
          }
        } catch (secondError) {
          logger.error("Could not send error message:", secondError);
        }
      }
    }

    try {
      // ROLE LIST BUTTON
      if (interaction.customId === "svip_role_list") {
        await handleRoleListButton(interaction);
        return;
      }

      // CREATE ROLE BUTTON
      if (interaction.customId === "svip_create_role") {
        // Check SVIP access first (this may reply with an error)
        if (!(await checkSvipAccess(interaction))) return;

        // If access check passed and we haven't replied yet, proceed
        if (interaction.replied || interaction.deferred) {
          // Access check already replied with error, don't proceed
          return;
        }

        // Check if user already has a custom role
        const existingRole = await CustomRole.findOne({ ownerId: interaction.user.id });
        if (existingRole) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Role Already Exists`)
            .setDescription(
              `You already have a custom role: <@&${existingRole.roleId}>\n\n` +
              `Use the **Edit Role** button to modify it.`
            )
            .setColor(config.embedColors.error);

          return await safeReply(interaction, { embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Show create role modal
        try {
          const modal = new ModalBuilder()
            .setCustomId("svip_create_role_modal")
            .setTitle("Create Custom Role");

          const nameInput = new TextInputBuilder()
            .setCustomId("role_name")
            .setLabel("Role Name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
            .setPlaceholder("Enter your custom role name...");

          const colorInput = new TextInputBuilder()
            .setCustomId("role_color")
            .setLabel("Role Color (Hex Code)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(7)
            .setPlaceholder("#FF0000 or leave blank for random");

          const iconInput = new TextInputBuilder()
            .setCustomId("role_icon")
            .setLabel("Role Icon (Emoji or URL)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(200)
            .setPlaceholder("🎉 or https://example.com/icon.png");

          const row1 = new ActionRowBuilder().addComponents(nameInput);
          const row2 = new ActionRowBuilder().addComponents(colorInput);
          const row3 = new ActionRowBuilder().addComponents(iconInput);

          modal.addComponents(row1, row2, row3);
          await interaction.showModal(modal);
        } catch (error) {
          logger.error("Error showing create role modal:", error);
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Error`)
            .setDescription("Failed to show the role creation form. Please try again.")
            .setColor(config.embedColors.error);
          
          await safeReply(interaction, { embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
      }

      // CREATE ROLE MODAL SUBMISSION
      else if (interaction.isModalSubmit() && interaction.customId === "svip_create_role_modal") {
        // Check if interaction is still valid before deferring
        if (interaction.deferred || interaction.replied) {
          return; // Already handled
        }

        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        } catch (error) {
          logger.error("Failed to defer reply for create role modal:", error);
          return; // Exit if we can't defer
        }

        const roleName = interaction.fields.getTextInputValue("role_name");
        const roleColor = interaction.fields.getTextInputValue("role_color") || null;
        const roleIcon = interaction.fields.getTextInputValue("role_icon") || null;

        try {
          // Create the Discord role
          const guild = interaction.guild;
          const category = guild.channels.cache.get(config.svip.categoryId);
          
          let color = "#ffd700"; // Default gold color
          if (roleColor) {
            // Validate hex color
            if (/^#[0-9A-F]{6}$/i.test(roleColor)) {
              color = roleColor;
            }
          } else {
            // Generate random color
            color = "#" + Math.floor(Math.random()*16777215).toString(16);
          }

          const role = await guild.roles.create({
            name: roleName,
            color: color,
            permissions: [],
            position: category ? category.position : undefined,
            reason: `SVIP custom role created by ${interaction.user.tag}`
          });

          // Add role to the user
          await interaction.member.roles.add(role);

          // Save to database
          const customRole = new CustomRole({
            roleId: role.id,
            roleName: roleName,
            roleColor: color,
            roleIcon: roleIcon,
            ownerId: interaction.user.id,
            admins: [],
            permanentUsers: [{
              userId: interaction.user.id,
              addedBy: interaction.user.id,
              addedAt: new Date()
            }],
            createdAt: new Date(),
            lastBoostCheck: new Date(),
            isActive: true
          });

          await customRole.save();

          // Update SVIP user record
          await SvipUser.findOneAndUpdate(
            { userId: interaction.user.id },
            { 
              hasCustomRole: true,
              customRoleId: role.id
            },
            { upsert: true }
          );

          const successEmbed = new EmbedBuilder()
            .setTitle(`✅ Custom Role Created!`)
            .setDescription(
              `Your custom role has been created successfully!\n\n` +
              `**Role:** <@&${role.id}>\n` +
              `**Name:** ${roleName}\n` +
              `**Color:** ${color}\n` +
              `${roleIcon ? `**Icon:** ${roleIcon}\n` : ''}` +
              `**Created:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
              `You can now use the **Add Member** button to invite others to your role!`
            )
            .setColor(color)
            .setTimestamp();

          // Send notification to SVIP channel
          const notifyEmbed = new EmbedBuilder()
            .setTitle(`🎉 New Custom Role Created`)
            .setDescription(
              `<@${interaction.user.id}> has created a new custom role!\n\n` +
              `**Role:** <@&${role.id}>\n` +
              `**Owner:** <@${interaction.user.id}>`
            )
            .setColor(color)
            .setTimestamp();

          await sendSvipNotification(interaction.client, notifyEmbed);
          await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
          logger.error("Error creating custom role:", error);
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Error Creating Role`)
            .setDescription(`Failed to create custom role. Please try again later.`)
            .setColor(config.embedColors.error);

          await interaction.editReply({ embeds: [errorEmbed] });
        }
      }

      // EDIT ROLE BUTTON
      else if (interaction.customId === "svip_edit_role") {
        // Check SVIP access first
        if (!(await checkSvipAccess(interaction))) return;

        // If access check replied with error, don't proceed
        if (interaction.replied || interaction.deferred) {
          return;
        }

        const customRole = await CustomRole.findOne({ ownerId: interaction.user.id });
        if (!customRole) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ No Custom Role Found`)
            .setDescription(
              `You don't have a custom role to edit.\n\n` +
              `Use the **Create Role** button to create one first.`
            )
            .setColor(config.embedColors.error);

          return await safeReply(interaction, { embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Show edit role modal
        try {
          const modal = new ModalBuilder()
            .setCustomId("svip_edit_role_modal")
            .setTitle("Edit Custom Role");

          const nameInput = new TextInputBuilder()
            .setCustomId("role_name")
            .setLabel("Role Name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(customRole.roleName || "")
            .setMaxLength(100);

          const colorInput = new TextInputBuilder()
            .setCustomId("role_color")
            .setLabel("Role Color (Hex Code)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(customRole.roleColor || "")
            .setMaxLength(7);

          const iconInput = new TextInputBuilder()
            .setCustomId("role_icon")
            .setLabel("Role Icon (Emoji or URL)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(customRole.roleIcon || "")
            .setMaxLength(200);

          const row1 = new ActionRowBuilder().addComponents(nameInput);
          const row2 = new ActionRowBuilder().addComponents(colorInput);
          const row3 = new ActionRowBuilder().addComponents(iconInput);

          modal.addComponents(row1, row2, row3);
          await interaction.showModal(modal);
        } catch (error) {
          logger.error("Error showing edit role modal:", error);
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Error`)
            .setDescription("Failed to show the role editing form. Please try again.")
            .setColor(config.embedColors.error);
          
          await safeReply(interaction, { embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
      }

      // EDIT ROLE MODAL SUBMISSION
      else if (interaction.isModalSubmit() && interaction.customId === "svip_edit_role_modal") {
        // Check if interaction is still valid before deferring
        if (interaction.deferred || interaction.replied) {
          return; // Already handled
        }

        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        } catch (error) {
          logger.error("Failed to defer reply for edit role modal:", error);
          return; // Exit if we can't defer
        }

        const customRole = await CustomRole.findOne({ ownerId: interaction.user.id });
        if (!customRole) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Custom Role Not Found`)
            .setDescription(`Your custom role could not be found.`)
            .setColor(config.embedColors.error);

          return interaction.editReply({ embeds: [errorEmbed] });
        }

        const roleName = interaction.fields.getTextInputValue("role_name");
        const roleColor = interaction.fields.getTextInputValue("role_color") || null;
        const roleIcon = interaction.fields.getTextInputValue("role_icon") || null;

        try {
          const guild = interaction.guild;
          const role = guild.roles.cache.get(customRole.roleId);
          
          if (!role) {
            const errorEmbed = new EmbedBuilder()
              .setTitle(`❌ Discord Role Not Found`)
              .setDescription(`The Discord role for your custom role was not found.`)
              .setColor(config.embedColors.error);

            return interaction.editReply({ embeds: [errorEmbed] });
          }

          let color = roleColor;
          if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
            color = customRole.roleColor || "#ffd700";
          }

          // Update Discord role
          await role.edit({
            name: roleName,
            color: color || role.color,
          });

          // Update database
          customRole.roleName = roleName;
          if (color) customRole.roleColor = color;
          if (roleIcon !== null) customRole.roleIcon = roleIcon;
          await customRole.save();

          const successEmbed = new EmbedBuilder()
            .setTitle(`✅ Custom Role Updated!`)
            .setDescription(
              `Your custom role has been updated successfully!\n\n` +
              `**Role:** <@&${role.id}>\n` +
              `**Name:** ${roleName}\n` +
              `**Color:** ${color || 'Unchanged'}\n` +
              `${roleIcon ? `**Icon:** ${roleIcon}\n` : ''}` +
              `**Updated:** <t:${Math.floor(Date.now() / 1000)}:R>`
            )
            .setColor(color || role.color)
            .setTimestamp();

          await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
          logger.error("Error editing custom role:", error);
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Error Updating Role`)
            .setDescription(`Failed to update custom role. Please try again later.`)
            .setColor(config.embedColors.error);

          await interaction.editReply({ embeds: [errorEmbed] });
        }
      }

      // ADD MEMBER BUTTON
      else if (interaction.customId === "svip_add_member") {
        // Check SVIP access first
        if (!(await checkSvipAccess(interaction))) return;

        // If access check replied with error, don't proceed
        if (interaction.replied || interaction.deferred) {
          return;
        }

        const customRole = await CustomRole.findOne({ ownerId: interaction.user.id });
        if (!customRole) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ No Custom Role Found`)
            .setDescription(
              `You don't have a custom role to manage.\n\n` +
              `Use the **Create Role** button to create one first.`
            )
            .setColor(config.embedColors.error);

          return await safeReply(interaction, { embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Check if role is full
        if (await isRoleFull(interaction.guild, customRole.roleId)) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Role is Full`)
            .setDescription(
              `Your custom role has reached the maximum limit of 25 members.\n\n` +
              `Remove some members before adding new ones.`
            )
            .setColor(config.embedColors.error);

          return await safeReply(interaction, { embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Get available members (not already in the role)
        const role = interaction.guild.roles.cache.get(customRole.roleId);
        const availableMembers = interaction.guild.members.cache
          .filter(member => 
            !member.user.bot && 
            !member.roles.cache.has(customRole.roleId) &&
            member.id !== interaction.user.id
          )
          .first(25);

        if (availableMembers.length === 0) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ No Available Members`)
            .setDescription(`There are no available members to add to your role.`)
            .setColor(config.embedColors.error);

          return await safeReply(interaction, { embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Create select menu
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("svip_select_members_add")
          .setPlaceholder("Select members to add to your role...")
          .setMinValues(1)
          .setMaxValues(Math.min(availableMembers.length, 10))
          .addOptions(
            availableMembers.slice(0, 25).map(member => ({
              label: member.displayName,
              description: `${member.user.tag}`,
              value: member.id
            }))
          );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
          .setTitle(`👥 Add Members to Your Role`)
          .setDescription(
            `Select up to 10 members to add to your custom role: <@&${customRole.roleId}>\n\n` +
            `**Current members:** ${role?.members.size || 0}/25\n` +
            `**Available slots:** ${25 - (role?.members.size || 0)}`
          )
          .setColor(config.embedColors.info);

        await safeReply(interaction, {
          embeds: [embed],
          components: [row],
          flags: MessageFlags.Ephemeral
        });
      }

      // SELECT MEMBERS FOR ADDING
      else if (interaction.isStringSelectMenu() && interaction.customId === "svip_select_members_add") {
        const selectedUserIds = interaction.values;

        // Store selection in a temporary way (using interaction data)
        global.tempSvipSelections = global.tempSvipSelections || new Map();
        global.tempSvipSelections.set(interaction.user.id, {
          type: "add_members",
          userIds: selectedUserIds,
          roleOwnerId: interaction.user.id,
          timestamp: Date.now()
        });

        // Show duration modal
        const modal = new ModalBuilder()
          .setCustomId("svip_add_duration_modal")
          .setTitle("Set Duration for Members");

        const durationInput = new TextInputBuilder()
          .setCustomId("duration")
          .setLabel("Duration")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("Examples: 1d, 2h, 30min, permanent")
          .setMaxLength(50);

        const row = new ActionRowBuilder().addComponents(durationInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
      }

      // DURATION MODAL FOR ADDING MEMBERS
      else if (interaction.isModalSubmit() && interaction.customId === "svip_add_duration_modal") {
        // Check if interaction is still valid before deferring
        if (interaction.deferred || interaction.replied) {
          return; // Already handled
        }

        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        } catch (error) {
          logger.error("Failed to defer reply for duration modal:", error);
          return; // Exit if we can't defer
        }

        const durationStr = interaction.fields.getTextInputValue("duration");
        const expirationDate = parseDuration(durationStr);

        if (expirationDate === false) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Invalid Duration`)
            .setDescription(
              `Please use a valid duration format:\n\n` +
              `**Examples:**\n` +
              `• \`1d\` - 1 day\n` +
              `• \`2h\` - 2 hours\n` +
              `• \`30min\` - 30 minutes\n` +
              `• \`permanent\` - No expiration`
            )
            .setColor(config.embedColors.error);

          return interaction.editReply({ embeds: [errorEmbed] });
        }

        // Get stored selection
        const selection = global.tempSvipSelections?.get(interaction.user.id);
        if (!selection || selection.type !== "add_members") {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Selection Expired`)
            .setDescription(`Your member selection has expired. Please try again.`)
            .setColor(config.embedColors.error);

          return interaction.editReply({ embeds: [errorEmbed] });
        }

        const customRole = await CustomRole.findOne({ ownerId: interaction.user.id });
        if (!customRole) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Custom Role Not Found`)
            .setDescription(`Your custom role could not be found.`)
            .setColor(config.embedColors.error);

          return interaction.editReply({ embeds: [errorEmbed] });
        }

        try {
          const successfulAdds = [];
          const failedAdds = [];

          for (const userId of selection.userIds) {
            const member = interaction.guild.members.cache.get(userId);
            if (!member) {
              failedAdds.push(`<@${userId}> (not found)`);
              continue;
            }

            // Add to database
            if (expirationDate === null) {
              // Permanent
              const existingPermanent = customRole.permanentUsers.find(u => u.userId === userId);
              if (!existingPermanent) {
                customRole.permanentUsers.push({
                  userId,
                  addedBy: interaction.user.id,
                  addedAt: new Date()
                });
              }
            } else {
              // Trial
              const existingTrial = customRole.trialUsers.find(u => u.userId === userId);
              if (existingTrial) {
                existingTrial.expiration = expirationDate;
                existingTrial.addedBy = interaction.user.id;
                existingTrial.addedAt = new Date();
              } else {
                customRole.trialUsers.push({
                  userId,
                  expiration: expirationDate,
                  addedBy: interaction.user.id,
                  addedAt: new Date()
                });
              }
            }

            // Add role to user
            const success = await addUserToRole(
              interaction.client,
              interaction.guild,
              customRole.roleId,
              userId,
              interaction.user.id,
              expirationDate === null,
              expirationDate
            );

            if (success) {
              successfulAdds.push(`<@${userId}>`);
            } else {
              failedAdds.push(`<@${userId}> (failed to add role)`);
            }
          }

          await customRole.save();

          // Clean up temporary selection
          global.tempSvipSelections?.delete(interaction.user.id);

          const resultEmbed = new EmbedBuilder()
            .setTitle(`✅ Members Added to Role`)
            .setDescription(
              `**Role:** <@&${customRole.roleId}>\n` +
              `**Duration:** ${expirationDate ? formatDuration(expirationDate) : 'Permanent'}\n\n` +
              `**Successfully added (${successfulAdds.length}):**\n${successfulAdds.join(", ") || "None"}\n\n` +
              `${failedAdds.length > 0 ? `**Failed to add (${failedAdds.length}):**\n${failedAdds.join(", ")}\n\n` : ''}` +
              `**Total role members:** ${interaction.guild.roles.cache.get(customRole.roleId)?.members.size || 0}/25`
            )
            .setColor(config.embedColors.success)
            .setTimestamp();

          await interaction.editReply({ embeds: [resultEmbed] });

        } catch (error) {
          logger.error("Error adding members to role:", error);
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Error Adding Members`)
            .setDescription(`Failed to add members to your role. Please try again later.`)
            .setColor(config.embedColors.error);

          await interaction.editReply({ embeds: [errorEmbed] });
        }
      }

      // REMOVE MEMBER BUTTON
      else if (interaction.customId === "svip_remove_member") {
        // Check SVIP access first
        if (!(await checkSvipAccess(interaction))) return;

        // If access check replied with error, don't proceed
        if (interaction.replied || interaction.deferred) {
          return;
        }

        const customRole = await CustomRole.findOne({ ownerId: interaction.user.id });
        if (!customRole) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ No Custom Role Found`)
            .setDescription(
              `You don't have a custom role to manage.\n\n` +
              `Use the **Create Role** button to create one first.`
            )
            .setColor(config.embedColors.error);

          return await safeReply(interaction, { embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const role = interaction.guild.roles.cache.get(customRole.roleId);
        if (!role) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Discord Role Not Found`)
            .setDescription(`The Discord role for your custom role was not found.`)
            .setColor(config.embedColors.error);

          return await safeReply(interaction, { embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Get members in the role (excluding owner)
        const roleMembers = role.members.filter(member => 
          member.id !== interaction.user.id && !member.user.bot
        );

        if (roleMembers.size === 0) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ No Members to Remove`)
            .setDescription(`There are no members in your role to remove.`)
            .setColor(config.embedColors.error);

          return await safeReply(interaction, { embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Create select menu
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("svip_select_members_remove")
          .setPlaceholder("Select members to remove from your role...")
          .setMinValues(1)
          .setMaxValues(Math.min(roleMembers.size, 10))
          .addOptions(
            roleMembers.first(25).map(member => ({
              label: member.displayName,
              description: `${member.user.tag}`,
              value: member.id
            }))
          );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
          .setTitle(`👥 Remove Members from Your Role`)
          .setDescription(
            `Select up to 10 members to remove from your custom role: <@&${customRole.roleId}>\n\n` +
            `**Current members:** ${role.members.size}/25`
          )
          .setColor(config.embedColors.warning);

        await safeReply(interaction, {
          embeds: [embed],
          components: [row],
          flags: MessageFlags.Ephemeral
        });
      }

      // SELECT MEMBERS FOR REMOVAL
      else if (interaction.isStringSelectMenu() && interaction.customId === "svip_select_members_remove") {
        // Check if interaction is still valid before deferring
        if (interaction.deferred || interaction.replied) {
          return; // Already handled
        }

        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        } catch (error) {
          logger.error("Failed to defer reply for member removal:", error);
          return; // Exit if we can't defer
        }

        const selectedUserIds = interaction.values;
        const customRole = await CustomRole.findOne({ ownerId: interaction.user.id });
        
        if (!customRole) {
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Custom Role Not Found`)
            .setDescription(`Your custom role could not be found.`)
            .setColor(config.embedColors.error);

          return interaction.editReply({ embeds: [errorEmbed] });
        }

        try {
          const successfulRemoves = [];
          const failedRemoves = [];

          for (const userId of selectedUserIds) {
            const member = interaction.guild.members.cache.get(userId);
            if (!member) {
              failedRemoves.push(`<@${userId}> (not found)`);
              continue;
            }

            // Remove from database
            customRole.trialUsers = customRole.trialUsers.filter(u => u.userId !== userId);
            customRole.permanentUsers = customRole.permanentUsers.filter(u => u.userId !== userId);

            // Remove role from user
            const success = await removeUserFromRole(
              interaction.client,
              interaction.guild,
              customRole.roleId,
              userId,
              interaction.user.id
            );

            if (success) {
              successfulRemoves.push(`<@${userId}>`);
            } else {
              failedRemoves.push(`<@${userId}> (failed to remove role)`);
            }
          }

          await customRole.save();

          const resultEmbed = new EmbedBuilder()
            .setTitle(`✅ Members Removed from Role`)
            .setDescription(
              `**Role:** <@&${customRole.roleId}>\n\n` +
              `**Successfully removed (${successfulRemoves.length}):**\n${successfulRemoves.join(", ") || "None"}\n\n` +
              `${failedRemoves.length > 0 ? `**Failed to remove (${failedRemoves.length}):**\n${failedRemoves.join(", ")}\n\n` : ''}` +
              `**Total role members:** ${interaction.guild.roles.cache.get(customRole.roleId)?.members.size || 0}/25`
            )
            .setColor(config.embedColors.success)
            .setTimestamp();

          await interaction.editReply({ embeds: [resultEmbed] });

        } catch (error) {
          logger.error("Error removing members from role:", error);
          const errorEmbed = new EmbedBuilder()
            .setTitle(`❌ Error Removing Members`)
            .setDescription(`Failed to remove members from your role. Please try again later.`)
            .setColor(config.embedColors.error);

          await interaction.editReply({ embeds: [errorEmbed] });
        }
      }

      // More handlers can be added here for voice channels, request role, etc.
    
    } catch (error) {
      logger.error("Error in SVIP interaction handler:", error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle(`❌ System Error`)
        .setDescription(`An error occurred while processing your request. Please try again later.`)
        .setColor(config.embedColors.error);

      try {
        // Only try to respond if we haven't already responded/deferred and the interaction is still valid
        if (!interaction.deferred && !interaction.replied) {
          // Check if interaction is still valid (not expired)
          const now = Date.now();
          const interactionTime = interaction.createdTimestamp;
          const timeDiff = now - interactionTime;
          
          // Discord interactions expire after 15 minutes (900,000 ms)
          if (timeDiff < 900000) {
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
          } else {
            logger.warn("Interaction expired, cannot send error message to user");
          }
        } else if (interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        }
        // If already replied, we can't send another message
      } catch (replyError) {
        logger.error("Could not send error message to user:", replyError);
      }
    }
  }
};
