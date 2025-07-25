// src/models/AbiRegistry.js
import { ethers } from 'ethers';

/**
 * ABI Registry Model - Manages contract ABIs with optimized storage
 */
export class AbiRegistry {
  constructor() {
    this.registry = new Map();
    this.lastModified = new Map();
  }

  /**
   * Store an ABI interface for a contract address
   * @param {string} address - Contract address
   * @param {ethers.Interface} abiInterface - Ethers interface instance
   * @param {number} timestamp - Optional timestamp
   */
  set(address, abiInterface, timestamp = Date.now()) {
    const normalizedAddress = address.toLowerCase();
    this.registry.set(normalizedAddress, abiInterface);
    this.lastModified.set(normalizedAddress, timestamp);
  }

  /**
   * Get ABI interface for a contract address
   * @param {string} address - Contract address
   * @returns {ethers.Interface|undefined}
   */
  get(address) {
    return this.registry.get(address.toLowerCase());
  }

  /**
   * Check if ABI exists for address
   * @param {string} address - Contract address
   * @returns {boolean}
   */
  has(address) {
    return this.registry.has(address.toLowerCase());
  }

  /**
   * Remove ABI for address
   * @param {string} address - Contract address
   */
  delete(address) {
    const normalizedAddress = address.toLowerCase();
    this.registry.delete(normalizedAddress);
    this.lastModified.delete(normalizedAddress);
  }

  /**
   * Get all registered addresses
   * @returns {IterableIterator<string>}
   */
  keys() {
    return this.registry.keys();
  }

  /**
   * Get registry size
   * @returns {number}
   */
  size() {
    return this.registry.size;
  }

  /**
   * Get statistics about the registry
   * @returns {Object}
   */
  getStats() {
    return {
      count: this.registry.size,
      addresses: Array.from(this.registry.keys()),
      lastUpdated: Math.max(...Array.from(this.lastModified.values()), 0)
    };
  }

  /**
   * Parse ABI from JSON content
   * @param {string} abiContent - JSON string containing ABI
   * @returns {ethers.Interface}
   */
  parseAbi(abiContent) {
    const parsedAbi = JSON.parse(abiContent);
    return new ethers.Interface(parsedAbi);
  }

  /**
   * Get all loaded ABIs in a format suitable for API responses
   * @returns {Array}
   */
  getLoadedAbis() {
    return Array.from(this.registry.keys()).map(address => ({
      address: address.startsWith('0x') ? address : `0x${address}`,
      hasInterface: true,
      lastModified: this.lastModified.get(address)
    }));
  }
}

export default AbiRegistry;
