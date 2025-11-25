import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocketService } from './WebSocketService.js';

describe('WebSocketService', () => {
    let service;
    let mockWss;
    let mockClient;

    beforeEach(() => {
        mockClient = {
            readyState: 1, // OPEN
            send: (msg) => { mockClient.lastMessage = msg; }
        };

        mockWss = {
            clients: new Set([mockClient])
        };

        service = new WebSocketService(mockWss);
    });

    it('should broadcast message to all connected clients', () => {
        const data = { type: 'test', value: 123 };
        service.broadcast(data);

        assert.equal(mockClient.lastMessage, JSON.stringify(data));
    });

    it('should not send to non-open clients', () => {
        mockClient.readyState = 0; // CONNECTING
        mockClient.lastMessage = null;

        service.broadcast({ type: 'test' });

        assert.equal(mockClient.lastMessage, null);
    });
});
