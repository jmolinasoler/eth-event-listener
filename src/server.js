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

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const webSocketService = new WebSocketService(wss);
const abiService = new AbiService(abiRepository, webSocketService);
const ethereumService = new EthereumService(rpcUrl, abiRepository, webSocketService);
const abiController = new AbiController(abiService);

// --- Middleware ---
app.use(express.json());

// Multer Config (must be defined before routes that use it)
const upload = multer({
    dest: path.join(rootDir, 'tmp_uploads'), // Temporary upload dir
    limits: { fileSize: 1024 * 1024 }
});

// Health Check Endpoint for Render.com
// This endpoint must respond quickly and reliably for Render to detect the app is ready
// Must be defined BEFORE static middleware to ensure it's always accessible
const healthCheckHandler = (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'ethereum-event-listener'
    });
};

// Support both /health and /api/health for Render compatibility
// Define these routes FIRST, before any other middleware that might intercept
app.get('/api/health', healthCheckHandler);
app.get('/health', healthCheckHandler);

// --- API Routes (must be before static middleware) ---
app.get('/api/abis', (req, res) => abiController.getAll(req, res));
app.post('/api/abis/upload', upload.single('abi'), (req, res) => abiController.upload(req, res));
app.delete('/api/abis/:address', (req, res) => abiController.delete(req, res));

// Serve static files (UI) - only after API routes are defined
app.use(express.static(path.join(rootDir, 'public')));

// --- Start ---
function startServer() {
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server listening on port ${PORT}`);
            console.log(`Web UI available at http://0.0.0.0:${PORT}`);
            server.removeListener('error', reject);
            resolve();
        });
    });
}

async function start() {
    // Start the web server first to ensure health checks pass immediately
    // Bind to 0.0.0.0 to accept connections from all interfaces (required for Render)
    try {
        await startServer();
        console.log('Server is ready and accepting connections');
    } catch (error) {
        console.error("Failed to start web server:", error);
        process.exit(1);
    }

    // Initialize Repositories asynchronously (don't block server startup)
    try {
        await abiRepository.loadAll();
        console.log('ABIs loaded successfully');
    } catch (error) {
        console.error('Error loading ABIs (continuing anyway):', error);
        // Don't exit - server can still function without pre-loaded ABIs
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

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - keep the server running
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit immediately - let the server try to continue
});

start().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
