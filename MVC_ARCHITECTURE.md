# MVC Architecture Documentation

## Overview
The Ethereum Event Listener has been refactored to follow the Model-View-Controller (MVC) architectural pattern for improved scalability, maintainability, and code organization.

## Project Structure

```
eth-event-listener/
├── index.js                    # Application entry point
├── src/
│   ├── Application.js          # Main application orchestrator
│   ├── config/
│   │   └── index.js           # Configuration management
│   ├── models/
│   │   └── AbiRegistry.js     # ABI data model
│   ├── services/
│   │   ├── AbiManager.js      # ABI file management service
│   │   ├── EventLogger.js     # Event processing and logging service
│   │   ├── EthereumProvider.js # Ethereum connection service
│   │   └── WebSocketManager.js # WebSocket client management service
│   ├── controllers/
│   │   ├── AbiController.js   # ABI HTTP endpoints controller
│   │   └── StatsController.js # Statistics and health endpoints controller
│   ├── routes/
│   │   └── index.js          # Route definitions and middleware
│   └── utils/
│       └── GracefulShutdown.js # Graceful shutdown utility
├── abis/                      # ABI files storage
├── public/                    # Static web assets
└── events.log                 # Event logs file
```

## Architecture Components

### 📊 **Models**
- **AbiRegistry**: Manages contract ABI storage and retrieval with optimized caching

### 🔧 **Services**
- **AbiManager**: Handles ABI file operations (load, save, delete, validate)
- **EventLogger**: Processes and logs Ethereum events with buffering
- **EthereumProvider**: Manages WebSocket connection to Ethereum network
- **WebSocketManager**: Handles client connections and broadcasting

### 🎮 **Controllers**
- **AbiController**: HTTP endpoints for ABI management
- **StatsController**: Statistics, health checks, and metrics endpoints

### 🌐 **Views**
- Static files served from `public/` directory
- Real-time updates via WebSocket connections

### ⚙️ **Configuration**
- Centralized configuration in `src/config/index.js`
- Environment variable management
- Path resolution for cross-platform compatibility

## API Endpoints

### ABI Management
- `GET /api/abis` - List all loaded ABIs
- `GET /api/abis/:address` - Get specific ABI
- `POST /api/abis` - Add ABI via JSON
- `POST /api/abis/upload` - Upload ABI file
- `DELETE /api/abis/:address` - Remove ABI

### Monitoring
- `GET /api/stats` - Comprehensive application statistics
- `GET /api/health` - Health check with HTTP status codes
- `GET /api/metrics` - Lightweight metrics endpoint

## Key Features

### 🚀 **Performance Optimizations**
- Batch event processing
- Buffered file I/O
- Connection pooling
- Memory leak prevention

### 🔄 **Reliability**
- Graceful shutdown handling
- Automatic reconnection with exponential backoff
- Error isolation and recovery
- Health monitoring

### 📈 **Scalability**
- Modular component architecture
- Service layer abstraction
- Dependency injection pattern
- Clear separation of concerns

### 🔍 **Observability**
- Comprehensive statistics tracking
- Real-time health monitoring
- Performance metrics
- Error tracking and reporting

## Configuration Options

```javascript
{
  port: 3000,                    // Server port
  rpcUrl: "wss://...",          // Ethereum WebSocket URL
  maxReconnectAttempts: 5,      // Connection retry limit
  reconnectDelay: 5000,         // Base reconnection delay (ms)
  batchSize: 100,               // Event processing batch size
  logBufferSize: 50,            // File write buffer size
  maxFileSize: 1048576,         // Upload limit (1MB)
  connectionTimeout: 10000,     // WebSocket timeout (ms)
  maxErrorsBeforeUnhealthy: 10  // Health check threshold
}
```

## Benefits of MVC Architecture

### 🎯 **Maintainability**
- Clear separation of concerns
- Single responsibility principle
- Easy to locate and modify functionality
- Reduced code coupling

### 🔧 **Scalability**
- Easy to add new features
- Service layer allows for microservice migration
- Component-based testing
- Horizontal scaling possibilities

### 🧪 **Testability**
- Isolated components for unit testing
- Dependency injection for mocking
- Clear interfaces between layers
- Integration testing capabilities

### 👥 **Team Development**
- Clear code organization for multiple developers
- Well-defined component boundaries
- Consistent patterns and conventions
- Easy onboarding for new team members

## Development Guidelines

### Adding New Features
1. **Models**: Add data structures to `src/models/`
2. **Services**: Implement business logic in `src/services/`
3. **Controllers**: Create HTTP handlers in `src/controllers/`
4. **Routes**: Define endpoints in `src/routes/`

### Best Practices
- Follow single responsibility principle
- Use dependency injection for services
- Implement proper error handling
- Add comprehensive logging
- Write unit tests for each component
- Document public APIs

## Migration Notes

### Breaking Changes
- **None** - All existing functionality preserved
- API endpoints remain unchanged
- WebSocket protocol unchanged
- File structure maintains backward compatibility

### New Capabilities
- Enhanced error handling and recovery
- Improved performance monitoring
- Better resource management
- Graceful shutdown procedures
- Comprehensive health checks

## Performance Improvements

### Before MVC Refactor
- Monolithic structure with tight coupling
- Limited error isolation
- Basic monitoring capabilities
- Manual resource management

### After MVC Refactor
- Modular architecture with loose coupling
- Enhanced error isolation and recovery
- Comprehensive monitoring and metrics
- Automated resource management
- Improved scalability and maintainability

The MVC refactor maintains all original optimizations while adding a clean, scalable architecture that will support future growth and feature development.
