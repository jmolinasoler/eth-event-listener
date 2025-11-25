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
        const abis = [{ address: '0x123' }];
        mockAbiService.getAbis = async () => abis;

        await controller.getAll(mockReq, mockRes);

        assert.deepEqual(mockRes.data, { success: true, abis });
    });

    it('should upload an ABI', async () => {
        mockReq.file = { filename: '0x123.json' };
        mockAbiService.loadAbi = async (addr) => ({ success: true, address: addr });

        await controller.upload(mockReq, mockRes);

        assert.equal(mockRes.data.success, true);
        assert.equal(mockRes.data.address, '0x0x123'); // logic in controller might add 0x or service returns it
    });

    it('should delete an ABI', async () => {
        mockReq.params = { address: '0x123' };
        mockAbiService.deleteAbi = async () => ({ success: true });

        await controller.delete(mockReq, mockRes);

        assert.equal(mockRes.data.success, true);
    });
});
