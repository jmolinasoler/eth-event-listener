import 'dotenv/config';

// Constants
const API_KEY_MIN_LENGTH = 20; // Minimum length to consider a path segment as an API key

/**
 * Environment configuration with validation
 * Validates required environment variables at startup
 */
class Environment {
    constructor() {
        this.config = {
            // Server configuration
            PORT: this.getNumber('PORT', 3000),
            NODE_ENV: this.getString('NODE_ENV', 'development'),
            
            // Ethereum configuration
            RPC_URL: this.getString('RPC_URL', null, false), // Optional
            
            // Security configuration
            RATE_LIMIT_WINDOW_MS: this.getNumber('RATE_LIMIT_WINDOW_MS', 60000), // 1 minute
            RATE_LIMIT_MAX_REQUESTS: this.getNumber('RATE_LIMIT_MAX_REQUESTS', 100),
            
            // CORS configuration
            CORS_ORIGIN: this.getString('CORS_ORIGIN', '*'),
        };
        
        this.validate();
    }
    
    /**
     * Get string environment variable
     * @param {string} key - Environment variable name
     * @param {string} defaultValue - Default value if not set
     * @param {boolean} required - Whether the variable is required
     * @returns {string}
     */
    getString(key, defaultValue = null, required = false) {
        const value = process.env[key];
        
        if (!value && required) {
            throw new Error(`Missing required environment variable: ${key}`);
        }
        
        return value || defaultValue;
    }
    
    /**
     * Get number environment variable
     * @param {string} key - Environment variable name
     * @param {number} defaultValue - Default value if not set
     * @returns {number}
     */
    getNumber(key, defaultValue) {
        const value = process.env[key];
        
        if (!value) {
            return defaultValue;
        }
        
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
            throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
        }
        
        return parsed;
    }
    
    /**
     * Validate the configuration
     */
    validate() {
        // Validate PORT is in valid range
        if (this.config.PORT < 1 || this.config.PORT > 65535) {
            throw new Error(`PORT must be between 1 and 65535, got: ${this.config.PORT}`);
        }
        
        // Validate NODE_ENV
        const validEnvs = ['development', 'production', 'test'];
        if (!validEnvs.includes(this.config.NODE_ENV)) {
            console.warn(`Warning: NODE_ENV should be one of ${validEnvs.join(', ')}, got: ${this.config.NODE_ENV}`);
        }
        
        // Validate rate limit configuration
        if (this.config.RATE_LIMIT_WINDOW_MS < 1000) {
            throw new Error('RATE_LIMIT_WINDOW_MS must be at least 1000ms');
        }
        
        if (this.config.RATE_LIMIT_MAX_REQUESTS < 1) {
            throw new Error('RATE_LIMIT_MAX_REQUESTS must be at least 1');
        }
        
        // Validate RPC_URL format if provided
        if (this.config.RPC_URL && !this.isValidRpcUrl(this.config.RPC_URL)) {
            throw new Error(`Invalid RPC_URL format. Must start with ws://, wss://, http://, or https://`);
        }
    }
    
    /**
     * Validate RPC URL format
     * @param {string} url - RPC URL to validate
     * @returns {boolean}
     */
    isValidRpcUrl(url) {
        return /^(ws|wss|http|https):\/\/.+/.test(url);
    }
    
    /**
     * Get configuration value
     * @param {string} key - Configuration key
     * @returns {*}
     */
    get(key) {
        return this.config[key];
    }
    
    /**
     * Get all configuration (sanitized for logging)
     * @returns {object}
     */
    getSanitized() {
        const sanitized = { ...this.config };
        
        // Mask sensitive values for logging
        if (sanitized.RPC_URL) {
            sanitized.RPC_URL = this.maskSensitiveUrl(sanitized.RPC_URL);
        }
        
        return sanitized;
    }
    
    /**
     * Mask sensitive parts of URLs (API keys, tokens)
     * @param {string} url - URL to mask
     * @returns {string}
     */
    maskSensitiveUrl(url) {
        if (!url) return null;
        
        try {
            const urlObj = new URL(url);
            // Mask path segments that look like API keys (long alphanumeric strings)
            const pathParts = urlObj.pathname.split('/');
            const maskedParts = pathParts.map(part => {
                // If part is longer than API_KEY_MIN_LENGTH chars and alphanumeric, it's likely an API key
                if (part.length > API_KEY_MIN_LENGTH && /^[a-zA-Z0-9]+$/.test(part)) {
                    return '***';
                }
                return part;
            });
            
            urlObj.pathname = maskedParts.join('/');
            return urlObj.toString();
        } catch (e) {
            // If URL parsing fails, return a generic masked version
            return url.substring(0, 10) + '***';
        }
    }
    
    /**
     * Check if running in production
     * @returns {boolean}
     */
    isProduction() {
        return this.config.NODE_ENV === 'production';
    }
    
    /**
     * Check if running in development
     * @returns {boolean}
     */
    isDevelopment() {
        return this.config.NODE_ENV === 'development';
    }
}

// Export singleton instance
export const env = new Environment();
