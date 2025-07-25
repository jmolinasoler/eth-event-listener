// src/services/WebSocketManager.js

/**
 * WebSocket Manager Service - Handles WebSocket client connections and broadcasting
 */
export class WebSocketManager {
  constructor(abiRegistry) {
    this.abiRegistry = abiRegistry;
    this.clients = new Set();
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      lastConnectionTime: null,
      errors: 0
    };
  }

  /**
   * Add a new WebSocket client
   * @param {WebSocket} ws - WebSocket connection
   */
  addClient(ws) {
    this.clients.add(ws);
    this.stats.totalConnections++;
    this.stats.activeConnections++;
    this.stats.lastConnectionTime = new Date().toISOString();
    
    console.log(`Client connected. Active: ${this.stats.activeConnections}`);

    // Setup event handlers
    ws.on('close', () => {
      this.removeClient(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket client error:', error);
      this.stats.errors++;
      this.removeClient(ws);
    });

    // Send current ABI registry status to new client
    this.sendToClient(ws, {
      type: 'abi_registry_status',
      data: this.abiRegistry.getStats(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Remove a WebSocket client
   * @param {WebSocket} ws - WebSocket connection
   */
  removeClient(ws) {
    if (this.clients.has(ws)) {
      this.clients.delete(ws);
      this.stats.activeConnections--;
      console.log(`Client disconnected. Active: ${this.stats.activeConnections}`);
    }
  }

  /**
   * Send data to a specific client
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Data to send
   * @returns {boolean} - Success status
   */
  sendToClient(ws, data) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Error sending to client:', error);
        this.stats.errors++;
        this.removeClient(ws);
        return false;
      }
    }
    return false;
  }

  /**
   * Broadcast data to all connected clients
   * @param {Object} data - Data to broadcast
   * @returns {number} - Number of successful sends
   */
  broadcast(data) {
    const message = JSON.stringify(data);
    let successCount = 0;
    const deadClients = [];

    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          console.error('Broadcast error:', error);
          this.stats.errors++;
          deadClients.push(client);
        }
      } else {
        deadClients.push(client);
      }
    }

    // Clean up dead connections
    deadClients.forEach(client => this.removeClient(client));
    
    this.stats.messagesSent++;
    return successCount;
  }

  /**
   * Broadcast ABI update to all clients
   * @param {string} address - Contract address
   * @param {string} action - Action type ('updated' or 'removed')
   */
  broadcastAbiUpdate(address, action) {
    this.broadcast({
      type: `abi_${action}`,
      address: address,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get service statistics
   * @returns {Object}
   */
  getStats() {
    return { 
      ...this.stats,
      clientsCount: this.clients.size
    };
  }

  /**
   * Close all client connections
   * @param {string} reason - Reason for closing
   */
  closeAllConnections(reason = 'Server shutting down') {
    for (const client of this.clients) {
      try {
        client.close(1000, reason);
      } catch (error) {
        console.error('Error closing client connection:', error);
      }
    }
    this.clients.clear();
    this.stats.activeConnections = 0;
  }
}

export default WebSocketManager;
