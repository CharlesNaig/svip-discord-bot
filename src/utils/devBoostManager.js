const fs = require('fs');
const path = require('path');
const logger = require('./logger.js');
const config = require('../config/config.js');

const BOOST_STORE_PATH = path.join(__dirname, '../data/devBoostStore.json');

class DevBoostManager {
    constructor() {
        this.data = this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(BOOST_STORE_PATH)) {
                const rawData = fs.readFileSync(BOOST_STORE_PATH, 'utf8');
                return JSON.parse(rawData);
            }
        } catch (error) {
            logger.error('Error loading dev boost data:', error);
        }

        // Return default data if file doesn't exist or is corrupted
        return {
            devMode: false,
            boosts: [],
            serverBoostCount: 0,
            serverBoostTier: 0
        };
    }

    saveData() {
        try {
            fs.writeFileSync(BOOST_STORE_PATH, JSON.stringify(this.data, null, 2));
            return true;
        } catch (error) {
            logger.error('Error saving dev boost data:', error);
            return false;
        }
    }

    isDevMode() {
        return this.data.devMode;
    }

    toggleDevMode() {
        this.data.devMode = !this.data.devMode;
        this.saveData();
        return this.data.devMode;
    }

    setDevMode(enabled) {
        this.data.devMode = enabled;
        this.saveData();
        return this.data.devMode;
    }

    addBoost(userId, username) {
        const existingBoost = this.data.boosts.find(b => b.userId === userId);
        
        if (existingBoost) {
            existingBoost.boostCount += 1;
            existingBoost.isBoosting = true;
            existingBoost.boostSince = new Date().toISOString();
        } else {
            this.data.boosts.push({
                userId,
                username,
                boostCount: 1,
                isBoosting: true,
                boostSince: new Date().toISOString()
            });
        }

        this.updateServerBoostCount();
        this.saveData();
        return true;
    }

    removeBoost(userId) {
        const boostIndex = this.data.boosts.findIndex(b => b.userId === userId);
        
        if (boostIndex !== -1) {
            this.data.boosts[boostIndex].isBoosting = false;
            this.updateServerBoostCount();
            this.saveData();
            return true;
        }
        
        return false;
    }

    getUserBoost(userId) {
        return this.data.boosts.find(b => b.userId === userId && b.isBoosting);
    }

    getAllBoosts() {
        return this.data.boosts.filter(b => b.isBoosting);
    }

    updateServerBoostCount() {
        this.data.serverBoostCount = this.data.boosts.filter(b => b.isBoosting).length;
        
        // Update boost tier based on count
        if (this.data.serverBoostCount >= 14) {
            this.data.serverBoostTier = 3;
        } else if (this.data.serverBoostCount >= 7) {
            this.data.serverBoostTier = 2;
        } else if (this.data.serverBoostCount >= 2) {
            this.data.serverBoostTier = 1;
        } else {
            this.data.serverBoostTier = 0;
        }
    }

    getServerBoostCount() {
        return this.data.serverBoostCount;
    }

    getServerBoostTier() {
        return this.data.serverBoostTier;
    }

    // Check if user meets boost requirements (for SVIP system)
    async meetsBoostRequirements(guild, userId) {
        // If dev mode is enabled, check the local boost store
        if (this.isDevMode()) {
            const userBoost = this.getUserBoost(userId);
            const serverBoostCount = this.getServerBoostCount();
            const requiredBoosts = parseInt(config.svip.boostrequire) || 2;
            
            return userBoost !== undefined && serverBoostCount >= requiredBoosts;
        }

        // If dev mode is disabled, use the actual Discord boost system
        try {
            const member = await guild.members.fetch(userId);
            const serverBoostCount = guild.premiumSubscriptionCount || 0;
            const requiredBoosts = parseInt(config.svip.boostrequire) || 2;
            
            return member.premiumSince !== null && serverBoostCount >= requiredBoosts;
        } catch (error) {
            logger.error('Error checking real boost requirements:', error);
            return false;
        }
    }

    resetBoostStore() {
        this.data = {
            devMode: false,
            boosts: [],
            serverBoostCount: 0,
            serverBoostTier: 0
        };
        this.saveData();
        return true;
    }

    getStats() {
        return {
            devMode: this.data.devMode,
            totalBoosts: this.data.serverBoostCount,
            boostTier: this.data.serverBoostTier,
            activeBooters: this.data.boosts.filter(b => b.isBoosting).length,
            totalBooters: this.data.boosts.length
        };
    }
}

// Create a singleton instance
const devBoostManager = new DevBoostManager();

module.exports = {
    devBoostManager,
    // Export the function for use in other modules
    meetsBoostRequirements: (guild, userId) => devBoostManager.meetsBoostRequirements(guild, userId)
};