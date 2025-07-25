// src/Application.js
import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import config from './config/index.js';
import { AbiRegistry } from './models/AbiRegistry.js';
import { AbiManager } from './services/AbiManager.js';
import { WebSocketManager } from './services/WebSocketManager.js';
import { EventLogger } from './services/EventLogger.js';
import { EthereumProvider } from './services/EthereumProvider.js';
import { AbiController } from './controllers/AbiController.js';
import { StatsController } from './controllers/StatsController.js';
import { GracefulShutdown } from './utils/GracefulShutdown.js';
import { setupRoutes } from './routes/index.js';

/**
 * Main Application Class - Orchestrates all components following MVC pattern
 */
export class Application {
  constructor() {
    this.config = config;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    
    // Initialize models
    this.abiRegistry = new AbiRegistry();
    
    // Initialize services
    this.abiManager = new AbiManager(this.abiRegistry);
    this.wsManager = new WebSocketManager(this.abiRegistry);
    this.eventLogger = new EventLogger(config.logFilePath, this.abiRegistry, this.wsManager);
    this.ethereumProvider = new EthereumProvider(config.rpcUrl, this.eventLogger);
    
    // Initialize controllers
    this.abiController = new AbiController(this.abiRegistry, this.abiManager, this.wsManager);
    this.statsController = new StatsController(
      this.abiRegistry, 
      this.wsManager, 
      this.eventLogger, 
      this.ethereumProvider
    );
    
    // Initialize utilities
    this.gracefulShutdown = new GracefulShutdown(
      this.server,
      this.wsManager,
      this.eventLogger,
      this.ethereumProvider
    );
  }

  /**
   * Setup Express middleware
   */
  async setupMiddleware() {
    // Compression middleware for production
    if (config.isProduction && config.enableCompression) {
      try {
        const compression = await import('compression');
        this.app.use(compression.default());
        console.log('✅ Compression middleware enabled');
      } catch (error) {
        console.warn('⚠️  Could not load compression middleware:', error.message);
      }
    }
    
    // Rate limiting for production
    if (config.isProduction && config.rateLimitWindowMs) {
      try {
        const rateLimit = await import('express-rate-limit');
        const limiter = rateLimit.default({
          windowMs: config.rateLimitWindowMs,
          max: config.rateLimitMaxRequests,
          message: {
            success: false,
            error: 'Too many requests from this IP, please try again later'
          }
        });
        this.app.use('/api/', limiter);
        console.log('✅ Rate limiting enabled');
      } catch (error) {
        console.warn('⚠️  Could not load rate limiting:', error.message);
      }
    }
    
    // Security headers
    this.app.use((req, res, next) => {
      if (config.securityHeaders) {
        res.header('X-Frame-Options', 'DENY');
        res.header('X-Content-Type-Options', 'nosniff');
        res.header('X-XSS-Protection', '1; mode=block');
        res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      }
      
      // CORS headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
    
    // Static files
    this.app.use(express.static(config.publicDir));
    
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    
    // URL encoded parsing
    this.app.use(express.urlencoded({ extended: true }));
  }

  /**
   * Setup application routes
   */
  setupRoutes() {
    const controllers = {
      abiController: this.abiController,
      statsController: this.statsController
    };
    
    const routes = setupRoutes(controllers);
    this.app.use('/', routes);
    
    // Root route
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(config.publicDir, 'index.html'));
    });
  }

  /**
   * Setup WebSocket server
   */
  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log(`WebSocket connection from ${req.socket.remoteAddress}`);
      this.wsManager.addClient(ws);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
      });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    });
  }

  /**
   * Initialize all application components
   */
  async initialize() {
    console.log('🚀 Initializing Ethereum Event Listener...');
    console.log(`🌍 Environment: ${config.nodeEnv}`);
    
    // Initialize production environment if needed
    if (config.isProduction) {
      try {
        const { initializeProduction } = await import('./config/production.js');
        await initializeProduction();
      } catch (error) {
        console.warn('⚠️  Production initialization warning:', error.message);
      }
    }
    
    // Setup Express application
    await this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandling();
    
    // Load ABIs
    console.log('📁 Loading ABIs...');
    await this.abiManager.loadAllAbis();
    console.log(`✅ Loaded ${this.abiRegistry.size()} ABIs`);
    
    // Connect to Ethereum provider
    console.log('🔗 Connecting to Ethereum provider...');
    await this.ethereumProvider.connect();
  }

  /**
   * Start the application server
   */
  async start() {
    await this.initialize();
    
    return new Promise((resolve) => {
      this.server.listen(config.port, () => {
        console.log('\n🎉 Application started successfully!');
        console.log(`🌐 Web UI available at http://localhost:${config.port}`);
        console.log(`📊 Stats available at http://localhost:${config.port}/api/stats`);
        console.log(`❤️  Health check at http://localhost:${config.port}/api/health`);
        console.log(`📈 Metrics at http://localhost:${config.port}/api/metrics`);
        console.log('---------------------------------------------------\n');
        resolve();
      });
    });
  }

  /**
   * Get application statistics
   */
  getStats() {
    return {
      abiRegistry: this.abiRegistry.getStats(),
      webSocket: this.wsManager.getStats(),
      eventLogger: this.eventLogger.getStats(),
      provider: this.ethereumProvider.getStats()
    };
  }
}

export default Application;
