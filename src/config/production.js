// src/config/production.js
import path from 'path';
import { promises as fs } from 'fs';

/**
 * Production-specific configuration overrides for Render deployment
 */
export const productionConfig = {
  // Render-specific paths
  logFilePath: process.env.LOG_PATH || '/opt/render/project/src/logs/events.log',
  
  // Render assigns PORT automatically
  port: process.env.PORT || 10000,
  
  // Production performance optimizations
  batchSize: 200,
  logBufferSize: 100,
  maxReconnectAttempts: 10,
  reconnectDelay: 2000,
  
  // Health check settings for production load
  maxErrorsBeforeUnhealthy: 20,
  
  // Render platform optimizations
  connectionTimeout: 30000,
  
  // Enable production features
  enableCompression: true,
  securityHeaders: true,
  
  // Log rotation settings
  maxLogSize: 100 * 1024 * 1024, // 100MB
  maxLogFiles: 5,
  
  // Rate limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 100,
  
  // WebSocket settings for production
  wsHeartbeatInterval: 30000,
  wsMaxPayload: 1024 * 1024, // 1MB
  
  // Render environment detection
  isRender: process.env.RENDER === 'true',
  renderRegion: process.env.RENDER_REGION,
  renderServiceId: process.env.RENDER_SERVICE_ID,
  deployId: process.env.RENDER_GIT_COMMIT
};

/**
 * Initialize production environment
 */
export async function initializeProduction() {
  // Ensure logs directory exists
  const logDir = path.dirname(productionConfig.logFilePath);
  try {
    await fs.mkdir(logDir, { recursive: true });
    console.log(`📁 Created logs directory: ${logDir}`);
  } catch (error) {
    console.warn('⚠️  Could not create log directory:', error.message);
  }
  
  // Log production configuration
  console.log('🚀 Production configuration loaded:');
  console.log(`   - Platform: ${productionConfig.isRender ? 'Render' : 'Other'}`);
  console.log(`   - Region: ${productionConfig.renderRegion || 'Unknown'}`);
  console.log(`   - Service ID: ${productionConfig.renderServiceId || 'Unknown'}`);
  console.log(`   - Deploy ID: ${productionConfig.deployId || 'Unknown'}`);
  console.log(`   - Log Path: ${productionConfig.logFilePath}`);
}

export default productionConfig;
