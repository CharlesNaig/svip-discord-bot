const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../config/config.js");
const logger = require("./logger");

// Function to load all command data
function loadCommands() {
  const commands = [];
  const commandFolders = fs.readdirSync(path.join(__dirname, "../commands"));

  for (const folder of commandFolders) {
    const folderPath = path.join(__dirname, `../commands/${folder}`);
    
    // Skip if not a directory
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    const commandFiles = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      try {
        const command = require(path.join(folderPath, file));
        if (command.data && command.execute) {
          commands.push(command.data.toJSON());
          logger.info(`Loaded command: ${command.data.name}`);
        } else {
          logger.warn(`Command at ${file} is missing required "data" or "execute" property.`);
        }
      } catch (error) {
        logger.error(`Error loading command ${file}: ${error.message}`);
      }
    }
  }
  
  logger.info(`Total commands loaded: ${commands.length}`);
  return commands;
}

// Enhanced deployment function
async function deployCommands(isGuild = false) {
  const rest = new REST({ version: "10" }).setToken(config.token);
  const commands = loadCommands();

  try {
    if (isGuild && config.guildId) {
      logger.debug(`Started refreshing ${commands.length} guild application commands.`);
      
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
        body: commands,
      });
      
      logger.success(`Successfully reloaded ${commands.length} guild application commands.`);
    } else {
      logger.debug(`Started refreshing ${commands.length} global application commands.`);
      
      await rest.put(Routes.applicationCommands(config.clientId), {
        body: commands,
      });
      
      logger.success(`Successfully reloaded ${commands.length} global application commands.`);
      logger.info("Note: Global commands can take up to 1 hour to update.");
    }
  } catch (error) {
    logger.error(`Error while refreshing application commands: ${error}`);
    throw error;
  }
}

// Export for use in other files
module.exports = { loadCommands, deployCommands };

// Run deployment if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const isGuild = args.includes('--guild');
  
  deployCommands(isGuild).catch(error => {
    logger.error("Deployment failed:", error);
    process.exit(1);
  });
}
