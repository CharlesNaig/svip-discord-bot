module.exports = {
    // Default to bodyguard disabled
    enabled: false,
    
    // Methods to control bodyguard state
    enable() {
        this.enabled = true;
        return this.enabled;
    },
    
    disable() {
        this.enabled = false;
        return this.enabled;
    },
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    },
    
    status() {
        return this.enabled;
    }
};
