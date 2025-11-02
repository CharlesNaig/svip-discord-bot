# Ambi-Chan Discord Bot

Tambayan Character Bot with advanced voice channel features including random member selection with Text-to-Speech announcements.

## 🎯 Features

### Core Features
- **Random Member Selection**: Choose random users from voice/stage channels
- **Text-to-Speech**: Announce chosen members using Google TTS
- **Smart Name Processing**: Clean emoji-filled display names for clear pronunciation
- **Voice Channel Management**: Handle both regular voice and stage channels
- **Permission Validation**: Check bot permissions before attempting voice operations
- **Cooldown System**: Prevent command spam with per-channel cooldowns

### Command Features
- `/choose` - Main command with language options
- Multi-language TTS support (English, Spanish, French, German, etc.)
- Exclude bots option
- Fallback to text mention if audio fails

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16.9.0 or higher
- Discord Bot Token
- MongoDB connection (for existing features)

### Dependencies
```bash
npm install discord.js@14.16.3 @discordjs/voice google-tts-api emoji-regex ffmpeg-static prism-media mongoose dotenv
```

### Environment Variables
Create a `.env` file with:
```env
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_guild_id_for_testing
PREFIX=!
MONGO_URI=your_mongodb_connection_string
DEVELOPER_ID=your_discord_user_id
BANNER_URL=your_bot_banner_url
PORT=2445
```

### Discord Bot Setup
1. Create a Discord application at https://discord.com/developers/applications
2. Create a bot and copy the token
3. Enable the following bot permissions:
   - `Connect` - Join voice channels
   - `Speak` - Use voice activity in voice channels
   - `Use Slash Commands` - Use application commands
4. Add bot to your server with the above permissions

### Installation Steps
1. Clone this repository
2. Run `npm install`
3. Configure your `.env` file
4. Deploy commands: `npm run deploy` or `node utils/deploy-commands.js`
5. Start the bot: `npm start`

## 📁 Project Structure

```
ambi-chan/
├── commands/
│   ├── info/
│   │   └── choose.js          # Random member selection command
│   ├── admins/                # Admin-only commands
│   └── dev/                   # Developer commands
├── utils/
│   ├── cleanName.js           # Name processing utilities
│   ├── tts.js                 # Text-to-Speech service
│   ├── voiceManager.js        # Voice connection management
│   ├── commandHandler.js      # Command utilities & embeds
│   └── deploy-commands.js     # Slash command deployment
├── events/
│   ├── client/                # Client events
│   └── user/                  # User events
├── config/
│   └── config.js              # Configuration management
├── schema/                    # MongoDB schemas
├── .env                       # Environment variables
├── index.js                   # Main bot entry point
└── package.json
```

## 🎮 Usage

### Basic Usage
1. Join a voice channel
2. Use `/choose` to select a random member
3. Bot will announce the chosen member via TTS and ping them

### Command Options
- **language**: Choose TTS language (en, es, fr, de, it, pt, ja, ko, zh)
- **exclude-bots**: Whether to exclude bots from selection (default: true)

### Example Commands
```
/choose
/choose language:es
/choose language:fr exclude-bots:false
```

## 🔧 Technical Details

### Voice Channel Handling
- Supports both regular voice channels and stage channels
- Checks for speaker permissions in stage channels
- Validates bot permissions before attempting connections
- Graceful cleanup of voice connections

### Name Processing
- Strips Discord custom emojis (`<:emoji:123>`)
- Removes Unicode emojis using emoji-regex
- Handles pipe-separated format (`🎮 | Real Name`)
- Fallback to username if display name is unusable
- Limits name length for TTS clarity

### Error Handling
- Comprehensive error catching and logging
- Graceful fallbacks when TTS fails
- User-friendly error messages
- Automatic cleanup of resources

### Performance Features
- Connection pooling for voice channels
- Timeout management for TTS operations
- Memory-efficient audio streaming
- Cooldown system to prevent abuse

## 🛠️ Development

### Adding New Commands
1. Create a new file in the appropriate `commands/` subfolder
2. Follow the command structure with `data` and `execute` exports
3. Use the utilities in `utils/` for common operations
4. Redeploy commands using `node utils/deploy-commands.js`

### Testing
- Use `--guild` flag for faster guild-only command deployment during development
- Monitor logs for errors and performance issues
- Test with various display name formats

### Deployment Commands
```bash
# Deploy to guild (faster for testing)
node utils/deploy-commands.js --guild

# Deploy globally (production)
node utils/deploy-commands.js

# Clear commands if needed
node utils/deploy-commands.js --clear --guild
```

## 📊 Monitoring & Logs

The bot includes comprehensive logging:
- Command execution tracking
- Voice connection status
- TTS generation success/failure
- Error reporting with stack traces

## 🔒 Security Features

- Environment variable validation
- Permission checking before operations
- Cooldown systems to prevent abuse
- Graceful error handling without exposing internals

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

**Bot not responding to commands:**
- Check if commands are deployed (`node utils/deploy-commands.js`)
- Verify bot has `Use Application Commands` permission

**Voice connection issues:**
- Ensure bot has `Connect` and `Speak` permissions
- Check if bot is suppressed in stage channels

**TTS not working:**
- Verify internet connection for Google TTS API
- Check voice channel permissions
- Monitor logs for TTS-specific errors

**MongoDB connection issues:**
- Verify MONGO_URI in `.env` file
- Check MongoDB server status
- Ensure IP is whitelisted if using MongoDB Atlas

### Support

For issues or questions, please open an issue on the GitHub repository or contact the development team.

---

**Made with ❤️ for the Tambayan community**
