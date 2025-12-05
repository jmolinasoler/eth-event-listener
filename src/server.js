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
    console.warn("Warning: RPC_URL not found in .env file. Ethereum features will be disabled until configured.");
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

// Health Check Endpoint for Render.com
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'ethereum-event-listener'
    });
});

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
    // Start the web server first to ensure health checks pass
    // Bind to 0.0.0.0 to accept connections from all interfaces (required for Render)
    try {
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server listening on port ${PORT}`);
            console.log(`Web UI available at http://0.0.0.0:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start web server:", error);
        process.exit(1);
    }

    // Then attempt to connect to Ethereum
    try {
        if (rpcUrl) {
            ethereumService.connect();
        }
    } catch (error) {
        console.error("Failed to start the Ethereum listener:", error);
        // Do not exit, keep the web server running
    }
}

start();
