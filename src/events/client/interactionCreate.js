const { EmbedBuilder, MessageFlags } = require("discord.js");
const config = require("../../config/config.js");
const logger = require("../../utils/logger.js");
const adTemplates = require("../../config/advertisementTemplates.js");

// Import SVIP interaction handler
const svipInteractionHandler = require("../svip/interactionHandler.js");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      // Handle SVIP interactions first
      if (interaction.customId && interaction.customId.startsWith("svip_")) {
        return await svipInteractionHandler.execute(interaction);
      }

      // Handle Button interactions
      if (interaction.isButton()) {
        if (
          ["advertise_confirm", "advertise_cancel"].includes(
            interaction.customId
          )
        ) {
          const state = client.advertiseState;

          if (!state) {
            return interaction.reply({
              content: "No active advertisement process found.",
              flags: MessageFlags.Ephemeral,
            });
          }

          if (state.interaction.user.id !== interaction.user.id) {
            return interaction.reply({
              content: "You are not authorized to interact with these buttons.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const originalMessage = state.message; // Access the original message from the state
          if (
            !originalMessage ||
            !originalMessage.embeds ||
            !originalMessage.embeds[0]
          ) {
            return interaction.reply({
              content: "Unable to retrieve the original embed message.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const originalEmbed = originalMessage.embeds[0];          if (interaction.customId === "advertise_confirm") {
            const confirmTemplate = adTemplates.confirmationMessages.confirmed;
            const confirmEmbed = EmbedBuilder.from(originalEmbed)
              .setColor(config.embedColors[confirmTemplate.color])
              .setDescription(confirmTemplate.description);

            await interaction.update({
              embeds: [confirmEmbed],
              components: [],
            });const advertiseCommand = client.slashCommands.get("advertise");
            if (
              advertiseCommand &&
              typeof advertiseCommand.startAdvertising === "function"
            ) {
              await advertiseCommand.startAdvertising(
                state.interaction,
                state.eligibleChannels,
                state.event,
                state.rotations
              );
            } else {
              logger.error(
                "Advertise command or its method 'startAdvertising' is not found."
              );
            }          } else if (interaction.customId === "advertise_cancel") {
            const cancelTemplate = adTemplates.confirmationMessages.cancelled;
            const cancelEmbed = EmbedBuilder.from(originalEmbed)
              .setColor(config.embedColors[cancelTemplate.color])
              .setDescription(cancelTemplate.description);

            await interaction.update({
              embeds: [cancelEmbed],
              components: [],
            });
          }

          // Clean up temporary state
          delete client.advertiseState;
          return;
        }

        // Handle boost store reset confirmation buttons
        if (["booststore_reset_confirm", "booststore_reset_cancel"].includes(interaction.customId)) {
          const { devBoostManager } = require("../../utils/devBoostManager.js");
          
          // Check permissions
          const config = require("../../config/config.js");
          const hasPermission = config.naig.includes(interaction.user.id) || interaction.user.id === config.developerId;
          
          if (!hasPermission) {
            return interaction.reply({
              content: "You don't have permission to use this button.",
              flags: MessageFlags.Ephemeral,
            });
          }

          if (interaction.customId === "booststore_reset_confirm") {
            devBoostManager.resetBoostStore();
            
            const confirmEmbed = new EmbedBuilder()
              .setTitle("✅ Boost Store Reset")
              .setDescription(
                "The boost store has been successfully reset!\n\n" +
                "**Actions taken:**\n" +
                "✅ All fake boosts removed\n" +
                "✅ Server boost count reset to 0\n" +
                "✅ Boost tier reset to 0\n" +
                "✅ All boost history cleared\n\n" +
                "The boost store is now empty and ready for testing."
              )
              .setColor(config.embedColors.success)
              .setTimestamp();

            await interaction.update({
              embeds: [confirmEmbed],
              components: [],
            });

          } else if (interaction.customId === "booststore_reset_cancel") {
            const cancelEmbed = new EmbedBuilder()
              .setTitle("❌ Reset Cancelled")
              .setDescription("The boost store reset has been cancelled. No changes were made.")
              .setColor(config.embedColors.info);

            await interaction.update({
              embeds: [cancelEmbed],
              components: [],
            });
          }
          return;
        }

        // Handle SVIP test quick action buttons
        if (interaction.customId.startsWith("devtest_")) {
          const { devBoostManager } = require("../../utils/devBoostManager.js");
          
          // Check permissions
          const config = require("../../config/config.js");
          const hasPermission = config.naig.includes(interaction.user.id) || interaction.user.id === config.developerId;
          
          if (!hasPermission) {
            return interaction.reply({
              content: "You don't have permission to use this button.",
              flags: MessageFlags.Ephemeral,
            });
          }

          const [action, userId] = interaction.customId.replace("devtest_", "").split("_");
          
          if (action === "add") {
            const user = await interaction.client.users.fetch(userId);
            devBoostManager.addBoost(userId, user.username);
            
            const embed = new EmbedBuilder()
              .setTitle("✅ Fake Boost Added")
              .setDescription(`Added fake boost for ${user}!\n\nYou can now test SVIP features with this user.`)
              .setColor(config.embedColors.success);

            await interaction.update({ embeds: [embed], components: [] });

          } else if (action === "remove") {
            const user = await interaction.client.users.fetch(userId);
            devBoostManager.removeBoost(userId);
            
            const embed = new EmbedBuilder()
              .setTitle("✅ Fake Boost Removed")
              .setDescription(`Removed fake boost from ${user}!\n\nThis user will no longer have SVIP access in dev mode.`)
              .setColor(config.embedColors.warning);

            await interaction.update({ embeds: [embed], components: [] });
          }
          return;
        }
      }

      // Handle Slash Command interactions
      if (interaction.isCommand()) {
        const command = client.slashCommands.get(interaction.commandName);

        if (!command) {
          return interaction.reply({
            content: "This command is not recognized.",
            flags: MessageFlags.Ephemeral,
          });
        }

        try {
          await command.execute(interaction, client);
        } catch (error) {
          logger.error(
            `Error executing command ${interaction.commandName}:`,
            error
          );

          await interaction.reply({
            content:
              "An unexpected error occurred while executing this command. Please try again later.",
            flags: MessageFlags.Ephemeral,
          });

          // Notify developer about the error
          const developerId = config.developerId; // Ensure developerId is defined in your config
          if (developerId) {
            try {
              const developer = await interaction.client.users.fetch(
                developerId
              );
              if (developer) {
                const developerEmbed = new EmbedBuilder()
                  .setTitle("Command Error")
                  .setColor(0xff0000)
                  .setDescription(
                    `Error Details:\n\`\`\`js\n${error.stack}\n\`\`\``
                  )
                  .addFields(
                    { name: "User", value: interaction.user.tag },
                    { name: "Command Name", value: interaction.commandName }
                  )
                  .setTimestamp();

                await developer.send({ embeds: [developerEmbed] });
              }
            } catch (fetchError) {
              logger.error(
                "Failed to fetch developer for error notification:",
                fetchError
              );
            }
          }
        }
      }
    } catch (error) {
      logger.error("Unexpected error in interactionCreate handler:", error);
    }
  },
};
