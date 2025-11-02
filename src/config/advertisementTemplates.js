module.exports = {
  // Event channel mappings
  eventChannels: {
    karaoke: "1093028098775207936",
    podcast: "1268472839208439809", 
    giveaway: "1095596951774441512"
  },

  // Advertisement message template for text channels
  textChannelMessage: {
    title: "<a:tbyn_giveaways:1265359036933472417> {eventName} Event",
    description:
      `Join us for an exciting **{eventName}** event!\n\n` +
      `\`🔊\` **Now playing in voice channels**\n` +
      `\`📅\` Don't miss out on this amazing opportunity!{eventChannelMention}`,
    color: "main", // Uses config.embedColors.main
    
    footer: {
      text: "Advertised by {username}",
      useUserAvatar: true,
    },
    timestamp: true,
  },

  // Report message template for final summary
  reportMessage: {
    title: "`📊` Advertising Campaign Report",
    description: "Advertisement campaign completed for **{eventName}** event",
    color: "success", // Uses config.embedColors.success
    fields: {
      voiceChannels: {
        name: "`🔊` Voice Channels",
        value:
          "`✅` Success: {voiceSuccess}\n`❌` Failed: {voiceFailed}\n`⏭️` Skipped: {voiceSkipped}\n`🔄` Total Rotations: {totalRotations}",
        inline: true,
      },
      textChannels: {
        name: "`💬` Text Channels",
        value: "`✅` Messages Sent: {textSuccess}\n`❌` Failed: {textFailed}",
        inline: true,
      },
      failureDetails: {
        name: "`⚠️` Failure Details",
        value: "{failureDetails}",
        inline: false,
      },
    },
    footer: {
      text: "Requested by {username}",
      useUserAvatar: true,
    },
    timestamp: true,
  },

  // Auto advertising start message template
  autoStartMessage: {
    title: "Auto Advertising Started",
    description:
      "Advertising will start in the following channels with **{rotations}** rotation(s):",
    color: "info",
  },

  // Manual confirmation message template
  manualConfirmMessage: {
    title: "Eligible Channels",
    description:
      "The following channels are eligible for advertising with **{rotations}** rotation(s):",
    color: "info",
  },

  // Confirmation and cancellation messages
  confirmationMessages: {
    confirmed: {
      description: "`✅` **Advertising confirmed. Starting now!**",
      color: "success",
    },
    cancelled: {
      description: "`❌` **Advertising process has been canceled.**",
      color: "error",
    },
  },
};
