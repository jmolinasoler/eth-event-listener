// index.js (Corrected for Ethers v6 with Wildcard Filter)
import { ethers } from 'ethers';
import 'dotenv/config';
import { promises as fs } from 'fs';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Web Server & WebSocket Setup (Controller) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const rpcUrl = process.env.RPC_URL;
const PORT = process.env.PORT || 3000;
const LOG_FILE_PATH = path.join(__dirname, 'events.log');

if (!rpcUrl) {
  throw new Error("RPC_URL not found in .env file. Please add it.");
}
if (!rpcUrl.startsWith('ws')) {
  console.warn("Warning: For real-time events, a WebSocket URL (wss://) is recommended.");
}

const app = express();
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

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
  };

  // Broadcast to connected WebSocket clients
  console.log(`Broadcasting event from block ${log.blockNumber} for contract ${log.address}`);
  broadcast(formattedLog);

  // Append the event to the log file
  const logEntry = JSON.stringify(formattedLog) + '\n';
  try {
    await fs.appendFile(LOG_FILE_PATH, logEntry);
  } catch (err) {
    console.error(`Failed to write event to log file: ${err.message}`);
  }
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