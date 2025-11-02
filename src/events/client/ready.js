const { ActivityType } = require("discord.js");
const logger = require("../../utils/logger.js");
const Status = require("../../schema/status.js");
const config = require("../../config/config.js");

// Import SVIP initialization
const { initializeSvipCron } = require("../../utils/cronJobs.js");
const { updateRoleListEmbed } = require("../../utils/roleListManager.js");
const permanentSvipMenu = require("../../utils/permanentMenu.js");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    logger.success(`Logged in as ${client.user.tag}!`);

    // Initialize SVIP system (only if enabled)
    if (config.svip.enabled) {
      await this.initializeSvipSystem(client);
    } else {
      logger.warn("SVIP system is disabled in config");
    }

    // Initialize status rotation from database
    await this.initializeStatusRotation(client);

    require("../../utils/server.js");
    require("../../utils/deploy-commands.js");
  },

  async initializeSvipSystem(client) {
    try {
      logger.info("Initializing SVIP system...");
      
      // Initialize cron jobs
      await initializeSvipCron(client);
      
      // Initial role list update
      await updateRoleListEmbed(client);
      
      // Initialize permanent SVIP menu
      await permanentSvipMenu.initialize(client);
      
      // Set up periodic role list updates (every 30 seconds)
      setInterval(async () => {
        try {
          await updateRoleListEmbed(client);
        } catch (error) {
          logger.error("Error in periodic role list update:", error);
        }
      }, 30 * 1000);
      
      logger.success("SVIP system initialized successfully!");
      
    } catch (error) {
      logger.error("Error initializing SVIP system:", error);
    }
  },

  async initializeStatusRotation(client) {
    try {
      // Clear any existing interval
      if (global.statusInterval) {
        clearInterval(global.statusInterval);
      }

      // Get enabled statuses from database
      const statuses = await Status.find({ enabled: true }).sort({ createdAt: 1 });

      let presences = [];

      if (statuses.length === 0) {
        logger.warn("No enabled status messages found in database, using default statuses");
        presences = [
          {
            status: "online",
            activities: [
              {
                name: "I'm Your Tambayan 24/7 Mascot",
                type: ActivityType.Custom,
              },
            ],
          },
          {
            status: "online",
            activities: [
              {
                name: "discord.gg/tambayan247",
                type: ActivityType.Custom,
              },
            ],
          },
        ];
      } else {
        // Convert database statuses to Discord format
        presences = statuses.map(status => {
          const activityType = this.getActivityType(status.type);
          
          const presence = {
            status: status.status,
            activities: [{
              name: status.name,
              type: activityType
            }]
          };

          // Add URL for streaming
          if (status.type === 'Streaming' && status.url) {
            presence.activities[0].url = status.url;
          }

          return presence;
        });
      }

      // Start rotation
      let index = 0;
      
      // Set initial status
      if (presences.length > 0) {
        client.user.setPresence(presences[0]);
      }

      // Set up interval for rotation (15 seconds)
      global.statusInterval = setInterval(() => {
        if (presences.length > 0) {
          client.user.setPresence(presences[index]);
          index = (index + 1) % presences.length;
        }
      }, 15000);

      logger.info(`Status rotation initialized with ${presences.length} statuses`);
    } catch (error) {
      logger.error(`Error initializing status rotation: ${error.message}`);
      
      // Fallback to a simple default status
      client.user.setPresence({
        status: "online",
        activities: [{
          name: "Tambayan 24/7",
          type: ActivityType.Custom
        }]
      });
    }
  },

  getActivityType(typeString) {
    const activityTypes = {
      'Playing': ActivityType.Playing,
      'Streaming': ActivityType.Streaming,
      'Listening': ActivityType.Listening,
      'Watching': ActivityType.Watching,
      'Custom': ActivityType.Custom,
      'Competing': ActivityType.Competing
    };

    return activityTypes[typeString] || ActivityType.Playing;
  }
};
