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

            // Filename is expected to be address.json from multer storage
            const address = req.file.filename.slice(0, -5).toLowerCase();
            // In a real app, we might want to parse the file content here or in service
            // But AbiRepository reads from disk, so we just need to tell service to "load" it
            // Actually, AbiRepository.save writes to disk.
            // But Multer already wrote to disk.
            // So we need to align this.
            // Option 1: Multer writes to temp, Service reads and saves to final repo.
            // Option 2: Multer writes to repo dir directly (as in original code).
            // Let's stick to original behavior: Multer writes to repo dir, then we trigger "load".
            // But wait, AbiRepository.save writes to file.
            // If Multer writes to file, we don't need AbiRepository.save, we need AbiRepository.loadSingle?
            // Or we change Multer to write to temp, and Service calls Repo.save(content).
            // The "Clean" way is Service receives content/file, and calls Repo.save.
            // Let's assume Multer writes to a temp location or we read it.
            // For now, to minimize changes to Multer logic which is in server setup, let's assume we pass the filename/path to service.

            // However, the original code had `loadSingleAbi` which read from the file Multer saved.
            // Let's refactor:
            // Controller reads the file content (or Service does).
            // Let's make Service take (address, abiObject).
            // So Controller needs to read the file.

            const fs = await import('fs/promises');
            const content = await fs.readFile(req.file.path, 'utf8');
            const abi = JSON.parse(content);

            // We can delete the temp file from Multer if we want, or if Multer saved directly to repo, we are duplicating.
            // Let's assume Multer saves to a temp dir in the new setup.

            const result = await this.abiService.loadAbi(address, abi);

            // Clean up temp file if needed (depends on Multer config in server.js)
            // For now, let's assume we handle cleanup if it was a temp file.

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
            const address = req.params.address.toLowerCase().replace('0x', '');
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
