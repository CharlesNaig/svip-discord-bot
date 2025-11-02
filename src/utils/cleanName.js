const emojiRegex = require('emoji-regex');

/**
 * Utility class for cleaning and processing Discord user names
 * Handles emoji stripping, pipe-separated formats, and text normalization
 */
class NameProcessor {
  constructor() {
    this.unicodeEmojiRegex = emojiRegex();
    this.maxNameLength = 50;
  }

  /**
   * Remove Discord custom emojis from text
   * @param {string} text - Text to clean
   * @returns {string} Text without Discord emojis
   */
  stripDiscordEmojis(text) {
    if (!text) return '';
    return text.replace(/<a?:\w+:\d+>/g, '');
  }

  /**
   * Remove Unicode emojis from text
   * @param {string} text - Text to clean
   * @returns {string} Text without Unicode emojis
   */
  stripUnicodeEmojis(text) {
    if (!text) return '';
    return text.replace(this.unicodeEmojiRegex, '');
  }

  /**
   * Remove operators and special symbols from text
   * @param {string} text - Text to clean
   * @returns {string} Text without operators and symbols
   */
  stripOperatorsAndSymbols(text) {
    if (!text) return '';
    return text
      .replace(/[+\-*\/=<>!@#$%^&(){}[\]|\\~`]/g, ' ') // Mathematical and logic operators
      .replace(/[.,;:?]/g, ' ') // Punctuation (except apostrophes and hyphens)
      .replace(/[_]/g, ' ') // Underscores
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Extract only alphanumeric characters and basic punctuation
   * Removes operators, symbols, and special characters
   * @param {string} text - Text to clean
   * @returns {string} Cleaned alphanumeric text
   */
  cleanToAlphanumeric(text) {
    if (!text) return 'someone';
    
    // Remove operators and symbols first
    let cleaned = this.stripOperatorsAndSymbols(text);
    
    // Extract only letters, numbers, apostrophes, and hyphens
    const matches = Array.from(cleaned.matchAll(/[\p{L}\p{N}''-]+/gu));
    return matches.length > 0 
      ? matches.map(match => match[0]).join(' ').trim()
      : 'someone';
  }

  /**
   * Extract readable name from Discord display name
   * Handles pipe-separated format (emojis | real name)
   * @param {string} displayName - User's display name
   * @param {string} fallbackUsername - Fallback username
   * @returns {string} Clean, readable name
   */
  extractReadableName(displayName, fallbackUsername) {
    displayName = displayName || '';
    fallbackUsername = fallbackUsername || '';

    // Handle pipe-separated format (emojis | real name)
    if (displayName.includes('|')) {
      const afterPipe = displayName.split('|').slice(1).join('|').trim();
      if (afterPipe) {
        return this.cleanToAlphanumeric(afterPipe).slice(0, this.maxNameLength);
      }
    }

    // Clean display name step by step
    let cleaned = this.stripDiscordEmojis(displayName);
    cleaned = this.stripUnicodeEmojis(cleaned);
    cleaned = this.stripOperatorsAndSymbols(cleaned);
    
    // Remove any remaining special characters at edges and normalize spaces
    cleaned = cleaned
      .replace(/^[^\p{L}\p{N}\s]*/u, '') // Remove special characters at start
      .replace(/[^\p{L}\p{N}\s]*$/u, '') // Remove special characters at end
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();

    // Use cleaned name or fallback
    const result = cleaned || this.cleanToAlphanumeric(fallbackUsername || displayName);
    return result.slice(0, this.maxNameLength) || 'someone';
  }
}

module.exports = { NameProcessor };
