const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChannelType
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const fs = require("fs");
const client = require("../../index");
const path = require("path");
const config = require("../../config/config.js");
const logger = require("../../utils/logger");
const adTemplates = require("../../config/advertisementTemplates.js");

module.exports = {  data: new SlashCommandBuilder()
    .setName("advertise")
    .setDescription("Advertise an event in voice and text channels")
    .addStringOption((option) =>
      option
        .setName("event")
        .setDescription("Choose an event to advertise")
        .setRequired(true)
        .addChoices(getEventChoices())
    )
    .addIntegerOption((option) =>
      option
        .setName("rotations")
        .setDescription("Number of advertisement rotations (1-3)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(3)
    )
    .addBooleanOption((option) =>
      option
        .setName("auto")
        .setDescription(
          "Automatically advertise in eligible channels (true: start immediately, false: confirm first)"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("test")
        .setDescription(
          "Test mode: Provide one or more voice channel IDs separated by commas"
        )
    ),
  name: "advertise",
  description: "Advertise an event in voice and text channels",
  prefix: false,
  async execute(interaction) {
    const event = interaction.options.getString("event");
    const testChannelIds = interaction.options.getString("test");
    const auto = interaction.options.getBoolean("auto");
    const rotations = interaction.options.getInteger("rotations") || 1;

    if (testChannelIds) {
      // Handle test mode (immediate advertisement in specified channels)
      await this.advertiseInTestChannels(interaction, event, testChannelIds, rotations);
    } else {
      // Proceed with auto or manual logic based on the `auto` option
      await this.advertiseAuto(interaction, event, auto, rotations);
    }
  },
  async advertiseInTestChannels(interaction, event, testChannelIds, rotations) {
    const guild = interaction.guild;
    const channelIds = testChannelIds.split(",").map((id) => id.trim());
    const channels = channelIds
      .map((id) => guild.channels.cache.get(id))
      .filter((channel) => channel && channel.type === ChannelType.GuildVoice); // Only voice channels

    if (!channels.length) {
      return interaction.reply({
        content: "No valid voice channels found for testing.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply({
      content: `Starting test advertisement for the event: **${event}** in the specified channels with **${rotations}** rotation(s).`,
      flags: MessageFlags.Ephemeral,
    });

    try {
      await this.startAdvertising(interaction, channels, event, rotations);
    } catch (error) {
      logger.error("Error during test advertisement:", error);
    }
  },
  async advertiseAuto(interaction, event, auto, rotations) {
    const guild = interaction.guild;

    // Fetch and filter all eligible voice channels
    const eligibleChannels = guild.channels.cache
      .filter(
        (channel) =>
          channel.type === ChannelType.GuildVoice && // Voice channels only
          channel
            .permissionsFor(guild.roles.everyone)
            .has(PermissionsBitField.Flags.Connect) &&
          channel.members.some((member) => !member.user.bot) // At least one non-bot member
      )
      .sort((a, b) => a.position - b.position); // Sort by position

    if (!eligibleChannels.size) {
      return interaction.reply({
        content: "No eligible voice channels found to advertise in.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Group channels by category
    const groupedChannels = {};
    eligibleChannels.forEach((channel) => {
      const category = channel.parent ? channel.parent.name : "No Category";
      if (!groupedChannels[category]) {
        groupedChannels[category] = [];
      }
      groupedChannels[category].push(channel);
    });

    if (auto) {      // Automatically start advertising
      const template = adTemplates.autoStartMessage;
      const embed = new EmbedBuilder()
        .setTitle(template.title)
        .setDescription(template.description.replace("{rotations}", rotations))
        .setColor(config.embedColors[template.color]);

      // Add sorted categories and their channels to the embed
      Object.keys(groupedChannels).forEach((category) => {
        const channelList = groupedChannels[category]
          .map((channel) => `- <#${channel.id}>`)
          .join("\n");

        embed.addFields({ name: category, value: channelList });
      });

      const mp3Path = path.join(__dirname, "../../mp3Voices");
      const mp3Files = [
        path.join(mp3Path, "1entrance.mp3"),
        path.join(mp3Path, "2introduction.mp3"),
        path.join(mp3Path, "events", `${event}.mp3`),
        path.join(mp3Path, "4thankyou-bye.mp3"),
        path.join(mp3Path, "5leave.mp3"),
      ];
      const totalDurationInSeconds = await calculateTotalDuration(mp3Files);
      const seconds = Math.round(totalDurationInSeconds % 60);
      const totalChannels = eligibleChannels.size;
      const overallDurationInSeconds = totalDurationInSeconds * totalChannels * rotations;
      const overallMinutes = Math.floor(overallDurationInSeconds / 60);
      const overallSecondsFinal = Math.round(overallDurationInSeconds % 60);

      embed.addFields({
        name: "Time per channel",
        value: `\`${seconds}\` seconds`,
        inline: true,
      });
      embed.addFields({
        name: "Total channels",
        value: `\`${totalChannels}\``,
        inline: true,
      });
      embed.addFields({
        name: "Rotations",
        value: `\`${rotations}\``,
        inline: true,
      });
      embed.addFields({
        name: "Overall duration",
        value: `\`${overallMinutes}\` **Minutes** and \`${overallSecondsFinal}\` **Seconds**`,
        inline: true,
      });

      await interaction.reply({ embeds: [embed] });
      await this.startAdvertising(
        interaction,
        [...eligibleChannels.values()],
        event,
        rotations
      );
    } else {      // Manual confirmation logic
      const template = adTemplates.manualConfirmMessage;
      const embed = new EmbedBuilder()
        .setTitle(template.title)
        .setDescription(template.description.replace("{rotations}", rotations))
        .setColor(config.embedColors[template.color]);

      // Add sorted categories and their channels to the embed
      Object.keys(groupedChannels).forEach((category) => {
        const channelList = groupedChannels[category]
          .map((channel) => `- <#${channel.id}>`)
          .join("\n");

        embed.addFields({ name: category, value: channelList });
      });

      const mp3Path = path.join(__dirname, "../../mp3Voices");
      const mp3Files = [
        path.join(mp3Path, "1entrance.mp3"),
        path.join(mp3Path, "2introduction.mp3"),
        path.join(mp3Path, "events", `${event}.mp3`),
        path.join(mp3Path, "4thankyou-bye.mp3"),
        path.join(mp3Path, "5leave.mp3"),
      ];
      const totalDurationInSeconds = await calculateTotalDuration(mp3Files);
      const seconds = Math.round(totalDurationInSeconds % 60);
      const totalChannels = eligibleChannels.size;
      const overallDurationInSeconds = totalDurationInSeconds * totalChannels * rotations;
      const overallMinutes = Math.floor(overallDurationInSeconds / 60);
      const overallSecondsFinal = Math.round(overallDurationInSeconds % 60);

      embed.addFields({
        name: "Time per channel",
        value: `\`${seconds}\` seconds`,
        inline: true,
      });
      embed.addFields({
        name: "Total channels",
        value: `\`${totalChannels}\``,
        inline: true,
      });
      embed.addFields({
        name: "Rotations",
        value: `\`${rotations}\``,
        inline: true,
      });
      embed.addFields({
        name: "Overall duration",
        value: `\`${overallMinutes}\` **Minutes** and \`${overallSecondsFinal}\` **Seconds**`,
        inline: true,
      });

      // Buttons for confirmation
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("advertise_confirm")
          .setLabel("Start Advertising")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("advertise_cancel")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        embeds: [embed],
        components: [buttons],
      });

      // Store temporary state for button handling
      interaction.client.advertiseState = {
        interaction,
        event,
        eligibleChannels: [...eligibleChannels.values()],
        rotations,
        message: await interaction.fetchReply(),
      };
    }
  },
  async startAdvertising(interaction, voiceChannels, event, rotations = 1) {
    const guild = interaction.guild;

    // Helper function to find associated text channel for a voice channel
    const findAssociatedTextChannel = (voiceChannel) => {
      // Look for text channels in the same category with similar naming
      const category = voiceChannel.parent;
      if (!category) return null;

      // Common patterns for associated text channels
      const voiceName = voiceChannel.name.toLowerCase();
      const textChannelsInCategory = category.children.cache
        .filter(channel => channel.type === ChannelType.GuildText)
        .filter(channel => {
          const bot = guild.members.me;
          return channel.permissionsFor(bot).has([
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ViewChannel
          ]);
        });

      // Try to find exact name match first
      let textChannel = textChannelsInCategory.find(channel => 
        channel.name.toLowerCase() === voiceName
      );

      // If no exact match, try similar names
      if (!textChannel) {
        const nameParts = voiceName.split(/[-_\s]/);
        textChannel = textChannelsInCategory.find(channel => {
          const channelName = channel.name.toLowerCase();
          return nameParts.some(part => channelName.includes(part) && part.length > 2);
        });
      }

      // If still no match, get the first general text channel in category
      if (!textChannel) {
        textChannel = textChannelsInCategory.first();
      }

      return textChannel;
    };    // Create advertisement message content using template
    const createAdvertisementMessage = (event, rotation, currentRotation) => {      const eventName = event.charAt(0).toUpperCase() + event.slice(1);
      const template = adTemplates.textChannelMessage;
      
      // Get event channel mention if it exists
      const eventChannelId = adTemplates.eventChannels[event.toLowerCase()];
      const eventChannelMention = eventChannelId ? `\n\n**Visit:** <#${eventChannelId}>` : '';
      
      return {
        embeds: [
          new EmbedBuilder()
            .setTitle(template.title.replace("{eventName}", eventName))
            .setDescription(template.description
              .replace(/{eventName}/g, eventName)
              .replace("{eventChannelMention}", eventChannelMention))
            .setColor(config.embedColors[template.color])
            
            .setTimestamp(template.timestamp ? new Date() : null)
            .setFooter({
              text: template.footer.text.replace("{username}", interaction.guild.name),
              iconURL: template.footer.useUserAvatar ? interaction.guild.iconURL({ dynamic: true, size: 4096 }) : null
            })
        ]
      };
    };

    const mp3Path = path.join(__dirname, "../../mp3Voices");
    const mp3Files = [
      path.join(mp3Path, "1entrance.mp3"),
      path.join(mp3Path, "2introduction.mp3"),
      path.join(mp3Path, "events", `${event}.mp3`),
      path.join(mp3Path, "4thankyou-bye.mp3"),
      path.join(mp3Path, "5leave.mp3"),
    ];    // Check if all files exist
    const missingFiles = mp3Files.filter((file) => !fs.existsSync(file));
    if (missingFiles.length > 0) {
      const errorMessage = `The following MP3 files are missing: ${missingFiles
        .map((f) => path.basename(f))
        .join(", ")}`;
      logger.error(errorMessage);
      
      // Safe error message sending
      try {
        return await interaction.followUp(errorMessage);
      } catch (error) {
        logger.warn("Follow-up failed, sending error to channel instead");
        try {
          return await interaction.channel.send(errorMessage);
        } catch (channelError) {
          logger.error("Failed to send error message:", channelError);
        }
      }
    }

    const player = createAudioPlayer();
    const results = {
      voice: new Map(),
      text: new Map(),
      totalRotations: rotations
    };    // Track which voice channels have already received messages
    const sentTextChannels = new Set();

    player.on(AudioPlayerStatus.Playing, () => {
      const resource = player.state.resource;
      if (resource && resource.metadata && resource.metadata.channelId) {
        const currentChannel = voiceChannels.find(
          (channel) => channel.id === resource.metadata.channelId
        );
        if (currentChannel) {
          logger.info(`Started playing in channel: ${currentChannel.name}`);
        }
      }
    });

    player.on(AudioPlayerStatus.Idle, () => {
      logger.success(`Audio finished playing.`);
    });

    player.on("error", (error) => {
      logger.error("Audio player error:", error);
    });

    // Group channels by category and sort within each category
    const groupedChannels = {};
    voiceChannels.forEach((channel) => {
      const category = channel.parent ? channel.parent.name : "No Category";
      if (!groupedChannels[category]) {
        groupedChannels[category] = [];
      }
      groupedChannels[category].push(channel);
    });

    // Flatten the grouped channels into a sorted array
    const sortedChannels = Object.values(groupedChannels).flat();    // Execute rotations
    for (let currentRotation = 1; currentRotation <= rotations; currentRotation++) {
      logger.info(`Starting rotation ${currentRotation}/${rotations}`);

      // Send progress update for each rotation to keep interaction alive
      if (currentRotation === 1 && sortedChannels.length > 3) {
        try {
          await interaction.editReply({
            content: `🔄 Starting advertising rotation ${currentRotation}/${rotations} in ${sortedChannels.length} channels...`,
            embeds: [],
            components: []
          });
        } catch (error) {
          logger.warn("Failed to update progress message:", error.message);
        }
      }      for (const channel of sortedChannels) {
        // Update progress every 5 channels to keep interaction alive
        const channelIndex = sortedChannels.indexOf(channel);
        if (channelIndex > 0 && channelIndex % 5 === 0) {
          try {
            await interaction.editReply({
              content: `🔄 Progress: ${channelIndex}/${sortedChannels.length} channels completed in rotation ${currentRotation}/${rotations}...`,
              embeds: [],
              components: []
            });
          } catch (error) {
            logger.warn("Failed to update progress:", error.message);
          }
        }

        // Skip if channel no longer exists
        const validChannel = guild.channels.cache.get(channel.id);
        if (!validChannel) {
          logger.warn(`Channel ${channel.name} is missing. Skipping...`);
          results.voice.set(channel.id, { name: channel.name, status: 'missing' });
          continue;
        }

        // Check if channel still has non-bot members
        if (!validChannel.members.some(member => !member.user.bot)) {
          logger.info(`Channel ${channel.name} is now empty. Skipping...`);
          results.voice.set(channel.id, { name: channel.name, status: 'empty' });
          continue;
        }

        try {
          // Join voice channel and play audio
          const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
          });

          for (const filePath of mp3Files) {
            const resource = createAudioResource(filePath, {
              inlineVolume: true,
              metadata: { channelId: channel.id },
            });
            resource.volume.setVolume(0.8);

            player.play(resource);
            connection.subscribe(player);

            await new Promise((resolve) => {
              player.once(AudioPlayerStatus.Idle, resolve);
            });
          }          connection.destroy();
          results.voice.set(channel.id, { name: channel.name, status: 'success' });

          // Send message directly to the voice channel (only once per channel)
          if (!sentTextChannels.has(channel.id)) {
            try {
              const messageContent = createAdvertisementMessage(event, rotations, currentRotation);
              await channel.send(messageContent);
              sentTextChannels.add(channel.id);
              results.text.set(channel.id, { name: channel.name, status: 'success' });
              logger.info(`Sent advertisement message to voice channel: ${channel.name}`);
            } catch (textError) {
              logger.error(`Error sending message to voice channel ${channel.name}:`, textError);
              results.text.set(channel.id, { name: channel.name, status: 'failed' });
            }
          }

        } catch (error) {
          logger.error(`Error advertising in voice channel ${channel.name}:`, error);
          results.voice.set(channel.id, { name: channel.name, status: 'failed' });
        }

        // Small delay between channels to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Delay between rotations if there are more rotations
      if (currentRotation < rotations) {
        logger.info(`Completed rotation ${currentRotation}. Waiting before next rotation...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }    // Create final report
    const eventName = event.charAt(0).toUpperCase() + event.slice(1);
    const reportTemplate = adTemplates.reportMessage;
    const reportEmbed = new EmbedBuilder()
      .setTitle(reportTemplate.title)
      .setDescription(reportTemplate.description.replace("{eventName}", eventName))
      .setColor(config.embedColors[reportTemplate.color])
      .setFooter({
        text: reportTemplate.footer.text.replace("{username}", interaction.user.username),
        iconURL: reportTemplate.footer.useUserAvatar ? interaction.user.displayAvatarURL({ dynamic: true }) : null,
      })
      .setTimestamp(reportTemplate.timestamp ? new Date() : null);

    // Add voice channels report
    const voiceResults = Array.from(results.voice.values());
    const voiceSuccess = voiceResults.filter(r => r.status === 'success').length;
    const voiceFailed = voiceResults.filter(r => r.status === 'failed').length;
    const voiceSkipped = voiceResults.filter(r => r.status === 'missing' || r.status === 'empty').length;

    reportEmbed.addFields({
      name: reportTemplate.fields.voiceChannels.name,
      value: reportTemplate.fields.voiceChannels.value
        .replace("{voiceSuccess}", voiceSuccess)
        .replace("{voiceFailed}", voiceFailed)
        .replace("{voiceSkipped}", voiceSkipped)
        .replace("{totalRotations}", rotations),
      inline: reportTemplate.fields.voiceChannels.inline
    });

    // Add text channels report
    const textResults = Array.from(results.text.values());
    const textSuccess = textResults.filter(r => r.status === 'success').length;
    const textFailed = textResults.filter(r => r.status === 'failed').length;    reportEmbed.addFields({
      name: reportTemplate.fields.textChannels.name,
      value: reportTemplate.fields.textChannels.value
        .replace("{textSuccess}", textSuccess)
        .replace("{textFailed}", textFailed),
      inline: reportTemplate.fields.textChannels.inline
    });    // Add detailed breakdown if there are failures
    if (voiceFailed > 0 || textFailed > 0) {
      let failureDetails = "";
      
      voiceResults.filter(r => r.status === 'failed').forEach(result => {
        failureDetails += `🔊 ${result.name}: Voice failed\n`;
      });
      
      textResults.filter(r => r.status === 'failed').forEach(result => {
        failureDetails += `💬 ${result.name}: Text failed\n`;
      });

      if (failureDetails.length > 0) {
        reportEmbed.addFields({
          name: reportTemplate.fields.failureDetails.name,
          value: failureDetails.slice(0, 1024), // Discord field limit
          inline: reportTemplate.fields.failureDetails.inline
        });
      }
    }

    // Add detailed channel-by-channel report
    let channelDetails = "";
    const sortedChannelResults = sortedChannels.map(channel => {
      const voiceResult = results.voice.get(channel.id);
      const textResult = results.text.get(channel.id);
      
      let voiceStatus = "⏭️"; // Default skipped
      let textStatus = "⏭️"; // Default skipped
      
      if (voiceResult) {
        switch(voiceResult.status) {
          case 'success': voiceStatus = "`✅`"; break;
          case 'failed': voiceStatus = "`❌`"; break;
          case 'missing': voiceStatus = "`❓`"; break;
          case 'empty': voiceStatus = "`⏭️`"; break;
        }
      }
      
      if (textResult) {
        switch(textResult.status) {
          case 'success': textStatus = "`✅`"; break;
          case 'failed': textStatus = "`❌`"; break;
        }
      }
      
      return `<#${channel.id}>: ${voiceStatus} ${textStatus}`;
    });

    // Split channel details into multiple fields if too long
    const maxFieldLength = 1024;
    let currentField = "";
    let fieldCount = 1;
    
    for (const channelResult of sortedChannelResults) {
      if ((currentField + channelResult + "\n").length > maxFieldLength) {
        reportEmbed.addFields({
          name: `\`📋\` Channel Details ${fieldCount > 1 ? `(${fieldCount})` : ''}`,
          value: currentField || "No channels processed",
          inline: false
        });
        currentField = channelResult + "\n";
        fieldCount++;
      } else {
        currentField += channelResult + "\n";
      }
    }
    
    // Add the last field if there's remaining content
    if (currentField.trim()) {
      reportEmbed.addFields({
        name: `\`📋\` Channel Details ${fieldCount > 1 ? `(${fieldCount})` : ''}`,
        value: currentField,
        inline: false
      });    }

    await interaction.followUp({ embeds: [reportEmbed] }).catch(async (error) => {
      logger.warn("Failed to send follow-up message (interaction expired), sending to channel instead:", error.message);
      
      // If interaction expired, send to the same channel where the command was used
      try {
        await interaction.channel.send({ embeds: [reportEmbed] });
      } catch (channelError) {
        logger.error("Failed to send report to channel:", channelError);
        
        // Last resort: try to DM the user
        try {
          await interaction.user.send({ embeds: [reportEmbed] });
          logger.info("Sent report via DM to user");
        } catch (dmError) {
          logger.error("Failed to send report via DM:", dmError);
        }
      }
    });
  },
};

const mp3Duration = require("mp3-duration");

async function calculateTotalDuration(mp3Files) {
  let totalDurationInSeconds = 0;

  for (const file of mp3Files) {
    try {
      const duration = await new Promise((resolve, reject) => {
        mp3Duration(file, (err, duration) => {
          if (err) reject(err);
          resolve(duration);
        });
      });
      totalDurationInSeconds += duration;
    } catch (error) {
      logger.error(`Error reading MP3 file ${file}:`, error);
    }
  }

  return totalDurationInSeconds;
}

function getEventChoices() {
  const eventsPath = path.join(__dirname, "../../mp3Voices/events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".mp3"));
  return eventFiles.map((file) => ({
    name: file.replace(".mp3", ""),
    value: file.replace(".mp3", ""),
  }));
}
