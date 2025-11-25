import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { EthereumService } from './EthereumService.js';

describe('EthereumService', () => {
    let service;
    let mockProvider;
    let mockAbiRepo;

    let mockWsService;

    beforeEach(() => {
        mockProvider = {
            on: (event, cb) => {
                if (event === 'block') mockProvider.blockCallback = cb;
            },
            getLogs: async () => [],
            removeAllListeners: () => { },
            websocket: {
                on: () => { }
            }
        };

        mockAbiRepo = {
            get: async () => null,
            getAll: async () => []
        };

        mockWsService = {
            broadcast: () => { }
        };

        service = new EthereumService(
            'ws://localhost:8545',
            mockAbiRepo,
            mockWsService
        );
        // Inject mock provider
        service.provider = mockProvider;
    });

    it('should listen for blocks and process logs', async () => {
        const logs = [{
            blockNumber: 1,
            transactionHash: '0x1',
            address: '0xContract',
            topics: [],
            data: '0x'
        }];

        mockProvider.getLogs = async () => logs;

        let broadcastLog;
        mockWsService.broadcast = (log) => {
            broadcastLog = log;
        };

        // Simulate block event
        await service.handleBlock(1);

        assert.ok(broadcastLog);
        assert.equal(broadcastLog.blockNumber, 1);
    });
});
