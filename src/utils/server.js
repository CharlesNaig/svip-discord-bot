//Express Server
const client = require("../index.js");
const config = require("../config/config.js");
const express = require("express");
const compression = require('compression');
const path = require("path");
const app = express();
const logger = require("../utils/logger");

const port = config.port;
const guildids = config.guildId;

//users comp
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use("/", express.static(path.join(__dirname, "../../website")));

// Function to get server stats
async function getServerStats(guildId) {
  try {
    const guild = await client.guilds.fetch(guildId);
    const memberCount = guild.memberCount;
    const activeMembers = (await guild.members.fetch()).filter(
      (member) => member.presence?.status !== "offline"
    ).size;
    const totalChannels = guild.channels.cache.size;
    const totalBoost = guild.premiumSubscriptionCount;

    return {
      memberCount,
      activeMembers,
      totalChannels,
      totalBoost,
    };
  } catch (error) {
    logger.error("Error fetching server stats:", error);
    throw error;
  }
}

// Express route to serve the stats
app.get("/api/stats", async (_, res) => {
  try {
    const stats = await getServerStats(config.guildId); // Replace with your guild/server ID
    res.json(stats);
  } catch (error) {
    logger.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.get("/api/status/:userId", async (req, res) => {
  const userId = req.params.userId;
  const guildId = guildids;

  // logger.info(`Fetching presence for user: ${userId}`);

  try {
    // Fetch the guild by its ID
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      //logger.warn(`Guild with ID ${guildId} not found.`);
      return res.status(404).json({ error: "Guild not found" });
    }

    // Fetch the member from the guild
    const member = await guild.members.fetch(userId);

    if (!member.presence) {
      //logger.info(`No presence found for user: ${userId} : Assumed as offline`);
      return res.json({ status: "offline" }); // If no presence, consider them offline
    }

    //logger.info(`Presence for user ${userId}: ${member.presence.status}`);
    const status = member.presence ? member.presence.status : "offline"; // Get member's status
    res.json({ status }); // Send the status back
  } catch (error) {
    //logger.error("Error fetching user status:", error);
    res.status(500).json({ error: "Failed to fetch user status" });
  }
});

//Discord Server guild icon
let guildIconURL = "";
app.get("/api/guild-icon", async (req, res) => {
  const axios = require("axios");
  const guild = await client.guilds.cache.get(guildids);
  if (guild) {
    guildIconURL = guild.iconURL({ extension: "gif", size: 4096 });
    logger.info("Guild Icon URL fetched.");
    try {
      const response = await axios.get(guildIconURL, {
        responseType: "arraybuffer",
      });
      res.set("Content-Type", "image/gif");
      res.send(response.data);
    } catch (error) {
      logger.error("Error fetching guild icon image:", error);
      res.status(500).send("Error fetching guild icon image.");
    }
  }
});

// API endpoint to check the bot's status
app.get("/status", (req, res) => {
  if (client && client.user) {
    res.json({ status: "online", botName: client.user.username });
  } else {
    res.json({ status: "offline" });
  }
});

// Start the server
app.listen(port, () => {
  logger.main(`Server is running at http://localhost:${port} with Ambi Chan`);
});
