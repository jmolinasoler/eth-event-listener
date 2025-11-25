// index.js (Corrected for Ethers v6 with Wildcard Filter)
import { ethers } from 'ethers';
import 'dotenv/config';
import { promises as fs } from 'fs';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// --- ES Module Workarounds ---
// In ES modules, __dirname is not available by default. This is the standard workaround.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- ABI Registry (Model) ---
const abiRegistry = new Map();

// Configure multer for ABI file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const abiDir = path.join(__dirname, 'abis');
      cb(null, abiDir);
    },
    filename: (req, file, cb) => {
      // Extract address from form data or use original filename
      const address = req.body.address || file.originalname.replace('.json', '');
      cb(null, `${address.toLowerCase()}.json`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Only accept JSON files
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  },
  limits: {
    fileSize: 1024 * 1024 // 1MB limit
  }
});

async function loadAbis() {
  const abiDir = path.join(__dirname, 'abis');
  try {
    // Ensure abis directory exists
    await fs.mkdir(abiDir, { recursive: true });

    const files = await fs.readdir(abiDir);
    console.log('Loading ABIs...');
    for (const file of files) {
      if (file.endsWith('.json')) {
        await loadSingleAbi(file);
      }
    }
  } catch (e) {
    console.error('Error loading ABIs:', e);
  }
}

async function loadSingleAbi(filename) {
  try {
    const address = filename.slice(0, -5).toLowerCase(); // remove .json
    const abiPath = path.join(__dirname, 'abis', filename);
    const abiContent = await fs.readFile(abiPath, 'utf8');
    const parsedAbi = JSON.parse(abiContent);
    abiRegistry.set(address, new ethers.Interface(parsedAbi));
    console.log(`- Loaded ABI for 0x${address}`);
    return { success: true, address };
  } catch (error) {
    console.error(`Error loading ABI ${filename}:`, error);
    return { success: false, error: error.message };
  }
}

function getLoadedAbis() {
  return Array.from(abiRegistry.keys()).map(address => ({
    address: `0x${address}`,
    hasInterface: true
  }));
}

// --- Configuration ---
const rpcUrl = process.env.RPC_URL;
const PORT = process.env.PORT || 3000;


if (!rpcUrl) {
  throw new Error("RPC_URL not found in .env file. Please add it.");
}
if (!rpcUrl.startsWith('ws')) {
  console.warn("Warning: For real-time events, a WebSocket URL (wss://) is recommended.");
}

// --- Web Server & WebSocket Setup (Controller) ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Add JSON parsing middleware

// ABI Management Routes (Controller)
app.get('/api/abis', (req, res) => {
  try {
    const abis = getLoadedAbis();
    res.json({ success: true, abis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/abis/upload', upload.single('abi'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const result = await loadSingleAbi(req.file.filename);

    if (result.success) {
      // Broadcast ABI update to connected WebSocket clients
      broadcast({
        type: 'abi_updated',
        address: `0x${result.address}`,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `ABI loaded successfully for address 0x${result.address}`,
        address: `0x${result.address}`
      });
    } else {
      // Clean up the uploaded file if it failed to load
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up failed upload:', unlinkError);
      }
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/abis/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase().replace('0x', '');
    const filename = `${address}.json`;
    const abiPath = path.join(__dirname, 'abis', filename);

    // Remove from registry
    abiRegistry.delete(address);

    // Delete file
    try {
      await fs.unlink(abiPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Broadcast ABI removal to connected WebSocket clients
    broadcast({
      type: 'abi_removed',
      address: `0x${address}`,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `ABI removed for address 0x${address}`
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- WebSocket Setup (Controller) ---

// Keep track of all connected clients
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  clients.add(ws);

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    // Check if the client's connection is open before sending
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

// --- Ethereum Event Listener (Model) ---

// This function handles logging and broadcasting events
const logHandler = async (log) => {
  // Format a clean log object for broadcasting to avoid circular references
  const formattedLog = {
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    address: log.address,
    transactionIndex: log.transactionIndex,
    logIndex: log.logIndex,
    topics: log.topics,
    data: log.data,
    timestamp: new Date().toISOString(),
    decoded: null,
  };

  // --- Event Decoding Logic ---
  const contractAddress = log.address.toLowerCase();
  if (abiRegistry.has(contractAddress)) {
    const iface = abiRegistry.get(contractAddress);
    try {
      const parsedLog = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsedLog) {
        const args = {};
        // The Result object is array-like and has named properties
        parsedLog.fragment.inputs.forEach((input, index) => {
          let value = parsedLog.args[index];
          // Convert BigInt to string for JSON serialization
          if (typeof value === 'bigint') {
            value = value.toString();
          }
          args[input.name] = {
            value: value,
            type: input.type
          };
        });

        formattedLog.decoded = { name: parsedLog.name, signature: parsedLog.signature, args: args };
      }
    } catch (e) {
      // This is expected if the log topic doesn't match any event in the ABI
    }
  }

  // Broadcast to connected WebSocket clients
  console.log(`Broadcasting event from block ${log.blockNumber} for contract ${log.address}`);
  broadcast(formattedLog);
};

// --- Main Application Logic ---
function connect() {
  console.log(`Connecting to Ethereum provider: ${rpcUrl.split('/v3/')[0]}...`);

  // WebSocketProvider is still the correct choice for real-time events.
  const provider = new ethers.WebSocketProvider(rpcUrl);

  const onConnected = () => {
    console.log('Provider connected. Listening for all new events...');
    console.log('----------------------------------------------------');

    // In ethers v6, you cannot subscribe to all events directly on the provider
    // with a wildcard like `provider.on("*", ...)`. That syntax is for contract
    // instances (`contract.on("*", ...)`).
    //
    // The old `provider.on({}, ...)` from v5 was removed because many RPC
    // providers do not support this type of broad filter (`eth_newFilter`).
    //
    // The recommended approach is to listen for new blocks and then query
    // all logs for that block.
    provider.on("block", async (blockNumber) => {
      try {
        const logs = await provider.getLogs({ fromBlock: blockNumber, toBlock: blockNumber });
        // Process each log sequentially to ensure order in the log file
        for (const log of logs) {
          await logHandler(log);
        }
      } catch (e) {
        console.error(`Error fetching logs for block ${blockNumber}:`, e);
      }
    });
  };

  const onDisconnect = (code) => {
    console.error(`WebSocket disconnected with code ${code}. Cleaning up and reconnecting...`);
    // Clean up all listeners to avoid memory leaks
    provider.removeAllListeners();
    // Attempt to reconnect after a short delay
    setTimeout(connect, 5000); // Reconnect after 5 seconds
  };

  // The 'open' event signals the WebSocket is ready.
  provider.websocket.on('open', onConnected);
  provider.websocket.on('close', onDisconnect);
  provider.websocket.on('error', (err) => {
    // Don't try to reconnect on every error, as some are not recoverable.
    console.error("A WebSocket error occurred:", err.message);
  });
}

// --- Start the application ---
async function startApp() {
  await loadAbis();

  // Wrap the initial connect in a try/catch for immediate setup errors.
  try {
    // Start the Ethereum listener
    connect();
  } catch (error) {
    console.error("Failed to start the Ethereum listener:", error);
  }

  // Start the web server
  server.listen(PORT, () => {
    console.log(`Web UI available at http://localhost:${PORT}`);
  });
}

startApp();