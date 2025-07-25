// src/controllers/AbiController.js
import { promises as fs } from 'fs';

/**
 * ABI Controller - Handles HTTP requests for ABI management
 */
export class AbiController {
  constructor(abiRegistry, abiManager, wsManager) {
    this.abiRegistry = abiRegistry;
    this.abiManager = abiManager;
    this.wsManager = wsManager;
  }

  /**
   * Get all loaded ABIs
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async getAllAbis(req, res) {
    try {
      const abis = this.abiRegistry.getLoadedAbis();
      res.json({ success: true, abis });
    } catch (error) {
      console.error('Error getting ABIs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Upload and load a new ABI
   * @param {Request} req - Express request with file upload
   * @param {Response} res - Express response
   */
  async uploadAbi(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: 'No file uploaded' 
        });
      }

      // Validate file content
      const abiContent = await fs.readFile(req.file.path, 'utf8');
      if (!this.abiManager.validateAbi(abiContent)) {
        // Clean up invalid file
        await fs.unlink(req.file.path);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid ABI format' 
        });
      }

      const result = await this.abiManager.loadSingleAbi(req.file.filename);
      
      if (result.success) {
        const displayAddress = result.address.startsWith('0x') ? 
          result.address : `0x${result.address}`;
        
        // Broadcast ABI update to WebSocket clients
        this.wsManager.broadcastAbiUpdate(displayAddress, 'updated');
        
        res.json({ 
          success: true, 
          message: `ABI loaded successfully for address ${displayAddress}`,
          address: displayAddress
        });
      } else {
        // Clean up failed upload
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up failed upload:', unlinkError);
        }
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Delete an ABI
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async deleteAbi(req, res) {
    try {
      const address = req.params.address.toLowerCase().replace('0x', '');
      const displayAddress = `0x${address}`;
      
      // Remove from registry
      this.abiRegistry.delete(address);
      
      // Delete file
      await this.abiManager.deleteAbi(address);
      
      // Broadcast ABI removal to WebSocket clients
      this.wsManager.broadcastAbiUpdate(displayAddress, 'removed');
      
      res.json({ 
        success: true, 
        message: `ABI removed for address ${displayAddress}` 
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get ABI for specific address
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async getAbi(req, res) {
    try {
      const address = req.params.address.toLowerCase().replace('0x', '');
      
      if (!this.abiRegistry.has(address)) {
        return res.status(404).json({ 
          success: false, 
          error: 'ABI not found for this address' 
        });
      }

      const abiContent = await this.abiManager.getAbiContent(address);
      res.json({ 
        success: true, 
        address: `0x${address}`,
        abi: JSON.parse(abiContent)
      });
    } catch (error) {
      console.error('Error getting ABI:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Add ABI via JSON body
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async addAbi(req, res) {
    try {
      const { address, abi } = req.body;
      
      if (!address || !abi) {
        return res.status(400).json({ 
          success: false, 
          error: 'Address and ABI are required' 
        });
      }

      const normalizedAddress = address.toLowerCase().replace('0x', '');
      const abiContent = JSON.stringify(abi, null, 2);
      
      // Validate ABI
      if (!this.abiManager.validateAbi(abiContent)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid ABI format' 
        });
      }

      // Save ABI file
      await this.abiManager.saveAbi(normalizedAddress, abiContent);
      
      // Load into registry
      const abiInterface = this.abiRegistry.parseAbi(abiContent);
      this.abiRegistry.set(normalizedAddress, abiInterface);
      
      const displayAddress = `0x${normalizedAddress}`;
      
      // Broadcast update
      this.wsManager.broadcastAbiUpdate(displayAddress, 'updated');
      
      res.json({ 
        success: true, 
        message: `ABI added successfully for address ${displayAddress}`,
        address: displayAddress
      });
    } catch (error) {
      console.error('Add ABI error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default AbiController;
