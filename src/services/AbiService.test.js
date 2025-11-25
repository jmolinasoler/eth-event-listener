import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AbiService } from './AbiService.js';

describe('AbiService', () => {
    let service;
    let mockRepo;
    let mockWsService;

    beforeEach(() => {
        mockRepo = {
            save: async () => { },
            delete: async () => { },
            get: async () => null,
            getAll: async () => []
        };

        mockWsService = {
            broadcast: () => { }
        };

        service = new AbiService(mockRepo, mockWsService);
    });

    it('should load an ABI and broadcast update', async () => {
        const address = '0x123';
        const abi = [{ type: 'function' }];

        let savedAddress, savedAbi;
        mockRepo.save = async (addr, a) => {
            savedAddress = addr;
            savedAbi = a;
        };

        let broadcastData;
        mockWsService.broadcast = (data) => {
            broadcastData = data;
        };

        await service.loadAbi(address, abi);

        assert.equal(savedAddress, address);
        assert.deepEqual(savedAbi, abi);
        assert.equal(broadcastData.type, 'abi_updated');
        assert.equal(broadcastData.address, address);
    });

    it('should delete an ABI and broadcast removal', async () => {
        const address = '0x123';

        let deletedAddress;
        mockRepo.delete = async (addr) => {
            deletedAddress = addr;
        };

        let broadcastData;
        mockWsService.broadcast = (data) => {
            broadcastData = data;
        };

        await service.deleteAbi(address);

        assert.equal(deletedAddress, address);
        assert.equal(broadcastData.type, 'abi_removed');
        assert.equal(broadcastData.address, address);
    });
});
