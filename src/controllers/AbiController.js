import { validateEthereumAddress, validateAbi, validateJson, sanitizeAddress } from '../utils/validators.js';

export class AbiController {
    constructor(abiService) {
        this.abiService = abiService;
    }

    async getAll(req, res) {
        try {
            const abis = await this.abiService.getAbis();
            res.json({ success: true, abis });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async upload(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            // Read and validate file content
            const fs = await import('fs/promises');
            const content = await fs.readFile(req.file.path, 'utf8');
            
            // Validate JSON
            const jsonValidation = validateJson(content);
            if (!jsonValidation.valid) {
                return res.status(400).json({ 
                    success: false, 
                    error: jsonValidation.error 
                });
            }
            
            const abi = jsonValidation.data;
            
            // Validate ABI structure
            const abiValidation = validateAbi(abi);
            if (!abiValidation.valid) {
                return res.status(400).json({ 
                    success: false, 
                    error: abiValidation.error 
                });
            }

            // Extract address from filename (expected format: address.json)
            const addressFromFilename = req.file.originalname.slice(0, -5);
            
            // Validate Ethereum address
            const addressValidation = validateEthereumAddress(addressFromFilename);
            if (!addressValidation.valid) {
                return res.status(400).json({ 
                    success: false, 
                    error: addressValidation.error 
                });
            }
            
            const address = sanitizeAddress(addressValidation.address);

            const result = await this.abiService.loadAbi(address, abi);

            // Clean up temp file
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.warn('Failed to cleanup temp file:', unlinkError);
            }

            res.json({
                success: true,
                message: `ABI loaded successfully for address 0x${result.address}`,
                address: `0x${result.address}`
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const addressParam = req.params.address;
            
            // Validate Ethereum address
            const addressValidation = validateEthereumAddress(addressParam);
            if (!addressValidation.valid) {
                return res.status(400).json({ 
                    success: false, 
                    error: addressValidation.error 
                });
            }
            
            const address = sanitizeAddress(addressValidation.address);
            await this.abiService.deleteAbi(address);

            res.json({
                success: true,
                message: `ABI removed for address 0x${address}`
            });
        } catch (error) {
            console.error('Delete error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}
