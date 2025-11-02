const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  entersState, 
  VoiceConnectionStatus, 
  AudioPlayerStatus 
} = require('@discordjs/voice');

/**
 * Voice Connection Manager for Discord voice/stage channels
 * Handles voice connections, audio playback, and cleanup
 */
class VoiceManager {
  constructor() {
    this.connectionTimeout = 10000; // 10 seconds
    this.playbackTimeout = 15000;   // 15 seconds
  }

  /**
   * Play audio resource in a voice channel
   * @param {VoiceChannel} voiceChannel - Discord voice channel
   * @param {AudioResource} audioResource - Audio resource to play
   * @returns {Promise<void>}
   */
  async playAudioInChannel(voiceChannel, audioResource) {
    let connection = null;
    let player = null;

    try {
      // Create voice connection
      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
      });

      // Wait for connection to be ready
      await entersState(connection, VoiceConnectionStatus.Ready, this.connectionTimeout);

      // Create and setup audio player
      player = createAudioPlayer();
      connection.subscribe(player);
      player.play(audioResource);

      // Wait for playback to complete
      await this.waitForPlaybackComplete(player);

    } catch (error) {
      throw new Error(`Voice playback failed: ${error.message}`);
    } finally {
      // Cleanup resources
      this.cleanup(connection, player);
    }
  }

  /**
   * Wait for audio playback to complete
   * @param {AudioPlayer} player - Discord audio player
   * @returns {Promise<void>}
   */
  waitForPlaybackComplete(player) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Playback timeout'));
      }, this.playbackTimeout);

      const onIdle = () => {
        cleanup();
        resolve();
      };

      const onError = (error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        clearTimeout(timeout);
        player.removeListener(AudioPlayerStatus.Idle, onIdle);
        player.removeListener('error', onError);
      };

      player.once(AudioPlayerStatus.Idle, onIdle);
      player.once('error', onError);
    });
  }

  /**
   * Check if bot has required permissions in voice channel
   * @param {VoiceChannel} voiceChannel - Discord voice channel
   * @param {GuildMember} botMember - Bot's guild member
   * @returns {Object} Permission check result
   */
  checkVoicePermissions(voiceChannel, botMember) {
    const permissions = voiceChannel.permissionsFor(botMember);
    const canConnect = permissions.has('Connect');
    const canSpeak = permissions.has('Speak');
    
    return {
      canConnect,
      canSpeak,
      hasAllPermissions: canConnect && canSpeak,
      missingPermissions: [
        ...(!canConnect ? ['Connect'] : []),
        ...(!canSpeak ? ['Speak'] : [])
      ]
    };
  }

  /**
   * Check if channel is a stage channel and if bot needs speaker permissions
   * @param {VoiceChannel} voiceChannel - Discord voice channel
   * @param {GuildMember} botMember - Bot's guild member
   * @returns {Object} Stage channel check result
   */
  checkStageChannelStatus(voiceChannel, botMember) {
    const isStageChannel = voiceChannel.type === 13; // ChannelType.GuildStageVoice
    
    if (!isStageChannel) {
      return { isStageChannel: false, needsSpeakerRole: false };
    }

    // In stage channels, check if bot is suppressed (not a speaker)
    const isSuppressed = botMember.voice.suppress;
    
    return {
      isStageChannel: true,
      needsSpeakerRole: isSuppressed,
      canSpeak: !isSuppressed
    };
  }

  /**
   * Get eligible members from voice channel (excluding bots)
   * @param {VoiceChannel} voiceChannel - Discord voice channel
   * @param {Object} options - Filtering options
   * @returns {Collection} Filtered members
   */
  getEligibleMembers(voiceChannel, options = {}) {
    const { excludeBots = true, excludeRoles = [] } = options;
    
    return voiceChannel.members.filter(member => {
      // Exclude bots if specified
      if (excludeBots && member.user.bot) {
        return false;
      }

      // Exclude members with specific roles
      if (excludeRoles.length > 0) {
        const hasExcludedRole = member.roles.cache.some(role => 
          excludeRoles.includes(role.id) || excludeRoles.includes(role.name)
        );
        if (hasExcludedRole) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Cleanup voice connection and player resources
   * @param {VoiceConnection} connection - Voice connection to cleanup
   * @param {AudioPlayer} player - Audio player to cleanup
   */
  cleanup(connection, player) {
    try {
      if (player) {
        player.stop();
      }
      if (connection) {
        connection.destroy();
      }
    } catch (cleanupError) {
      console.warn('Error during voice cleanup:', cleanupError.message);
    }
  }
}

module.exports = { VoiceManager };
