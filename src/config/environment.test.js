import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Environment Configuration', () => {
    describe('URL masking', () => {
        it('should mask API keys in URLs', async () => {
            // Dynamically import to avoid affecting other tests
            const { env } = await import('./environment.js');
            
            const url = 'wss://mainnet.infura.io/ws/v3/1234567890abcdef1234567890abcdef';
            const masked = env.maskSensitiveUrl(url);
            
            // Should mask the API key part
            assert.ok(masked.includes('***'));
            assert.ok(!masked.includes('1234567890abcdef1234567890abcdef'));
        });

        it('should handle null URLs', async () => {
            const { env } = await import('./environment.js');
            const masked = env.maskSensitiveUrl(null);
            assert.equal(masked, null);
        });

        it('should handle invalid URLs gracefully', async () => {
            const { env } = await import('./environment.js');
            const masked = env.maskSensitiveUrl('not-a-valid-url');
            assert.ok(masked.includes('***'));
        });
    });

    describe('Configuration validation', () => {
        it('should validate RPC URL format', async () => {
            const { env } = await import('./environment.js');
            
            assert.equal(env.isValidRpcUrl('wss://example.com'), true);
            assert.equal(env.isValidRpcUrl('ws://example.com'), true);
            assert.equal(env.isValidRpcUrl('https://example.com'), true);
            assert.equal(env.isValidRpcUrl('http://example.com'), true);
            assert.equal(env.isValidRpcUrl('invalid'), false);
        });
    });
});
