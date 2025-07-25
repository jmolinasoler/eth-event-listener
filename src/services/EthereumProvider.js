// src/services/EthereumProvider.js
import { ethers } from 'ethers';
import config from '../config/index.js';

/**
 * Ethereum Provider Service - Manages WebSocket connection to Ethereum network
 */
export class EthereumProvider {
  constructor(rpcUrl, eventLogger) {
    this.rpcUrl = rpcUrl;
    this.eventLogger = eventLogger;
    this.provider = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts;
    this.reconnectDelay = config.reconnectDelay;
    this.isConnecting = false;
    this.lastBlockProcessed = 0;
    this.stats = {
      blocksProcessed: 0,
      logsProcessed: 0,
      reconnections: 0,
      errors: 0,
      connectionUptime: 0,
      lastBlockTime: null
    };
    this.connectionStartTime = null;
  }

  /**
   * Connect to Ethereum provider
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.isConnecting) return;
    
    this.isConnecting = true;
    
    try {
      console.log(`Connecting to Ethereum provider: ${this.rpcUrl.split('/v3/')[0]}...`);
      
      this.provider = new ethers.WebSocketProvider(this.rpcUrl);
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Wait for connection to be established
      await this.waitForConnection();
      
      console.log('Provider connected. Listening for new events...');
      console.log('----------------------------------------------------');
      
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.connectionStartTime = Date.now();
      
      // Start listening for blocks
      this.startBlockListener();
      
    } catch (error) {
      console.error('Failed to connect to provider:', error);
      this.stats.errors++;
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  setupEventListeners() {
    if (!this.provider || !this.provider.websocket) return;

    this.provider.websocket.on('open', () => {
      console.log('WebSocket connection opened');
    });

    this.provider.websocket.on('close', (code) => {
      console.error(`WebSocket disconnected with code ${code}`);
      this.handleDisconnection();
    });

    this.provider.websocket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.stats.errors++;
    });
  }

  /**
   * Wait for WebSocket connection to be established
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async waitForConnection(timeout = config.connectionTimeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      if (this.provider && this.provider.websocket) {
        if (this.provider.websocket.readyState === 1) { // OPEN
          clearTimeout(timer);
          resolve();
          return;
        }

        const onOpen = () => {
          clearTimeout(timer);
          this.provider.websocket.removeListener('error', onError);
          resolve();
        };

        const onError = (error) => {
          clearTimeout(timer);
          this.provider.websocket.removeListener('open', onOpen);
          reject(error);
        };

        this.provider.websocket.once('open', onOpen);
        this.provider.websocket.once('error', onError);
      } else {
        clearTimeout(timer);
        reject(new Error('No websocket available'));
      }
    });
  }

  /**
   * Start listening for new blocks
   */
  startBlockListener() {
    if (!this.provider) return;

    this.provider.on("block", async (blockNumber) => {
      try {
        if (blockNumber <= this.lastBlockProcessed) return;
        
        const logs = await this.provider.getLogs({ 
          fromBlock: blockNumber, 
          toBlock: blockNumber 
        });
        
        if (logs.length > 0) {
          console.log(`Processing ${logs.length} logs from block ${blockNumber}`);
          
          // Process logs in batches for better performance
          const batches = this.createBatches(logs, config.batchSize);
          for (const batch of batches) {
            await this.eventLogger.processBatch(batch);
          }
          
          this.stats.logsProcessed += logs.length;
        }
        
        this.stats.blocksProcessed++;
        this.lastBlockProcessed = blockNumber;
        this.stats.lastBlockTime = new Date().toISOString();
        
      } catch (error) {
        console.error(`Error processing block ${blockNumber}:`, error);
        this.stats.errors++;
      }
    });
  }

  /**
   * Create batches from array
   * @param {Array} array - Array to batch
   * @param {number} batchSize - Size of each batch
   * @returns {Array} - Array of batches
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Handle provider disconnection
   */
  handleDisconnection() {
    if (this.provider) {
      this.provider.removeAllListeners();
      this.provider = null;
    }
    this.connectionStartTime = null;
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping.`);
      return;
    }

    this.reconnectAttempts++;
    this.stats.reconnections++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Get service statistics
   * @returns {Object}
   */
  getStats() {
    const uptime = this.connectionStartTime ? 
      Math.floor((Date.now() - this.connectionStartTime) / 1000) : 0;
    
    return { 
      ...this.stats,
      isConnected: this.provider && this.provider.websocket && this.provider.websocket.readyState === 1,
      lastBlockProcessed: this.lastBlockProcessed,
      reconnectAttempts: this.reconnectAttempts,
      connectionUptime: uptime
    };
  }

  /**
   * Shutdown the provider gracefully
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (this.provider) {
      this.provider.removeAllListeners();
      if (this.provider.websocket) {
        this.provider.websocket.close();
      }
      this.provider = null;
    }
    this.connectionStartTime = null;
  }
}

export default EthereumProvider;
