const { createAudioResource, StreamType } = require('@discordjs/voice');
const { Readable } = require('stream');
const gtts = require('google-tts-api'); // Keep as fallback

/**
 * Service for text-to-speech operations
 * Supports both ElevenLabs (primary) and Google TTS (fallback)
 */
class TTSService {
  constructor() {
    // Direct API configuration
    this.elevenLabsApiKey = process.env.ELEVEN_API_KEY;
    
    // ElevenLabs voice IDs - you can customize these
    this.voices = {
      male: "TxGEqnHWrfWFTfGW9XjX",    // Josh (male)
      female: "EXAVITQu4vr4xnSDxMaL",  // Bella (female)
      default: "21m00Tcm4TlvDq8ikWAM", // Rachel (default)
    };
    
    // TTS Configuration
    this.config = {
      defaultLanguage: 'en',
      timeout: 15000,
      useFallback: true,
      speechRate: 0.5,
    };
  }

  getAnnouncementText(username) {
    const announcements = [
      `I'm Now calling ${username}, please give around a plus for ${username}.`,
      `${username}, you have been chosen.`,
      `${username} is up next.`,
      `Everyone, please welcome ${username}.`,
      `The random selection is ${username}.`
    ];
    
    return announcements[Math.floor(Math.random() * announcements.length)];
  }
  
  async createAudioResource(text, language = this.config.defaultLanguage, voiceType = "default") {
    try {
      // If no API key, fall back to Google TTS
      if (!this.elevenLabsApiKey) {
        console.log('No ElevenLabs API key found, using Google TTS');
        return this.createGoogleTTSResource(text, language);
      }

      // Get voice ID based on voice type
      const voiceId = this.voices[voiceType] || this.voices.default;
      
      // Direct API call
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = Readable.from(buffer);
      
      return createAudioResource(stream, { inputType: StreamType.Arbitrary });
      
    } catch (error) {
      console.warn('ElevenLabs TTS failed:', error.message);
      
      if (this.config.useFallback) {
        console.log('Falling back to Google TTS');
        return this.createGoogleTTSResource(text, language);
      }
      
      throw new Error('Failed to create TTS audio: ' + error.message);
    }
  }

  async createGoogleTTSResource(text, language) {
    try {
      const url = gtts.getAudioUrl(text, { 
        lang: language, 
        slow: false, 
        host: 'https://translate.google.com' 
      });
      
      // Use dynamic import for fetch
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`TTS API returned ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = Readable.from(buffer);
      
      return createAudioResource(stream, { inputType: StreamType.Arbitrary });
    } catch (error) {
      throw new Error('Failed to create Google TTS audio: ' + error.message);
    }
  }
}

module.exports = { TTSService };