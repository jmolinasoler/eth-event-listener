import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AbiController } from './AbiController.js';

describe('AbiController', () => {
    let controller;
    let mockAbiService;
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockAbiService = {
            getAbis: async () => [],
            loadAbi: async () => { },
            deleteAbi: async () => { }
        };

        mockReq = {};
        mockRes = {
            json: (data) => { mockRes.data = data; },
            status: (code) => { mockRes.statusCode = code; return mockRes; }
        };

        controller = new AbiController(mockAbiService);
    });

    it('should get all ABIs', async () => {
        const abis = [{ address: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0' }];
        mockAbiService.getAbis = async () => abis;

        await controller.getAll(mockReq, mockRes);

        assert.deepEqual(mockRes.data, { success: true, abis });
    });

    it('should upload an ABI', async () => {
        const validAddress = '0x742d35cc6634c0532925a3b844bc9e7595f0beb0';
        mockReq.file = { 
            originalname: `${validAddress}.json`,
            filename: `${validAddress}.json`, 
            path: '/tmp/test-upload.json' 
        };
        mockAbiService.loadAbi = async (addr) => ({ success: true, address: addr });

        // Create a valid ABI file
        const fs = await import('fs/promises');
        const validAbi = [{ type: 'function', name: 'test', inputs: [] }];
        await fs.writeFile('/tmp/test-upload.json', JSON.stringify(validAbi));

        await controller.upload(mockReq, mockRes);

        assert.equal(mockRes.data.success, true);
    });

    it('should delete an ABI', async () => {
        const validAddress = '0x742d35cc6634c0532925a3b844bc9e7595f0beb0';
        mockReq.params = { address: validAddress };
        mockAbiService.deleteAbi = async () => ({ success: true });

        await controller.delete(mockReq, mockRes);

        assert.equal(mockRes.data.success, true);
    });
});
