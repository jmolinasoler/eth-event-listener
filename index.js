// index.js (Corrected for Ethers v6 with Wildcard Filter)
import { ethers } from 'ethers';
import 'dotenv/config';

// --- Configuration ---
const rpcUrl = process.env.RPC_URL;

if (!rpcUrl) {
  throw new Error("RPC_URL not found in .env file. Please add it.");
}
if (!rpcUrl.startsWith('ws')) {
  console.warn("Warning: For real-time events, a WebSocket URL (wss://) is recommended.");
}

// This function will handle the event logging
const logHandler = (log) => {
  // The log object contains a wealth of information.
  // Let's log more details to make it more useful for debugging and analysis.
  console.log(`
    ==================== New Event Received ====================
    Block Number:         ${log.blockNumber}
    Transaction Hash:     ${log.transactionHash}
    Contract Address:     ${log.address}
    Transaction Index:    ${log.transactionIndex}
    Log Index in Block:   ${log.logIndex}
    Topics (indexed data):
      - Signature Hash:   ${log.topics[0] || 'N/A'}
      - Topic 1:          ${log.topics[1] || 'N/A'}
      - Topic 2:          ${log.topics[2] || 'N/A'}
      - Topic 3:          ${log.topics[3] || 'N/A'}
    Data (non-indexed):   ${log.data.length > 130 ? log.data.slice(0, 130) + '...' : log.data}
    ------------------------------------------------------------
  `);
};

// --- Main Application Logic ---
function connect() {
  console.log(`Connecting to Ethereum via: ${rpcUrl.split('/v3/')[0]}...`);

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
        logs.forEach(logHandler);
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
  connect();
} catch (error) {
  console.error("Failed to start the application:", error);
  process.exit(1);
}