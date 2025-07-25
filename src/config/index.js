// src/config/index.js
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module workarounds
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

export const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  
  // Ethereum configuration
  rpcUrl: process.env.RPC_URL,
  
  // File paths
  abiDir: path.join(rootDir, 'abis'),
  logFilePath: path.join(rootDir, 'events.log'),
  publicDir: path.join(rootDir, 'public'),
  
  // Performance settings
  maxReconnectAttempts: 5,
  reconnectDelay: 5000,
  batchSize: 100,
  logBufferSize: 50,
  
  // File upload settings
  maxFileSize: 1024 * 1024, // 1MB
  
  // WebSocket settings
  connectionTimeout: 10000,
  
  // Health check settings
  maxErrorsBeforeUnhealthy: 10
};

// Validation
if (!config.rpcUrl) {
  throw new Error("RPC_URL not found in .env file. Please add it.");
}

if (!config.rpcUrl.startsWith('ws')) {
  console.warn("Warning: For real-time events, a WebSocket URL (wss://) is recommended.");
}

export default config;
