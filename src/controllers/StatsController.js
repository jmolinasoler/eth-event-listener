// src/controllers/StatsController.js
import config from '../config/index.js';

/**
 * Stats Controller - Handles statistics and health check endpoints
 */
export class StatsController {
  constructor(abiRegistry, wsManager, eventLogger, ethereumProvider) {
    this.abiRegistry = abiRegistry;
    this.wsManager = wsManager;
    this.eventLogger = eventLogger;
    this.ethereumProvider = ethereumProvider;
    this.startTime = Date.now();
  }

  /**
   * Get comprehensive application statistics
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async getStats(req, res) {
    try {
      const stats = {
        application: {
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          startTime: new Date(this.startTime).toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        },
        abiRegistry: this.abiRegistry.getStats(),
        webSocket: this.wsManager.getStats(),
        eventLogger: this.eventLogger.getStats(),
        provider: this.ethereumProvider.getStats(),
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          pid: process.pid
        },
        config: {
          port: config.port,
          batchSize: config.batchSize,
          logBufferSize: config.logBufferSize,
          maxReconnectAttempts: config.maxReconnectAttempts,
          reconnectDelay: config.reconnectDelay
        }
      };

      res.json({ success: true, stats, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Health check endpoint
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async getHealth(req, res) {
    try {
      const providerStats = this.ethereumProvider.getStats();
      const wsStats = this.wsManager.getStats();
      const loggerStats = this.eventLogger.getStats();
      
      // Health criteria
      const isProviderHealthy = providerStats.isConnected && 
        providerStats.errors < config.maxErrorsBeforeUnhealthy;
      const isLoggerHealthy = loggerStats.errors < config.maxErrorsBeforeUnhealthy;
      const isWsHealthy = wsStats.errors < config.maxErrorsBeforeUnhealthy;
      
      const isHealthy = isProviderHealthy && isLoggerHealthy && isWsHealthy;
      
      const health = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        checks: {
          provider: {
            status: isProviderHealthy ? 'ok' : 'error',
            connected: providerStats.isConnected,
            lastBlock: providerStats.lastBlockProcessed,
            errors: providerStats.errors,
            reconnectAttempts: providerStats.reconnectAttempts
          },
          eventLogger: {
            status: isLoggerHealthy ? 'ok' : 'error',
            eventsProcessed: loggerStats.eventsProcessed,
            eventsDecoded: loggerStats.eventsDecoded,
            errors: loggerStats.errors,
            bufferSize: loggerStats.bufferSize
          },
          webSocket: {
            status: isWsHealthy ? 'ok' : 'error',
            activeConnections: wsStats.activeConnections,
            totalConnections: wsStats.totalConnections,
            messagesSent: wsStats.messagesSent,
            errors: wsStats.errors
          },
          abiRegistry: {
            status: 'ok',
            loadedAbis: this.abiRegistry.size()
          }
        }
      };
      
      res.status(isHealthy ? 200 : 503).json(health);
    } catch (error) {
      console.error('Error getting health:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  /**
   * Get basic metrics (lightweight endpoint)
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   */
  async getMetrics(req, res) {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        abiCount: this.abiRegistry.size(),
        activeConnections: this.wsManager.getStats().activeConnections,
        eventsProcessed: this.eventLogger.getStats().eventsProcessed,
        lastBlock: this.ethereumProvider.getStats().lastBlockProcessed,
        isConnected: this.ethereumProvider.getStats().isConnected
      };

      res.json(metrics);
    } catch (error) {
      console.error('Error getting metrics:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default StatsController;
