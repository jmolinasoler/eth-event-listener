import { promises as fs } from 'fs';
import path from 'path';

export class AbiRepository {
    constructor(storageDir) {
        this.storageDir = storageDir;
        this.abis = new Map();
    }

    _normalize(address) {
        return address.toLowerCase().startsWith('0x') ? address.toLowerCase() : `0x${address.toLowerCase()}`;
    }

    async loadAll() {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
            const files = await fs.readdir(this.storageDir);

            for (const file of files) {
                if (file.endsWith('.json')) {
                    let address = file.slice(0, -5); // remove .json
                    address = this._normalize(address);

                    const content = await fs.readFile(path.join(this.storageDir, file), 'utf8');
                    try {
                        const abi = JSON.parse(content);
                        this.abis.set(address, abi);
                    } catch (e) {
                        console.error(`Failed to parse ABI for ${address}:`, e);
                    }
                }
            }
        } catch (e) {
            console.error('Error loading ABIs:', e);
            throw e;
        }
    }

    async save(address, abi) {
        const normalizedAddress = this._normalize(address);
        const filename = `${normalizedAddress}.json`;
        const filepath = path.join(this.storageDir, filename);

        await fs.mkdir(this.storageDir, { recursive: true });
        await fs.writeFile(filepath, JSON.stringify(abi, null, 2));

        this.abis.set(normalizedAddress, abi);
    }

    async get(address) {
        const normalizedAddress = this._normalize(address);
        return this.abis.get(normalizedAddress) || null;
    }

    async getAll() {
        return Array.from(this.abis.entries()).map(([address, abi]) => ({
            address,
            abi
        }));
    }

    async delete(address) {
        const normalizedAddress = this._normalize(address);
        const filename = `${normalizedAddress}.json`;
        const filepath = path.join(this.storageDir, filename);

        try {
            await fs.unlink(filepath);
        } catch (e) {
            if (e.code !== 'ENOENT') {
                throw e;
            }
        }

        this.abis.delete(normalizedAddress);
    }
}
