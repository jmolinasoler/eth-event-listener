import { promises as fs } from 'fs';

export class LogRepository {
    constructor(filePath) {
        this.filePath = filePath;
    }

    async append(logEntry) {
        const line = JSON.stringify(logEntry) + '\n';
        try {
            await fs.appendFile(this.filePath, line);
        } catch (e) {
            console.error(`Failed to write to log file ${this.filePath}:`, e);
            throw e;
        }
    }
}
