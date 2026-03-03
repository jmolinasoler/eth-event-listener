# Plan de Mejoras de Arquitectura y Sostenibilidad

## Resumen Ejecutivo

Este documento detalla las mejoras necesarias para hacer la aplicación **Ethereum Event Listener** más sostenible, escalable y segura. La aplicación actualmente sigue Clean Architecture pero requiere mejoras en seguridad, rendimiento, observabilidad y escalabilidad.

---

## 1. SEGURIDAD

### 1.1 Variables de Entorno y Secretos
**Problema Actual:**
- El archivo `.env` existe pero no hay validación robusta
- No hay gestión de secretos en producción
- Credenciales potencialmente expuestas en logs

**Mejoras Requeridas:**
```javascript
// Crear src/config/environment.js
import dotenv from 'dotenv';

class EnvironmentConfig {
    constructor() {
        dotenv.config();
        this.validate();
    }

    validate() {
        const required = ['RPC_URL'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }

        // Validar formato de RPC_URL
        if (!this.rpcUrl.startsWith('wss://') && !this.rpcUrl.startsWith('ws://')) {
            console.warn('⚠️  RPC_URL should use WebSocket protocol (wss:// or ws://)');
        }
    }

    get rpcUrl() { return process.env.RPC_URL; }
    get port() { return parseInt(process.env.PORT || '3000', 10); }
    get nodeEnv() { return process.env.NODE_ENV || 'development'; }
    get maxFileSize() { return parseInt(process.env.MAX_FILE_SIZE || '1048576', 10); }
    get rateLimitWindow() { return parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10); }
    get rateLimitMax() { return parseInt(process.env.RATE_LIMIT_MAX || '100', 10); }
}

export const config = new EnvironmentConfig();
```

**Implementación:**
- Usar servicios como AWS Secrets Manager, HashiCorp Vault, o Render's Secret Management
- Nunca loguear credenciales o RPC URLs completas
- Implementar rotación automática de API keys

### 1.2 Validación de Entrada
**Problema Actual:**
- Validación básica de archivos JSON
- No hay sanitización de direcciones Ethereum
- Falta validación de tamaño de ABI

**Mejoras Requeridas:**
```javascript
// Crear src/utils/validators.js
import { ethers } from 'ethers';

export class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

export function validateEthereumAddress(address) {
    if (!address || typeof address !== 'string') {
        throw new ValidationError('Address is required and must be a string', 'address');
    }

    try {
        return ethers.getAddress(address); // Retorna checksum address
    } catch (error) {
        throw new ValidationError('Invalid Ethereum address format', 'address');
    }
}

export function validateABI(abi) {
    if (!Array.isArray(abi)) {
        throw new ValidationError('ABI must be an array', 'abi');
    }

    if (abi.length === 0) {
        throw new ValidationError('ABI cannot be empty', 'abi');
    }

    // Validar estructura básica de ABI
    const hasValidStructure = abi.every(item => 
        typeof item === 'object' && 
        item !== null &&
        'type' in item
    );

    if (!hasValidStructure) {
        throw new ValidationError('Invalid ABI structure', 'abi');
    }

    // Verificar que hay al menos un evento
    const hasEvents = abi.some(item => item.type === 'event');
    if (!hasEvents) {
        console.warn('⚠️  ABI does not contain any events');
    }

    return true;
}

export function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 255);
}
```

### 1.3 Rate Limiting y Protección DDoS
**Mejoras Requeridas:**
```javascript
// Crear src/middleware/rateLimiter.js
import { config } from '../config/environment.js';

class RateLimiter {
    constructor(windowMs, maxRequests) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.clients = new Map();
    }

    middleware() {
        return (req, res, next) => {
            const clientId = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            
            if (!this.clients.has(clientId)) {
                this.clients.set(clientId, { count: 1, resetTime: now + this.windowMs });
                return next();
            }

            const client = this.clients.get(clientId);
            
            if (now > client.resetTime) {
                client.count = 1;
                client.resetTime = now + this.windowMs;
                return next();
            }

            if (client.count >= this.maxRequests) {
                return res.status(429).json({
                    error: 'Too many requests',
                    retryAfter: Math.ceil((client.resetTime - now) / 1000)
                });
            }

            client.count++;
            next();
        };
    }

    // Limpieza periódica de clientes expirados
    cleanup() {
        const now = Date.now();
        for (const [clientId, client] of this.clients.entries()) {
            if (now > client.resetTime) {
                this.clients.delete(clientId);
            }
        }
    }
}

export const rateLimiter = new RateLimiter(
    config.rateLimitWindow,
    config.rateLimitMax
);

// Ejecutar limpieza cada 5 minutos
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
```

### 1.4 CORS y Headers de Seguridad
**Mejoras Requeridas:**
```javascript
// Crear src/middleware/security.js
export function setupSecurityHeaders(app) {
    // CORS configuración
    app.use((req, res, next) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        const origin = req.headers.origin;
        
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            res.setHeader('Access-Control-Allow-Origin', origin || '*');
        }
        
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    });

    // Security Headers
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
        next();
    });
}
```

---

## 2. ESCALABILIDAD

### 2.1 Base de Datos en lugar de Sistema de Archivos
**Problema Actual:**
- ABIs almacenadas como archivos JSON en disco
- No escalable en entornos distribuidos
- Sin transacciones ni atomicidad

**Mejoras Requeridas:**

**Opción A: PostgreSQL (Recomendado para producción)**
```javascript
// src/repositories/AbiRepository.postgres.js
import pg from 'pg';

export class PostgresAbiRepository {
    constructor(connectionString) {
        this.pool = new pg.Pool({ connectionString });
    }

    async init() {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS abis (
                address VARCHAR(42) PRIMARY KEY,
                abi JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_abis_created_at ON abis(created_at);
        `);
    }

    async save(address, abi) {
        await this.pool.query(
            `INSERT INTO abis (address, abi) 
             VALUES ($1, $2) 
             ON CONFLICT (address) 
             DO UPDATE SET abi = $2, updated_at = NOW()`,
            [address, JSON.stringify(abi)]
        );
    }

    async get(address) {
        const result = await this.pool.query(
            'SELECT abi FROM abis WHERE address = $1',
            [address]
        );
        return result.rows[0]?.abi || null;
    }

    async getAll() {
        const result = await this.pool.query('SELECT address, abi FROM abis ORDER BY created_at DESC');
        return result.rows;
    }

    async delete(address) {
        await this.pool.query('DELETE FROM abis WHERE address = $1', [address]);
    }
}
```

**Opción B: Redis (Para caché y alta velocidad)**
```javascript
// src/repositories/AbiRepository.redis.js
import { createClient } from 'redis';

export class RedisAbiRepository {
    constructor(redisUrl) {
        this.client = createClient({ url: redisUrl });
        this.client.on('error', err => console.error('Redis Client Error', err));
    }

    async connect() {
        await this.client.connect();
    }

    async save(address, abi) {
        await this.client.set(`abi:${address}`, JSON.stringify(abi));
        await this.client.sAdd('abi:addresses', address);
    }

    async get(address) {
        const abi = await this.client.get(`abi:${address}`);
        return abi ? JSON.parse(abi) : null;
    }

    async getAll() {
        const addresses = await this.client.sMembers('abi:addresses');
        const abis = await Promise.all(
            addresses.map(async addr => ({
                address: addr,
                abi: await this.get(addr)
            }))
        );
        return abis;
    }

    async delete(address) {
        await this.client.del(`abi:${address}`);
        await this.client.sRem('abi:addresses', address);
    }
}
```

### 2.2 Sistema de Colas para Procesamiento de Eventos
**Problema Actual:**
- Procesamiento sincrónico de eventos puede causar cuellos de botella
- Sin retry logic para eventos fallidos
- Puede perder eventos si el servidor se cae

**Mejoras Requeridas:**
```javascript
// src/services/QueueService.js
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

export class EventQueueService {
    constructor(redisConnection) {
        this.connection = new Redis(redisConnection);
        this.queue = new Queue('ethereum-events', { connection: this.connection });
        this.setupWorker();
    }

    async addEvent(event) {
        await this.queue.add('process-event', event, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            }
        });
    }

    setupWorker() {
        this.worker = new Worker('ethereum-events', async job => {
            const event = job.data;
            // Procesar el evento (broadcast, guardar en DB, etc.)
            await this.processEvent(event);
        }, {
            connection: this.connection,
            concurrency: 10 // Procesar 10 eventos en paralelo
        });

        this.worker.on('completed', job => {
            console.log(`✓ Event ${job.id} processed successfully`);
        });

        this.worker.on('failed', (job, err) => {
            console.error(`✗ Event ${job.id} failed:`, err);
        });
    }

    async processEvent(event) {
        // Implementar lógica de procesamiento
        // Por ejemplo: guardar en BD, enviar a webhooks, etc.
    }
}
```

### 2.3 Arquitectura Horizontal Scaling
**Mejoras Requeridas:**

```yaml
# docker-compose.yml para arquitectura escalable
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: eth_events
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  app:
    build: .
    environment:
      NODE_ENV: production
      RPC_URL: ${RPC_URL}
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/eth_events
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3  # Múltiples instancias
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

---

## 3. OBSERVABILIDAD Y MONITOREO

### 3.1 Sistema de Logging Estructurado
**Problema Actual:**
- Logs con `console.log` sin estructura
- No hay niveles de log
- Difícil de buscar y analizar

**Mejoras Requeridas:**
```javascript
// src/utils/logger.js
import winston from 'winston';

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

const transports = [
    new winston.transports.Console(),
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
    }),
    new winston.transports.File({ filename: 'logs/all.log' }),
];

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports,
});
```

### 3.2 Métricas y Monitoreo
**Mejoras Requeridas:**
```javascript
// src/utils/metrics.js
import prometheus from 'prom-client';

export class MetricsService {
    constructor() {
        this.register = new prometheus.Registry();
        
        // Métricas por defecto
        prometheus.collectDefaultMetrics({ register: this.register });

        // Métricas personalizadas
        this.eventsProcessed = new prometheus.Counter({
            name: 'ethereum_events_processed_total',
            help: 'Total number of Ethereum events processed',
            labelNames: ['contract_address', 'event_name']
        });

        this.eventProcessingDuration = new prometheus.Histogram({
            name: 'ethereum_event_processing_duration_seconds',
            help: 'Duration of event processing',
            buckets: [0.1, 0.5, 1, 2, 5]
        });

        this.activeWebSocketConnections = new prometheus.Gauge({
            name: 'websocket_connections_active',
            help: 'Number of active WebSocket connections'
        });

        this.blockHeight = new prometheus.Gauge({
            name: 'ethereum_block_height',
            help: 'Current Ethereum block height'
        });

        this.rpcErrors = new prometheus.Counter({
            name: 'rpc_errors_total',
            help: 'Total number of RPC errors',
            labelNames: ['error_type']
        });

        // Registrar todas las métricas
        this.register.registerMetric(this.eventsProcessed);
        this.register.registerMetric(this.eventProcessingDuration);
        this.register.registerMetric(this.activeWebSocketConnections);
        this.register.registerMetric(this.blockHeight);
        this.register.registerMetric(this.rpcErrors);
    }

    getMetrics() {
        return this.register.metrics();
    }
}

export const metrics = new MetricsService();
```

### 3.3 Health Checks Mejorados
**Mejoras Requeridas:**
```javascript
// src/middleware/healthCheck.js
export class HealthCheckService {
    constructor(ethereumService, abiRepository) {
        this.ethereumService = ethereumService;
        this.abiRepository = abiRepository;
    }

    async check() {
        const checks = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {}
        };

        // Check Ethereum connection
        try {
            if (this.ethereumService.provider) {
                const blockNumber = await this.ethereumService.provider.getBlockNumber();
                checks.services.ethereum = {
                    status: 'connected',
                    blockNumber,
                    rpcUrl: this.ethereumService.rpcUrl.split('/').slice(0, 3).join('/')
                };
            } else {
                checks.services.ethereum = { status: 'not_configured' };
            }
        } catch (error) {
            checks.services.ethereum = { status: 'error', error: error.message };
            checks.status = 'degraded';
        }

        // Check ABI Repository
        try {
            const abis = await this.abiRepository.getAll();
            checks.services.abiRepository = {
                status: 'operational',
                loadedAbis: abis.length
            };
        } catch (error) {
            checks.services.abiRepository = { status: 'error', error: error.message };
            checks.status = 'degraded';
        }

        // Memory usage
        const memUsage = process.memoryUsage();
        checks.memory = {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`
        };

        return checks;
    }
}
```

---

## 4. MANEJO DE ERRORES Y RESILIENCIA

### 4.1 Circuit Breaker Pattern
**Mejoras Requeridas:**
```javascript
// src/utils/circuitBreaker.js
export class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failureThreshold = threshold;
        this.timeout = timeout;
        this.failureCount = 0;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.nextAttempt = Date.now();
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit breaker is OPEN');
            }
            this.state = 'HALF_OPEN';
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.error(`Circuit breaker opened. Will retry after ${this.timeout}ms`);
        }
    }
}
```

### 4.2 Manejo Global de Errores
**Mejoras Requeridas:**
```javascript
// src/middleware/errorHandler.js
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/validators.js';

export function errorHandler(err, req, res, next) {
    logger.error(`Error: ${err.message}`, {
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });

    if (err instanceof ValidationError) {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message,
            field: err.field
        });
    }

    if (err.name === 'MulterError') {
        return res.status(400).json({
            error: 'File Upload Error',
            message: err.message
        });
    }

    // Error por defecto
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred' 
            : err.message
    });
}

export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
```

---

## 5. TESTING Y CALIDAD DE CÓDIGO

### 5.1 Cobertura de Tests
**Mejoras Requeridas:**
```javascript
// Agregar tests de integración
// tests/integration/api.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startTestServer, stopTestServer } from './testServer.js';

describe('API Integration Tests', () => {
    let server;
    let baseUrl;

    before(async () => {
        const result = await startTestServer();
        server = result.server;
        baseUrl = result.url;
    });

    after(async () => {
        await stopTestServer(server);
    });

    it('should return health status', async () => {
        const response = await fetch(`${baseUrl}/health`);
        const data = await response.json();
        assert.strictEqual(data.status, 'healthy');
    });

    it('should list ABIs', async () => {
        const response = await fetch(`${baseUrl}/api/abis`);
        const data = await response.json();
        assert.strictEqual(data.success, true);
        assert.ok(Array.isArray(data.abis));
    });
});
```

### 5.2 Linting y Formateo
**Mejoras Requeridas:**
```json
// .eslintrc.json
{
  "env": {
    "es2022": true,
    "node": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

---

## 6. CONFIGURACIÓN Y DEPLOYMENT

### 6.1 Gestión de Configuración por Ambiente
**Mejoras Requeridas:**
```javascript
// config/environments/production.js
export default {
    server: {
        port: process.env.PORT || 3000,
        trustProxy: true
    },
    ethereum: {
        rpcUrl: process.env.RPC_URL,
        reconnectInterval: 5000,
        maxReconnectAttempts: 10
    },
    database: {
        url: process.env.DATABASE_URL,
        pool: {
            min: 2,
            max: 10
        }
    },
    redis: {
        url: process.env.REDIS_URL
    },
    logging: {
        level: 'info'
    },
    security: {
        rateLimitWindow: 60000,
        rateLimitMax: 100,
        maxFileSize: 1048576
    }
};
```

### 6.2 CI/CD Pipeline
**Mejoras Requeridas:**
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run tests
      run: npm test
    
    - name: Run security audit
      run: npm audit --audit-level=moderate

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to Render
      uses: render-deploy/github-action@v1
      with:
        service-id: ${{ secrets.RENDER_SERVICE_ID }}
        api-key: ${{ secrets.RENDER_API_KEY }}
```

---

## 7. DOCUMENTACIÓN

### 7.1 API Documentation con OpenAPI
**Mejoras Requeridas:**
```yaml
# openapi.yml
openapi: 3.0.0
info:
  title: Ethereum Event Listener API
  version: 1.0.0
  description: API for managing Ethereum contract ABIs and monitoring events

servers:
  - url: http://localhost:3000
    description: Development server

paths:
  /health:
    get:
      summary: Health check endpoint
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  timestamp:
                    type: string

  /api/abis:
    get:
      summary: List all loaded ABIs
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  abis:
                    type: array
                    items:
                      type: object
```

---

## 8. PRIORIZACIÓN DE IMPLEMENTACIÓN

### Fase 1: Seguridad Crítica (1-2 semanas)
1. ✅ Validación de entrada robusta
2. ✅ Rate limiting
3. ✅ Headers de seguridad
4. ✅ Gestión de secretos

### Fase 2: Observabilidad (1 semana)
1. ✅ Sistema de logging estructurado
2. ✅ Health checks mejorados
3. ✅ Métricas básicas

### Fase 3: Escalabilidad Base (2-3 semanas)
1. ✅ Migración a PostgreSQL
2. ✅ Sistema de colas
3. ✅ Circuit breaker

### Fase 4: Calidad y DevOps (1-2 semanas)
1. ✅ Tests de integración
2. ✅ CI/CD pipeline
3. ✅ Documentación API

### Fase 5: Escalabilidad Avanzada (2-3 semanas)
1. ✅ Docker/Kubernetes setup
2. ✅ Load balancing
3. ✅ Auto-scaling

---

## 9. MÉTRICAS DE ÉXITO

### KPIs a Monitorear
- **Disponibilidad**: >99.9% uptime
- **Latencia**: <500ms para procesar eventos
- **Throughput**: >1000 eventos/segundo
- **Error Rate**: <0.1%
- **Cobertura de Tests**: >80%
- **Tiempo de Recovery**: <5 minutos

---

## 10. COSTOS ESTIMADOS

### Infraestructura Mensual (Estimación)
- **Render.com (App)**: $7-25/mes
- **PostgreSQL**: $7-15/mes
- **Redis**: $5-10/mes (opcional)
- **Logging (Datadog/LogDNA)**: $0-50/mes
- **Total**: ~$20-100/mes (dependiendo del tráfico)

---

## Conclusión

Estas mejoras transformarán la aplicación de un MVP funcional a un sistema production-ready que puede escalar horizontalmente, es seguro por defecto, y proporciona observabilidad completa. La implementación por fases permite ir agregando valor de forma incremental sin detener el desarrollo.

**Próximos Pasos:**
1. Revisar y priorizar mejoras con el equipo
2. Crear tickets/issues en GitHub
3. Implementar Fase 1 (Seguridad Crítica)
4. Establecer métricas baseline
5. Iterar basándose en feedback y datos
