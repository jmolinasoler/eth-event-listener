import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { LogRepository } from './LogRepository.js';

describe('LogRepository', () => {
    let tempDir;
    let logFile;
    let repo;

    before(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'log-repo-test-'));
        logFile = path.join(tempDir, 'events.log');
    });

    after(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    beforeEach(async () => {
        // Clear log file
        await fs.writeFile(logFile, '');
        repo = new LogRepository(logFile);
    });

    it('should append a log entry', async () => {
        const entry = { blockNumber: 123, event: 'Test' };
        await repo.append(entry);

        const content = await fs.readFile(logFile, 'utf8');
        assert.equal(content.trim(), JSON.stringify(entry));
    });

    it('should append multiple entries', async () => {
        const entry1 = { id: 1 };
        const entry2 = { id: 2 };

        await repo.append(entry1);
        await repo.append(entry2);

        const content = await fs.readFile(logFile, 'utf8');
        const lines = content.trim().split('\n');

        assert.equal(lines.length, 2);
        assert.deepEqual(JSON.parse(lines[0]), entry1);
        assert.deepEqual(JSON.parse(lines[1]), entry2);
    });
});
