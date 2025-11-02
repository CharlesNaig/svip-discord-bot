const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { NameProcessor } = require("../../utils/cleanName");
const { TTSService } = require("../../utils/tts");
const { VoiceManager } = require("../../utils/voiceManager");
const { CommandHandler } = require("../../utils/commandHandler");

// Cooldown management
const cooldowns = new Map();
const COOLDOWN_TIME = 5000; // 5 seconds per channel

module.exports = {
  data: new SlashCommandBuilder()
    .setName("choose")
    .setDescription(
      "Choose a random user from your voice channel and call them out"
    )
    .addStringOption((option) =>
      option
        .setName("language")
        .setDescription("TTS language code (default: en)")
        .setRequired(false)
        .addChoices(
          { name: "English", value: "en" },
          { name: "Spanish", value: "es" },
          { name: "French", value: "fr" },
          { name: "German", value: "de" },
          { name: "Italian", value: "it" },
          { name: "Portuguese", value: "pt" },
          { name: "Japanese", value: "ja" },
          { name: "Korean", value: "ko" },
          { name: "Chinese", value: "zh" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("voice")
        .setDescription("ElevenLabs voice to use")
        .setRequired(false)
        .addChoices(
          { name: "Male (Josh)", value: "male" },
          { name: "Female (Bella)", value: "female" },
          { name: "Default (Rachel)", value: "default" }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName("exclude-bots")
        .setDescription("Exclude bots from selection (default: true)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // Check cooldown
      const cooldownKey = CommandHandler.getCooldownKey(
        "choose",
        interaction.channelId
      );
      const cooldownCheck = CommandHandler.checkCooldown(
        cooldowns,
        cooldownKey,
        COOLDOWN_TIME
      );

      if (cooldownCheck.onCooldown) {
        return interaction.reply({
          embeds: [CommandHandler.createErrorEmbed(cooldownCheck.message)],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Validate user is in voice channel
      const voiceValidation = CommandHandler.validateVoiceChannel(
        interaction.member
      );
      if (!voiceValidation.isValid) {
        return interaction.reply({
          embeds: [
            CommandHandler.createErrorEmbed(voiceValidation.errorMessage),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const voiceChannel = voiceValidation.voiceChannel;
      const botMember = interaction.guild.members.me;

      // Check bot permissions
      const voiceManager = new VoiceManager();
      const permissionCheck = voiceManager.checkVoicePermissions(
        voiceChannel,
        botMember
      );

      if (!permissionCheck.hasAllPermissions) {
        const missingPerms = permissionCheck.missingPermissions.join(", ");
        return interaction.reply({
          embeds: [
            CommandHandler.createErrorEmbed(
              `I need the following permissions in ${voiceChannel.name}: ${missingPerms}`
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Check stage channel status
      const stageCheck = voiceManager.checkStageChannelStatus(
        voiceChannel,
        botMember
      );
      if (stageCheck.isStageChannel && stageCheck.needsSpeakerRole) {
        return interaction.reply({
          embeds: [
            CommandHandler.createErrorEmbed(
              "I need to be promoted to speaker in this stage channel to use TTS!"
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Get command options
      const language = interaction.options.getString("language") || "en";
      const voiceType = interaction.options.getString("voice") || "default";
      const excludeBots =
        interaction.options.getBoolean("exclude-bots") ?? true;

      // Get eligible members
      const eligibleMembers = voiceManager.getEligibleMembers(voiceChannel, {
        excludeBots,
      });

      if (eligibleMembers.size === 0) {
        return interaction.reply({
          embeds: [
            CommandHandler.createErrorEmbed(
              "No eligible members found in the voice channel."
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Send initial response
      await interaction.reply({
        embeds: [
          CommandHandler.createProcessingEmbed(
            "🎲 Choosing a random member..."
          ),
        ],
      });

      // Select random member
      const membersArray = Array.from(eligibleMembers.values());
      const chosenMember =
        membersArray[Math.floor(Math.random() * membersArray.length)];

      // Extract readable name
      const nameProcessor = new NameProcessor();
      const displayName =
        chosenMember.displayName || chosenMember.user.username;
      const readableName = nameProcessor.extractReadableName(
        displayName,
        chosenMember.user.username
      );

      // Update message with chosen member
      await interaction.editReply({
        embeds: [
          CommandHandler.createProcessingEmbed(
            `🔊 Chosen: **${readableName}** — preparing audio...`
          ),
        ],
      });

      try {
        // Generate and play TTS
        const ttsService = new TTSService();
        const ttsText = ttsService.getAnnouncementText(readableName);
        const audioResource = await ttsService.createAudioResource(
          ttsText,
          language,
          voiceType
        );

        await voiceManager.playAudioInChannel(voiceChannel, audioResource);

        // Final success message with mention
        await interaction.editReply({
          embeds: [
            CommandHandler.createSuccessEmbed(
              `🎯 **${readableName}** has been chosen!`,
              chosenMember.id
            ),
          ],
        });
      } catch (audioError) {
        console.error("Audio playback failed:", audioError);

        // Fallback to text-only mention
        await interaction.editReply({
          embeds: [
            CommandHandler.createWarningEmbed(
              `⚠️ Audio failed, but **${readableName}** was chosen!`,
              chosenMember.id
            ),
          ],
        });
      }
    } catch (error) {
      await CommandHandler.handleCommandError(
        interaction,
        error,
        "An unexpected error occurred while executing the choose command."
      );
    }
  },
};
