# SVIP System Toggle Documentation

## Overview
The SVIP (Server VIP) system now has a master toggle switch that allows you to enable or disable the entire system from the configuration file.

## Configuration

### Location
`src/config/config.js`

### Toggle Setting
```javascript
svip: {
  enabled: false, // Toggle SVIP system: true = enabled, false = disabled
  svipRoleId: "1273915223568289812",
  boostChannelId: "1092689297645244468",
  // ... other settings
}
```

### How It Works

**When `enabled: false` (DISABLED)**
- ❌ SVIP system initialization is skipped on bot startup
- ❌ All SVIP commands return an error message
- ❌ SVIP event handlers (boost tracking, role management) do not execute
- ❌ SVIP cron jobs and periodic updates are not started
- ❌ All SVIP interactions (buttons, modals, menus) are blocked

**When `enabled: true` (ENABLED)**
- ✅ Full SVIP system functionality is active
- ✅ All commands, events, and features work normally
- ✅ Boost tracking and role management operates
- ✅ Cron jobs run for grace periods and expiration checks

## Files Modified

### Core Configuration
- `src/config/config.js` - Added `enabled: false` toggle

### Event Handlers
- `src/events/client/ready.js` - Checks toggle before initializing SVIP system
- `src/events/svip/readyHandler.js` - Checks toggle before SVIP initialization
- `src/events/user/guildMemberUpdate.js` - Checks toggle before handling boost changes
- `src/events/svip/interactionHandler.js` - Checks toggle and blocks all SVIP interactions

### Admin Commands
- `src/commands/admins/svip-menu.js` - Checks toggle before displaying menu
- `src/commands/admins/svip-setup.js` - Checks toggle before setup operations

### Developer Commands
- `src/commands/dev/sviptest.js` - Checks toggle before testing
- `src/commands/dev/devmode.js` - Checks toggle before dev mode operations
- `src/commands/dev/booststore.js` - Checks toggle before boost store management
- `src/commands/dev/boostcheck.js` - Checks toggle before boost checking

## Usage

### To Enable SVIP System
1. Open `src/config/config.js`
2. Set `enabled: true` in the svip object
3. Restart the bot

### To Disable SVIP System
1. Open `src/config/config.js`
2. Set `enabled: false` in the svip object
3. Restart the bot

## User Experience When Disabled

When users try to interact with SVIP features while the system is disabled:

**Commands:**
```
❌ The SVIP system is currently disabled.
```

**Buttons/Interactions:**
```
❌ The SVIP system is currently disabled.
```

**Console Output:**
```
⚠️ SVIP system is disabled in config
```

## Benefits

1. **Easy Maintenance**: Quickly disable SVIP for maintenance without code changes
2. **Testing**: Disable in development environments if needed
3. **Controlled Rollout**: Enable/disable based on server needs
4. **Resource Management**: Save resources when SVIP is not needed
5. **Clean Shutdown**: Prevents partial SVIP functionality

## Default State

The SVIP system is **disabled by default** (`enabled: false`). You must explicitly enable it to use SVIP features.

## Notes

- The toggle check happens early in execution to prevent any SVIP operations when disabled
- All SVIP database schemas remain intact when disabled
- No data is lost when toggling on/off
- The toggle requires a bot restart to take effect
- Development mode (`/devmode`) also respects this toggle
