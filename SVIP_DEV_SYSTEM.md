# SVIP Development System Documentation

This development system provides a comprehensive testing environment for the SVIP (Server VIP) boost system without affecting real Discord boost data.

## 📋 Overview

The development system consists of:
- **Development Mode Toggle**: Switch between real and fake boost data
- **Boost Store Management**: Add/remove fake boosts for testing
- **SVIP Testing Tools**: Quick test SVIP access for users
- **Comprehensive Statistics**: Track fake boost data and system status

## 🚀 Commands

### `/devmode` - Development Mode Management
Toggle development mode on/off for the boost system.

**Subcommands:**
- `toggle` - Switch development mode on/off
- `status` - Check current development mode status  
- `enable` - Enable development mode
- `disable` - Disable development mode

**Usage:**
```
/devmode toggle
/devmode status
/devmode enable
/devmode disable
```

### `/booststore` - Fake Boost Store Management
Manage fake boost data for testing purposes.

**Subcommands:**
- `add <user>` - Add a fake boost for a user
- `remove <user>` - Remove a fake boost from a user
- `list` - List all fake boosts
- `reset` - Reset the entire boost store (with confirmation)
- `stats` - Show boost store statistics
- `check <user>` - Check if a user meets boost requirements

**Usage:**
```
/booststore add @username
/booststore remove @username
/booststore list
/booststore reset
/booststore stats
/booststore check @username
```

### `/sviptest` - SVIP Access Testing
Test SVIP system access for users with detailed information.

**Options:**
- `user` (optional) - User to test (defaults to command executor)

**Usage:**
```
/sviptest
/sviptest user:@username
```

## 🔧 How It Works

### Development Mode States

#### 🟢 Development Mode ENABLED
- Uses fake boost data from local JSON file
- SVIP system checks against fake boost store
- Perfect for testing without real boosts
- All boost requirements use fake data

#### 🔴 Development Mode DISABLED  
- Uses real Discord boost system
- Normal SVIP validation
- Production behavior
- Actual boost requirements apply

### Data Storage

Fake boost data is stored in `/src/data/devBoostStore.json`:
```json
{
  "devMode": false,
  "boosts": [
    {
      "userId": "123456789",
      "username": "TestUser",
      "boostCount": 1,
      "isBoosting": true,
      "boostSince": "2024-01-01T00:00:00.000Z"
    }
  ],
  "serverBoostCount": 1,
  "serverBoostTier": 0
}
```

## 🎯 Testing Scenarios

### Basic Testing Flow

1. **Enable Development Mode**
   ```
   /devmode enable
   ```

2. **Add Fake Boosts**
   ```
   /booststore add @testuser1
   /booststore add @testuser2
   ```

3. **Test SVIP Access**
   ```
   /sviptest user:@testuser1
   ```

4. **Test SVIP Features**
   - Try creating custom roles
   - Test member management
   - Verify permissions

5. **View Statistics**
   ```
   /booststore stats
   ```

### Advanced Testing

**Server Boost Requirement Testing:**
- Set different boost counts to test tier requirements
- Test with boosts below/above the required threshold
- Verify server boost tier calculations

**User Permission Testing:**
- Test users with/without fake boosts
- Verify SVIP feature access
- Test member addition/removal in custom roles

**Error Handling Testing:**
- Test with expired interactions
- Test system behavior when dev mode is toggled mid-operation
- Test reset functionality

## 🛡️ Security & Permissions

### Developer Access
Only users with developer permissions can use these commands:
- Users in `config.naig` array
- User matching `config.developerId`

### Data Isolation
- Fake boost data is completely separate from real Discord data
- Toggling dev mode doesn't affect real boost status
- Reset functionality only affects fake data

### Safety Features
- Confirmation dialogs for destructive operations
- Clear indication of current mode in all responses
- Automatic validation of user permissions

## 📊 System Integration

### SVIP System Integration
The development system integrates with the existing SVIP system through:

```javascript
// In svipUtils.js - meetsBoostRequirements function
if (devBoostManager.isDevMode()) {
  // Use development boost manager
  return await devBoostManager.meetsBoostRequirements(guild, userId);
}
// Otherwise use real Discord boost system
```

### Automatic Mode Detection
All SVIP features automatically detect development mode and adjust behavior accordingly.

## 🔄 State Management

### Mode Persistence
Development mode state persists between bot restarts via JSON file storage.

### Data Integrity
- Automatic boost count calculations
- Server tier updates based on boost count
- Consistent data validation

### Clean Transitions
- Safe switching between dev and production modes
- No data corruption when toggling modes
- Proper error handling for invalid states

## 📝 Troubleshooting

### Common Issues

**"Development mode not affecting SVIP system"**
- Verify development mode is enabled: `/devmode status`
- Check that fake boosts are added: `/booststore list`
- Ensure server meets fake boost requirements

**"Commands not responding"**
- Verify you have developer permissions
- Check bot console for error messages
- Ensure all files are properly deployed

**"Boost store data lost"**
- Check if `/src/data/` directory exists
- Verify file permissions for JSON file
- Check logs for file system errors

### Debug Commands
```
/devmode status     # Check current mode
/booststore stats   # View all statistics
/sviptest           # Test your own access
```

## 🚀 Best Practices

### Testing Workflow
1. Always start with `/devmode status` to check current state
2. Plan your test scenarios before adding fake boosts
3. Use `/booststore stats` to monitor system state
4. Clean up with `/booststore reset` when done testing

### Development Tips
- Keep fake boost counts realistic for testing
- Test both success and failure scenarios
- Verify mode transitions work smoothly
- Document any issues found during testing

### Production Deployment
- Always disable development mode before production: `/devmode disable`
- Verify real boost system is working: `/sviptest`
- Monitor logs for any development mode remnants

## 🔮 Future Enhancements

Potential improvements to the development system:
- Timed boost expiration simulation
- Boost tier change event simulation
- Integration with other bot systems
- Advanced testing scenarios
- Automated test suites

---

*This documentation covers the complete SVIP development system. For implementation details, refer to the source code in `/src/utils/devBoostManager.js` and related command files.*