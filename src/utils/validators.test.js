import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
    validateEthereumAddress, 
    validateAbi, 
    validateJson,
    sanitizeAddress 
} from './validators.js';

describe('Validators', () => {
    describe('validateEthereumAddress', () => {
        it('should validate a correct Ethereum address', () => {
            const result = validateEthereumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb0');
            assert.equal(result.valid, true);
            assert.equal(result.error, null);
            assert.ok(result.address);
        });

        it('should reject an invalid address', () => {
            const result = validateEthereumAddress('0xinvalid');
            assert.equal(result.valid, false);
            assert.ok(result.error);
        });

        it('should reject empty address', () => {
            const result = validateEthereumAddress('');
            assert.equal(result.valid, false);
            assert.equal(result.error, 'Address is required');
        });

        it('should handle checksum addresses correctly', () => {
            const result = validateEthereumAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb0');
            assert.equal(result.valid, true);
            // Should return checksummed address
            assert.ok(result.address.match(/^0x[a-fA-F0-9]{40}$/));
        });
    });

    describe('validateAbi', () => {
        it('should validate a correct ABI', () => {
            const abi = [
                {
                    type: 'function',
                    name: 'transfer',
                    inputs: [
                        { name: 'to', type: 'address' },
                        { name: 'amount', type: 'uint256' }
                    ],
                    outputs: [{ name: '', type: 'bool' }]
                },
                {
                    type: 'event',
                    name: 'Transfer',
                    inputs: [
                        { name: 'from', type: 'address', indexed: true },
                        { name: 'to', type: 'address', indexed: true },
                        { name: 'value', type: 'uint256', indexed: false }
                    ]
                }
            ];
            
            const result = validateAbi(abi);
            assert.equal(result.valid, true);
            assert.equal(result.error, null);
        });

        it('should reject non-array ABI', () => {
            const result = validateAbi({ type: 'function' });
            assert.equal(result.valid, false);
            assert.equal(result.error, 'ABI must be an array');
        });

        it('should reject empty ABI', () => {
            const result = validateAbi([]);
            assert.equal(result.valid, false);
            assert.equal(result.error, 'ABI cannot be empty');
        });

        it('should reject ABI entry without type', () => {
            const abi = [{ name: 'test' }];
            const result = validateAbi(abi);
            assert.equal(result.valid, false);
            assert.ok(result.error.includes('missing \'type\' field'));
        });

        it('should reject ABI entry with invalid type', () => {
            const abi = [{ type: 'invalid' }];
            const result = validateAbi(abi);
            assert.equal(result.valid, false);
            assert.ok(result.error.includes('invalid type'));
        });

        it('should reject ABI that is too large', () => {
            const largeAbi = Array(1001).fill({ type: 'function', name: 'test' });
            const result = validateAbi(largeAbi);
            assert.equal(result.valid, false);
            assert.ok(result.error.includes('too large'));
        });

        it('should validate all ABI types', () => {
            const abi = [
                { type: 'function', name: 'test' },
                { type: 'constructor' },
                { type: 'receive' },
                { type: 'fallback' },
                { type: 'event', name: 'Test' },
                { type: 'error', name: 'TestError' }
            ];
            
            const result = validateAbi(abi);
            assert.equal(result.valid, true);
        });
    });

    describe('validateJson', () => {
        it('should validate correct JSON', () => {
            const result = validateJson('{"test": "value"}');
            assert.equal(result.valid, true);
            assert.deepEqual(result.data, { test: 'value' });
            assert.equal(result.error, null);
        });

        it('should reject invalid JSON', () => {
            const result = validateJson('{invalid}');
            assert.equal(result.valid, false);
            assert.ok(result.error);
        });

        it('should reject empty content', () => {
            const result = validateJson('');
            assert.equal(result.valid, false);
            assert.equal(result.error, 'Content is required');
        });
    });

    describe('sanitizeAddress', () => {
        it('should remove 0x prefix and convert to lowercase', () => {
            const result = sanitizeAddress('0xABC123');
            assert.equal(result, 'abc123');
        });

        it('should handle address without 0x prefix', () => {
            const result = sanitizeAddress('ABC123');
            assert.equal(result, 'abc123');
        });

        it('should handle empty address', () => {
            const result = sanitizeAddress('');
            assert.equal(result, '');
        });

        it('should trim whitespace', () => {
            const result = sanitizeAddress('  0xABC123  ');
            assert.equal(result, 'abc123');
        });
    });
});
