// src/services/AbiManager.js
import { promises as fs } from 'fs';
import path from 'path';
import config from '../config/index.js';

/**
 * ABI Manager Service - Handles loading, saving, and managing ABI files
 */
export class AbiManager {
  constructor(abiRegistry) {
    this.abiRegistry = abiRegistry;
    this.abiDir = config.abiDir;
  }

  /**
   * Load all ABIs from the abis directory
   * @returns {Promise<void>}
   */
  async loadAllAbis() {
    try {
      // Ensure abis directory exists
      await fs.mkdir(this.abiDir, { recursive: true });
      
      const files = await fs.readdir(this.abiDir);
      console.log('Loading ABIs...');
      
      const loadPromises = files
        .filter(file => file.endsWith('.json'))
        .map(file => this.loadSingleAbi(file));
      
      await Promise.all(loadPromises);
      
    } catch (error) {
      console.error('Error loading ABIs:', error);
      throw error;
    }
  }

  /**
   * Load a single ABI file
   * @param {string} filename - Name of the ABI file
   * @returns {Promise<Object>} - Result object with success status
   */
  async loadSingleAbi(filename) {
    try {
      const address = filename.slice(0, -5).toLowerCase(); // remove .json
      const abiPath = path.join(this.abiDir, filename);
      const abiContent = await fs.readFile(abiPath, 'utf8');
      const abiInterface = this.abiRegistry.parseAbi(abiContent);
      
      this.abiRegistry.set(address, abiInterface);
      
      const displayAddress = address.startsWith('0x') ? address : `0x${address}`;
      console.log(`- Loaded ABI for ${displayAddress}`);
      
      return { success: true, address };
    } catch (error) {
      console.error(`Error loading ABI ${filename}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save ABI to file
   * @param {string} address - Contract address
   * @param {string} abiContent - ABI JSON content
   * @returns {Promise<string>} - Path to saved file
   */
  async saveAbi(address, abiContent) {
    const normalizedAddress = address.toLowerCase().replace('0x', '');
    const filename = `${normalizedAddress}.json`;
    const abiPath = path.join(this.abiDir, filename);
    
    await fs.writeFile(abiPath, abiContent, 'utf8');
    return abiPath;
  }

  /**
   * Delete ABI file
   * @param {string} address - Contract address
   * @returns {Promise<void>}
   */
  async deleteAbi(address) {
    const normalizedAddress = address.toLowerCase().replace('0x', '');
    const filename = `${normalizedAddress}.json`;
    const abiPath = path.join(this.abiDir, filename);
    
    try {
      await fs.unlink(abiPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Validate ABI content
   * @param {string} abiContent - ABI JSON content
   * @returns {boolean} - True if valid
   */
  validateAbi(abiContent) {
    try {
      this.abiRegistry.parseAbi(abiContent);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get ABI file path for address
   * @param {string} address - Contract address
   * @returns {string} - File path
   */
  getAbiPath(address) {
    const normalizedAddress = address.toLowerCase().replace('0x', '');
    return path.join(this.abiDir, `${normalizedAddress}.json`);
  }

  /**
   * Check if ABI file exists for address
   * @param {string} address - Contract address
   * @returns {Promise<boolean>}
   */
  async abiFileExists(address) {
    try {
      const abiPath = this.getAbiPath(address);
      await fs.access(abiPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get ABI content as string
   * @param {string} address - Contract address
   * @returns {Promise<string>} - ABI content
   */
  async getAbiContent(address) {
    const abiPath = this.getAbiPath(address);
    return await fs.readFile(abiPath, 'utf8');
  }
}

export default AbiManager;
