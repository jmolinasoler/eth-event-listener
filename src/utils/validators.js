import { isAddress, getAddress } from 'ethers';

/**
 * Validators for Ethereum addresses and ABIs
 */

/**
 * Validate Ethereum address with checksum
 * @param {string} address - Address to validate
 * @returns {object} - { valid: boolean, address: string|null, error: string|null }
 */
export function validateEthereumAddress(address) {
    if (!address) {
        return {
            valid: false,
            address: null,
            error: 'Address is required'
        };
    }
    
    // Convert to string and trim
    const addressStr = String(address).trim();
    
    // Check if it's a valid Ethereum address
    if (!isAddress(addressStr)) {
        return {
            valid: false,
            address: null,
            error: 'Invalid Ethereum address format'
        };
    }
    
    try {
        // Get checksummed address
        const checksummedAddress = getAddress(addressStr);
        
        return {
            valid: true,
            address: checksummedAddress,
            error: null
        };
    } catch (error) {
        return {
            valid: false,
            address: null,
            error: `Failed to validate address: ${error.message}`
        };
    }
}

/**
 * Validate ABI structure
 * @param {*} abi - ABI to validate
 * @returns {object} - { valid: boolean, error: string|null }
 */
export function validateAbi(abi) {
    // Must be an array
    if (!Array.isArray(abi)) {
        return {
            valid: false,
            error: 'ABI must be an array'
        };
    }
    
    // Must not be empty
    if (abi.length === 0) {
        return {
            valid: false,
            error: 'ABI cannot be empty'
        };
    }
    
    // Check ABI size (prevent DoS attacks with huge ABIs)
    const MAX_ABI_SIZE = 1000; // Maximum number of ABI entries
    if (abi.length > MAX_ABI_SIZE) {
        return {
            valid: false,
            error: `ABI too large. Maximum ${MAX_ABI_SIZE} entries allowed, got ${abi.length}`
        };
    }
    
    // Validate each ABI entry
    for (let i = 0; i < abi.length; i++) {
        const entry = abi[i];
        
        // Each entry must be an object
        if (typeof entry !== 'object' || entry === null) {
            return {
                valid: false,
                error: `ABI entry at index ${i} must be an object`
            };
        }
        
        // Each entry must have a 'type' field
        if (!entry.type) {
            return {
                valid: false,
                error: `ABI entry at index ${i} missing 'type' field`
            };
        }
        
        // Validate type is a known ABI type
        const validTypes = [
            'function',
            'constructor',
            'receive',
            'fallback',
            'event',
            'error'
        ];
        
        if (!validTypes.includes(entry.type)) {
            return {
                valid: false,
                error: `ABI entry at index ${i} has invalid type '${entry.type}'. Valid types: ${validTypes.join(', ')}`
            };
        }
        
        // For functions and events, validate inputs/outputs structure
        if (entry.type === 'function' || entry.type === 'event') {
            if (entry.inputs && !Array.isArray(entry.inputs)) {
                return {
                    valid: false,
                    error: `ABI entry at index ${i} has invalid 'inputs' field (must be array)`
                };
            }
            
            if (entry.type === 'function' && entry.outputs && !Array.isArray(entry.outputs)) {
                return {
                    valid: false,
                    error: `ABI entry at index ${i} has invalid 'outputs' field (must be array)`
                };
            }
        }
    }
    
    return {
        valid: true,
        error: null
    };
}

/**
 * Validate JSON content
 * @param {string} content - JSON string to validate
 * @returns {object} - { valid: boolean, data: object|null, error: string|null }
 */
export function validateJson(content) {
    if (!content) {
        return {
            valid: false,
            data: null,
            error: 'Content is required'
        };
    }
    
    try {
        const data = JSON.parse(content);
        return {
            valid: true,
            data,
            error: null
        };
    } catch (error) {
        return {
            valid: false,
            data: null,
            error: `Invalid JSON: ${error.message}`
        };
    }
}

/**
 * Sanitize address by removing '0x' prefix and converting to lowercase
 * @param {string} address - Address to sanitize
 * @returns {string}
 */
export function sanitizeAddress(address) {
    if (!address) return '';
    return String(address).trim().toLowerCase().replace(/^0x/i, '');
}

/**
 * Validate file upload
 * @param {object} file - Multer file object
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {object} - { valid: boolean, error: string|null }
 */
export function validateFileUpload(file, maxSize = 1024 * 1024) {
    if (!file) {
        return {
            valid: false,
            error: 'No file provided'
        };
    }
    
    // Validate file size
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File too large. Maximum size: ${maxSize} bytes`
        };
    }
    
    // Validate file type (must be JSON)
    const allowedMimeTypes = ['application/json', 'text/json'];
    if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
        };
    }
    
    return {
        valid: true,
        error: null
    };
}
