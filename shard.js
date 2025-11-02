const { ShardingManager } = require("discord.js");
const config = require("./src/config/config.js");
const logger = require("./src/utils/logger");

const manager = new ShardingManager("./src/index.js", {
    token: config.token,
    totalShards: "auto",
    respawn: true, // Automatically respawn shards
});

console.clear();

manager.on("shardCreate", (shard) => {
    logger.success(`[SHARD] Launched shard ${shard.id}`);

    shard.on("error", (error) => {
        logger.error(`[SHARD] Shard ${shard.id} encountered an error: ${error.message}`);
    });

    shard.on("death", (process) => {
        logger.warn(`[SHARD] Shard ${shard.id} died unexpectedly with exit code ${process.exitCode}. Respawning...`);
    });
});

manager.on("shardDisconnect", (closeEvent, shardId) => {
    logger.warn(`[SHARD] Shard ${shardId} disconnected. Attempting to reconnect...`);
});

manager.on("shardReconnecting", (shardId) => {
    logger.info(`[SHARD] Shard ${shardId} reconnecting...`);
});

manager.on("shardResume", (shardId, replayedEvents) => {
    logger.success(`[SHARD] Shard ${shardId} resumed. Replayed ${replayedEvents} events.`);
});

manager.on("error", (error) => {
    logger.critical(`[SHARD MANAGER] An error occurred: ${error.message}`);
});

// Auto-restart any dead shards every minute
setInterval(() => {
    manager.shards.forEach((shard) => {
        if (!shard.process || shard.process.killed) {
            logger.info(`[SHARD MANAGER] Detected dead shard ${shard.id}. Respawning...`);
            shard.spawn().catch(err => {
                logger.error(`[SHARD MANAGER] Failed to respawn shard ${shard.id}: ${err.message}`);
            });
        }
    });
}, 60000);

manager.spawn();
