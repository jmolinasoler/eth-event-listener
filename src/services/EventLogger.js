// src/services/EventLogger.js
import { createWriteStream } from 'fs';
import config from '../config/index.js';

/**
 * Event Logger Service - Handles event processing and logging with buffering
 */
export class EventLogger {
  constructor(logFilePath, abiRegistry, wsManager) {
    this.logFilePath = logFilePath;
    this.abiRegistry = abiRegistry;
    this.wsManager = wsManager;
    this.buffer = [];
    this.bufferSize = config.logBufferSize;
    this.writeStream = null;
    this.stats = {
      eventsProcessed: 0,
      eventsDecoded: 0,
      errors: 0,
      lastEventTime: null
    };
    this.initializeWriteStream();
  }

  /**
   * Initialize the write stream for file logging
   */
  initializeWriteStream() {
    try {
      this.writeStream = createWriteStream(this.logFilePath, { flags: 'a' });
      this.writeStream.on('error', (error) => {
        console.error('Write stream error:', error);
        this.stats.errors++;
      });
    } catch (error) {
      console.error('Failed to initialize write stream:', error);
      this.stats.errors++;
    }
  }

  /**
   * Flush buffered events to file
   * @returns {Promise<void>}
   */
  async flushBuffer() {
    if (this.buffer.length === 0 || !this.writeStream) return;

    const entries = this.buffer.splice(0);
    const logData = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
    
    return new Promise((resolve, reject) => {
      this.writeStream.write(logData, (error) => {
        if (error) {
          console.error('Failed to write to log file:', error);
          this.stats.errors++;
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Add event to buffer
   * @param {Object} logEntry - Formatted log entry
   */
  async addToBuffer(logEntry) {
    this.buffer.push(logEntry);
    if (this.buffer.length >= this.bufferSize) {
      await this.flushBuffer();
    }
  }

  /**
   * Format and decode a raw log entry
   * @param {Object} log - Raw log from Ethereum
   * @returns {Object} - Formatted log entry
   */
  formatLog(log) {
    this.stats.eventsProcessed++;
    this.stats.lastEventTime = new Date().toISOString();
    
    const formattedLog = {
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      address: log.address,
      transactionIndex: log.transactionIndex,
      logIndex: log.logIndex,
      topics: log.topics,
      data: log.data,
      timestamp: this.stats.lastEventTime,
      decoded: null,
    };

    // Event Decoding Logic
    const contractAddress = log.address.toLowerCase();
    if (this.abiRegistry.has(contractAddress)) {
      const iface = this.abiRegistry.get(contractAddress);
      try {
        const parsedLog = iface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsedLog) {
          const args = {};
          parsedLog.fragment.inputs.forEach((input, index) => {
            let value = parsedLog.args[index];
            if (typeof value === 'bigint') {
              value = value.toString();
            }
            args[input.name] = {
              value: value,
              type: input.type
            };
          });

          formattedLog.decoded = { 
            name: parsedLog.name, 
            signature: parsedLog.signature, 
            args: args 
          };
          this.stats.eventsDecoded++;
        }
      } catch (e) {
        // Expected if log topic doesn't match any event in ABI
      }
    }

    return formattedLog;
  }

  /**
   * Process a single log entry
   * @param {Object} log - Raw log from Ethereum
   * @returns {Promise<Object>} - Formatted log entry
   */
  async processLog(log) {
    try {
      const formattedLog = this.formatLog(log);
      
      // Broadcast to WebSocket clients
      this.wsManager.broadcast(formattedLog);
      
      // Add to buffer for file logging
      await this.addToBuffer(formattedLog);
      
      return formattedLog;
    } catch (error) {
      console.error('Error processing log:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Process multiple logs in batch
   * @param {Array} logs - Array of raw logs
   * @returns {Promise<Array>} - Array of processed logs
   */
  async processBatch(logs) {
    const results = [];
    for (const log of logs) {
      try {
        const result = await this.processLog(log);
        results.push(result);
      } catch (error) {
        console.error(`Error processing log ${log.transactionHash}:`, error);
      }
    }
    return results;
  }

  /**
   * Get service statistics
   * @returns {Object}
   */
  getStats() {
    return { 
      ...this.stats,
      bufferSize: this.buffer.length,
      bufferCapacity: this.bufferSize
    };
  }

  /**
   * Shutdown the service gracefully
   * @returns {Promise<void>}
   */
  async shutdown() {
    await this.flushBuffer();
    if (this.writeStream) {
      this.writeStream.end();
    }
  }
}

export default EventLogger;
