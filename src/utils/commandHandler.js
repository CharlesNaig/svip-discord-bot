const { EmbedBuilder, Colors } = require('discord.js');

/**
 * Command Handler utilities for Discord bot
 * Provides common embed creation and response handling
 */
class CommandHandler {
  /**
   * Create error embed
   * @param {string} message - Error message
   * @returns {EmbedBuilder} Error embed
   */
  static createErrorEmbed(message) {
    return new EmbedBuilder()
      .setColor(Colors.Red)
      .setTitle('❌ Error')
      .setDescription(message)
      .setTimestamp();
  }

  /**
   * Create success embed
   * @param {string} message - Success message
   * @param {string} userId - Optional user ID to mention
   * @returns {EmbedBuilder} Success embed
   */
  static createSuccessEmbed(message, userId = null) {
    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle('✅ Success')
      .setDescription(message)
      .setTimestamp();
    
    if (userId) {
      embed.addFields({ 
        name: 'Chosen Member', 
        value: `<@${userId}>`, 
        inline: true 
      });
    }
    
    return embed;
  }

  /**
   * Create warning embed
   * @param {string} message - Warning message
   * @param {string} userId - Optional user ID to mention
   * @returns {EmbedBuilder} Warning embed
   */
  static createWarningEmbed(message, userId = null) {
    const embed = new EmbedBuilder()
      .setColor(Colors.Orange)
      .setTitle('⚠️ Warning')
      .setDescription(message)
      .setTimestamp();
    
    if (userId) {
      embed.addFields({ 
        name: 'Chosen Member', 
        value: `<@${userId}>`, 
        inline: true 
      });
    }
    
    return embed;
  }

  /**
   * Create processing embed
   * @param {string} message - Processing message
   * @returns {EmbedBuilder} Processing embed
   */
  static createProcessingEmbed(message) {
    return new EmbedBuilder()
      .setColor(Colors.Blue)
      .setTitle('🔄 Processing')
      .setDescription(message)
      .setTimestamp();
  }

  /**
   * Create info embed
   * @param {string} title - Embed title
   * @param {string} message - Info message
   * @returns {EmbedBuilder} Info embed
   */
  static createInfoEmbed(title, message) {
    return new EmbedBuilder()
      .setColor(Colors.Blue)
      .setTitle(title)
      .setDescription(message)
      .setTimestamp();
  }

  /**
   * Handle command errors gracefully
   * @param {CommandInteraction} interaction - Discord interaction
   * @param {Error} error - Error that occurred
   * @param {string} fallbackMessage - Fallback error message
   */
  static async handleCommandError(interaction, error, fallbackMessage = 'An unexpected error occurred.') {
    console.error('Command execution failed:', error);
    
    const errorEmbed = this.createErrorEmbed(fallbackMessage);
    const errorMessage = { embeds: [errorEmbed] };

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else {
        errorMessage.ephemeral = true;
        await interaction.reply(errorMessage);
      }
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }

  /**
   * Validate if user is in a voice channel
   * @param {GuildMember} member - Guild member to check
   * @returns {Object} Validation result
   */
  static validateVoiceChannel(member) {
    const voiceChannel = member?.voice?.channel;
    
    return {
      isValid: !!voiceChannel,
      voiceChannel,
      errorMessage: voiceChannel ? null : 'You must be in a voice channel to use this command.'
    };
  }

  /**
   * Get cooldown key for rate limiting
   * @param {string} commandName - Name of the command
   * @param {string} channelId - Channel ID
   * @param {string} userId - User ID (optional)
   * @returns {string} Cooldown key
   */
  static getCooldownKey(commandName, channelId, userId = null) {
    return userId 
      ? `${commandName}:${channelId}:${userId}`
      : `${commandName}:${channelId}`;
  }

  /**
   * Check if command is on cooldown
   * @param {Map} cooldowns - Cooldown map
   * @param {string} key - Cooldown key
   * @param {number} cooldownTime - Cooldown time in milliseconds
   * @returns {Object} Cooldown check result
   */
  static checkCooldown(cooldowns, key, cooldownTime) {
    const now = Date.now();
    const lastUsed = cooldowns.get(key);
    
    if (lastUsed && (now - lastUsed) < cooldownTime) {
      const remainingTime = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
      return {
        onCooldown: true,
        remainingTime,
        message: `Command is on cooldown. Try again in ${remainingTime} seconds.`
      };
    }

    cooldowns.set(key, now);
    return { onCooldown: false };
  }
}

module.exports = { CommandHandler };
