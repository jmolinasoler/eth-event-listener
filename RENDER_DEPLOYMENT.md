# Render Deployment Guide

## Overview
This guide will walk you through deploying the Ethereum Event Listener application to Render, a modern cloud platform that provides seamless deployment for Node.js applications.

## Prerequisites
- [Render account](https://render.com) (free tier available)
- GitHub repository with your code
- Ethereum RPC WebSocket URL (e.g., from Infura, Alchemy, or QuickNode)

## Step 1: Prepare the Application for Render

### 1.1 Create render.yaml (Infrastructure as Code)
```yaml
services:
  - type: web
    name: eth-event-listener
    env: node
    plan: starter # Free tier, upgrade to standard/pro for production
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        fromService:
          type: web
          name: eth-event-listener
          property: port
    disk:
      name: logs
      mountPath: /opt/render/project/src/logs
      sizeGB: 1
```

### 1.2 Update package.json Scripts
Add deployment-specific scripts to package.json:
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js",
    "build": "echo 'No build step required'",
    "health": "curl -f http://localhost:$PORT/api/health || exit 1"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

### 1.3 Create .renderignore File
```
# Development files
.env.local
.env.development
*.log
logs/
.DS_Store
node_modules/.cache

# Documentation
*.md
docs/
.github/

# Test files
test/
tests/
*.test.js
*.spec.js
coverage/
```

## Step 2: Environment Configuration

### 2.1 Required Environment Variables
Set these in Render dashboard or render.yaml:

```bash
# Required
RPC_URL=wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID

# Optional (with defaults)
PORT=10000  # Render will set this automatically
NODE_ENV=production
LOG_LEVEL=info
```

### 2.2 Create Production Config Override
Create `src/config/production.js`:
```javascript
// src/config/production.js
export const productionConfig = {
  // Use persistent disk for logs in production
  logFilePath: process.env.LOG_PATH || '/opt/render/project/src/logs/events.log',
  
  // Render-specific optimizations
  port: process.env.PORT || 10000,
  
  // Production performance settings
  batchSize: 200,
  logBufferSize: 100,
  maxReconnectAttempts: 10,
  reconnectDelay: 2000,
  
  // Health check settings
  maxErrorsBeforeUnhealthy: 20,
  
  // Render platform optimizations
  connectionTimeout: 30000,
  
  // Enable compression
  enableCompression: true,
  
  // Security headers
  securityHeaders: true
};
```

## Step 3: Application Updates for Production

### 3.1 Update Application.js for Production
Add production-specific middleware:

```javascript
// Add to setupMiddleware() method in Application.js
setupMiddleware() {
  // Compression middleware for production
  if (process.env.NODE_ENV === 'production') {
    const compression = await import('compression');
    this.app.use(compression.default());
  }
  
  // Security headers
  this.app.use((req, res, next) => {
    res.header('X-Frame-Options', 'DENY');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  
  // Existing middleware...
}
```

### 3.2 Create Health Check Endpoint Enhancement
Update `src/controllers/StatsController.js`:

```javascript
// Add Render-specific health check
async getRenderHealth(req, res) {
  try {
    const health = await this.getHealth(req, res);
    
    // Render-specific checks
    const renderHealth = {
      ...health,
      render: {
        platform: 'render',
        region: process.env.RENDER_REGION || 'unknown',
        serviceId: process.env.RENDER_SERVICE_ID || 'unknown',
        deployId: process.env.RENDER_GIT_COMMIT || 'unknown'
      }
    };
    
    res.json(renderHealth);
  } catch (error) {
    res.status(503).json({ status: 'error', error: error.message });
  }
}
```

### 3.3 Add Logging Directory Creation
Update config to ensure log directory exists:

```javascript
// Update src/config/index.js
import { promises as fs } from 'fs';

// Ensure logs directory exists
const logDir = path.dirname(config.logFilePath);
try {
  await fs.mkdir(logDir, { recursive: true });
} catch (error) {
  console.warn('Could not create log directory:', error.message);
}
```

## Step 4: Deployment Steps

### 4.1 GitHub Repository Setup
1. Push your code to GitHub:
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 4.2 Render Dashboard Deployment
1. **Log in to Render**: Go to [render.com](https://render.com)
2. **Connect GitHub**: Link your GitHub account
3. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Select your repository
   - Configure settings:
     - **Name**: `eth-event-listener`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: `Starter` (free) or `Standard` (paid)

### 4.3 Environment Variables Configuration
In Render dashboard, add environment variables:
```
RPC_URL = wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID
NODE_ENV = production
LOG_LEVEL = info
```

### 4.4 Custom Domain (Optional)
1. In service settings, go to "Custom Domains"
2. Add your domain
3. Configure DNS records as instructed

## Step 5: Post-Deployment Configuration

### 5.1 Verify Deployment
Check these endpoints after deployment:
- `https://your-app.onrender.com/api/health` - Health check
- `https://your-app.onrender.com/api/stats` - Application statistics
- `https://your-app.onrender.com/api/metrics` - Performance metrics

### 5.2 Monitor Application
1. **Render Logs**: View real-time logs in Render dashboard
2. **Health Monitoring**: Set up external monitoring service
3. **Performance**: Monitor `/api/metrics` endpoint

### 5.3 Set Up Alerts (Optional)
Create monitoring script:
```bash
#!/bin/bash
# monitor.sh
HEALTH_URL="https://your-app.onrender.com/api/health"
WEBHOOK_URL="your-slack-webhook-url"

if ! curl -f $HEALTH_URL > /dev/null 2>&1; then
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚨 Ethereum Event Listener is down!"}' \
    $WEBHOOK_URL
fi
```

## Step 6: Scaling and Optimization

### 6.1 Performance Recommendations
For production workloads:
- Upgrade to **Standard** plan (512MB RAM, dedicated CPU)
- Consider **Pro** plan for high-volume events
- Enable disk persistence for logs

### 6.2 Auto-Deploy Configuration
Enable auto-deploy in Render settings:
1. Go to service settings
2. Enable "Auto-Deploy" from main branch
3. Set up branch protection rules in GitHub

### 6.3 Backup Strategy
Set up periodic backups of important data:
```javascript
// Add to Application.js
async scheduleBackups() {
  setInterval(async () => {
    try {
      // Backup ABI registry
      const abis = this.abiRegistry.getLoadedAbis();
      await fs.writeFile('/opt/render/project/src/logs/abi-backup.json', 
        JSON.stringify(abis, null, 2));
      
      // Backup statistics
      const stats = this.getStats();
      await fs.writeFile('/opt/render/project/src/logs/stats-backup.json', 
        JSON.stringify(stats, null, 2));
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // Daily backups
}
```

## Step 7: Troubleshooting

### 7.1 Common Issues

**WebSocket Connection Fails**:
- Verify RPC_URL is correct and accessible
- Check if provider supports WebSocket connections
- Ensure firewall allows outbound WebSocket connections

**Application Won't Start**:
- Check build logs in Render dashboard
- Verify all dependencies are in package.json
- Check Node.js version compatibility

**High Memory Usage**:
- Monitor `/api/stats` for memory metrics
- Adjust batch sizes in configuration
- Consider upgrading Render plan

**File System Issues**:
- Ensure write permissions for log files
- Check disk space on mounted volume
- Verify file paths are absolute

### 7.2 Debug Commands
Add debug endpoints for troubleshooting:
```javascript
// Add to routes for development debugging
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/env', (req, res) => {
    res.json({
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      hasRpcUrl: !!process.env.RPC_URL,
      platform: process.platform,
      nodeVersion: process.version
    });
  });
}
```

## Step 8: Cost Optimization

### 8.1 Free Tier Limitations
- **Starter Plan**: Free, but sleeps after 15 minutes of inactivity
- **Spinning down**: May lose WebSocket connections during sleep
- **Solution**: Upgrade to paid plan for 24/7 operation

### 8.2 Resource Monitoring
Monitor resource usage:
- CPU usage via `/api/stats`
- Memory consumption patterns
- Network bandwidth (WebSocket data)
- Disk space for logs

### 8.3 Cost-Effective Strategies
- Use log rotation to manage disk usage
- Implement efficient event filtering
- Optimize batch processing sizes
- Consider regional deployment for lower latency

## Step 9: Security Considerations

### 9.1 Environment Security
- Never commit RPC URLs or API keys
- Use Render's secret management
- Enable HTTPS (automatic on Render)
- Implement rate limiting for public endpoints

### 9.2 Network Security
```javascript
// Add rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

this.app.use('/api/', limiter);
```

## Step 10: Success Checklist

After deployment, verify:
- ✅ Application starts successfully
- ✅ Health check returns 200 status
- ✅ WebSocket connections work
- ✅ Event processing is active
- ✅ Logs are being written
- ✅ All API endpoints respond
- ✅ Static files are served correctly
- ✅ Environment variables are loaded
- ✅ No memory leaks over time
- ✅ Graceful shutdown works

## Render-Specific Benefits

1. **Zero Configuration**: Automatic HTTPS, CDN, and DNS
2. **Git Integration**: Auto-deploy from GitHub commits
3. **Free Tier**: Perfect for development and testing
4. **Scaling**: Easy horizontal and vertical scaling
5. **Monitoring**: Built-in metrics and logging
6. **Persistence**: Optional disk storage for logs
7. **Global CDN**: Fast static asset delivery
8. **Custom Domains**: Easy domain configuration

Your Ethereum Event Listener is now ready for production deployment on Render! 🚀
