# Render Deployment Checklist

## Pre-Deployment Checklist ✅

### Code Preparation
- [ ] All code committed to GitHub repository
- [ ] `render.yaml` configuration file added
- [ ] `.renderignore` file created
- [ ] `package.json` updated with deployment scripts
- [ ] Production configuration files added
- [ ] Environment variables documented

### Required Files
- [ ] `render.yaml` - Render service configuration
- [ ] `.renderignore` - Files to exclude from deployment
- [ ] `src/config/production.js` - Production settings
- [ ] Updated `package.json` with Node.js version requirements
- [ ] Health check endpoint configured (`/api/health`)

### Environment Variables
- [ ] `RPC_URL` - Ethereum WebSocket URL (required)
- [ ] `NODE_ENV=production` (automatically set by Render)
- [ ] `PORT` (automatically set by Render)

## Deployment Steps

### 1. GitHub Repository
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Render Dashboard Setup
1. **Sign up/Login**: Go to [render.com](https://render.com)
2. **Connect GitHub**: Link your GitHub account
3. **New Web Service**: 
   - Repository: `your-username/eth-event-listener`
   - Branch: `main`
   - Build Command: `npm install`
   - Start Command: `npm start`

### 3. Configure Environment Variables
In Render dashboard → Environment:
```
RPC_URL = wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID
```

### 4. Deploy
- Click "Create Web Service"
- Wait for build and deployment
- Monitor logs for successful startup

## Post-Deployment Verification

### Health Checks
- [ ] Visit: `https://your-app.onrender.com/api/health`
- [ ] Status should return `200 OK`
- [ ] All checks should show `"status": "ok"`

### API Endpoints
- [ ] `GET /api/health` - Health check ✅
- [ ] `GET /api/stats` - Application statistics ✅
- [ ] `GET /api/metrics` - Performance metrics ✅
- [ ] `GET /api/abis` - List ABIs ✅
- [ ] `POST /api/abis/upload` - Upload ABI ✅

### Functionality Tests
- [ ] Application starts without errors
- [ ] Ethereum provider connects successfully
- [ ] WebSocket connections work
- [ ] Event processing is active
- [ ] File uploads work
- [ ] Static files are served

### Performance Verification
- [ ] Memory usage is stable
- [ ] No memory leaks detected
- [ ] Event processing latency is acceptable
- [ ] WebSocket connections are stable

## Monitoring Setup

### Render Built-in Monitoring
- [ ] Enable email notifications for deployment failures
- [ ] Set up log monitoring in Render dashboard
- [ ] Configure auto-deploy from main branch

### External Monitoring (Optional)
- [ ] Set up UptimeRobot or similar for `/api/health`
- [ ] Configure alerts for downtime
- [ ] Monitor performance metrics via `/api/metrics`

### Custom Monitoring Script
```bash
#!/bin/bash
# monitor.sh
HEALTH_URL="https://your-app.onrender.com/api/health"
if ! curl -f $HEALTH_URL > /dev/null 2>&1; then
  echo "🚨 Application is down!"
  # Add notification logic here
fi
```

## Common Issues & Solutions

### Build Failures
- **Issue**: `npm install` fails
- **Solution**: Check Node.js version in `package.json` engines field

### Startup Failures
- **Issue**: Application won't start
- **Solution**: Check environment variables, especially `RPC_URL`

### WebSocket Issues
- **Issue**: Ethereum connection fails
- **Solution**: Verify RPC URL is WebSocket (wss://) and accessible

### Memory Issues
- **Issue**: High memory usage
- **Solution**: Upgrade to Standard plan, optimize batch sizes

### Sleep Mode (Free Tier)
- **Issue**: App sleeps after 15 minutes
- **Solution**: Upgrade to paid plan for 24/7 operation

## Success Indicators

Your deployment is successful when:
- ✅ Build completes without errors
- ✅ Application starts and shows initialization logs
- ✅ Health check returns HTTP 200
- ✅ Ethereum provider connects successfully
- ✅ WebSocket server accepts connections
- ✅ Event processing begins automatically
- ✅ All API endpoints respond correctly
- ✅ No critical errors in logs

## Scaling Considerations

### Free Tier Limitations
- Sleeps after 15 minutes of inactivity
- 750 hours/month limit
- Shared CPU and 512MB RAM

### Recommended Upgrades
- **Starter to Standard**: $7/month for always-on service
- **Standard to Pro**: $25/month for dedicated CPU and more RAM

### When to Upgrade
- High-volume Ethereum events (>1000 events/hour)
- Need for 24/7 uptime
- Multiple WebSocket connections
- Large ABI collections

## Support Resources

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Render Community**: [community.render.com](https://community.render.com)
- **Application Logs**: Available in Render dashboard
- **Health Endpoint**: Monitor via `/api/health`
- **Stats Endpoint**: Detailed metrics via `/api/stats`

🎉 **Congratulations!** Your Ethereum Event Listener is now deployed on Render!
