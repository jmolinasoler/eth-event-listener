import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

import { AbiRepository } from './repositories/AbiRepository.js';
import { WebSocketService } from './services/WebSocketService.js';
import { AbiService } from './services/AbiService.js';
import { EthereumService } from './services/EthereumService.js';
import { AbiController } from './controllers/AbiController.js';

// --- ES Module Workarounds ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// --- Configuration ---
const rpcUrl = process.env.RPC_URL;
const PORT = process.env.PORT || 3000;
const ABI_DIR = path.join(rootDir, 'abis');

if (!rpcUrl) {
    throw new Error("RPC_URL not found in .env file. Please add it.");
}

// --- Dependencies ---
const abiRepository = new AbiRepository(ABI_DIR);

// Initialize Repositories
await abiRepository.loadAll();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const webSocketService = new WebSocketService(wss);
const abiService = new AbiService(abiRepository, webSocketService);
const ethereumService = new EthereumService(rpcUrl, abiRepository, webSocketService);
const abiController = new AbiController(abiService);

// --- Middleware ---
app.use(express.static(path.join(rootDir, 'public')));
app.use(express.json());

// Multer Config
const upload = multer({
    dest: path.join(rootDir, 'tmp_uploads'), // Temporary upload dir
    limits: { fileSize: 1024 * 1024 }
});

// --- Routes ---
app.get('/api/abis', (req, res) => abiController.getAll(req, res));
app.post('/api/abis/upload', upload.single('abi'), (req, res) => abiController.upload(req, res));
app.delete('/api/abis/:address', (req, res) => abiController.delete(req, res));

// --- Start ---
async function start() {
    try {
        ethereumService.connect();

        server.listen(PORT, () => {
            console.log(`Web UI available at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start application:", error);
        process.exit(1);
    }
}

start();
