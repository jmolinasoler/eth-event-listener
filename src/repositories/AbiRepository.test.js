import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { AbiRepository } from './AbiRepository.js';

describe('AbiRepository', () => {
    let tempDir;
    let repo;

    before(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'abi-repo-test-'));
    });

    after(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    beforeEach(async () => {
        // Clean up directory between tests
        const files = await fs.readdir(tempDir);
        for (const file of files) {
            await fs.unlink(path.join(tempDir, file));
        }
        repo = new AbiRepository(tempDir);
    });

    it('should save and retrieve an ABI', async () => {
        const address = '0x123';
        const abi = [{ type: 'function', name: 'test' }];

        await repo.save(address, abi);

        const loadedAbi = await repo.get(address);
        assert.deepEqual(loadedAbi, abi);

        // Verify file exists
        const fileContent = await fs.readFile(path.join(tempDir, '0x123.json'), 'utf8');
        assert.deepEqual(JSON.parse(fileContent), abi);
    });

    it('should list all ABIs', async () => {
        await repo.save('0x123', []);
        await repo.save('0x456', []);

        const abis = await repo.getAll();
        assert.equal(abis.length, 2);
        assert.ok(abis.find(a => a.address === '0x123'));
        assert.ok(abis.find(a => a.address === '0x456'));
    });

    it('should delete an ABI', async () => {
        await repo.save('0x123', []);
        await repo.delete('0x123');

        const loadedAbi = await repo.get('0x123');
        assert.equal(loadedAbi, null);

        // Verify file is gone
        try {
            await fs.access(path.join(tempDir, '0x123.json'));
            assert.fail('File should not exist');
        } catch (e) {
            assert.equal(e.code, 'ENOENT');
        }
    });

    it('should load existing ABIs on initialization', async () => {
        // Create a file manually
        const manualAbi = [{ type: 'event', name: 'Test' }];
        await fs.writeFile(path.join(tempDir, '0x999.json'), JSON.stringify(manualAbi));

        // Create new repo instance to trigger load
        const newRepo = new AbiRepository(tempDir);
        await newRepo.loadAll();

        const loadedAbi = await newRepo.get('0x999');
        assert.deepEqual(loadedAbi, manualAbi);
    });
});
