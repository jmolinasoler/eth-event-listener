// src/utils/GracefulShutdown.js

/**
 * Graceful Shutdown Utility - Handles application shutdown gracefully
 */
export class GracefulShutdown {
  constructor(server, wsManager, eventLogger, ethereumProvider) {
    this.server = server;
    this.wsManager = wsManager;
    this.eventLogger = eventLogger;
    this.ethereumProvider = ethereumProvider;
    this.isShuttingDown = false;
    this.setupSignalHandlers();
  }

  /**
   * Setup process signal handlers
   */
  setupSignalHandlers() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      this.shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
    });
  }

  /**
   * Perform graceful shutdown
   * @param {string} signal - Signal that triggered shutdown
   */
  async shutdown(signal) {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    try {
      // Stop accepting new HTTP connections
      this.server.close(() => {
        console.log('HTTP server closed');
      });

      // Close all WebSocket connections
      this.wsManager.closeAllConnections('Server shutting down');
      console.log('WebSocket connections closed');

      // Flush event logger buffer
      await this.eventLogger.shutdown();
      console.log('Event logger shutdown complete');

      // Disconnect Ethereum provider
      await this.ethereumProvider.shutdown();
      console.log('Ethereum provider shutdown complete');

      console.log('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

export default GracefulShutdown;
