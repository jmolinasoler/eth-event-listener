# Instrucciones para Asistentes de IA

Este documento proporciona contexto y guías para asistentes de IA (como GitHub Copilot, ChatGPT, Claude, etc.) que trabajen en este proyecto.

---

## 📋 Contexto del Proyecto

### Propósito
**Ethereum Event Listener** es una aplicación Node.js que escucha y procesa eventos de contratos inteligentes en blockchain de Ethereum en tiempo real.

### Stack Tecnológico
- **Runtime**: Node.js 18+ (ES Modules)
- **Framework Web**: Express 5
- **Blockchain**: Ethers.js v6
- **WebSockets**: ws library
- **Testing**: Node.js native test runner
- **Storage**: Sistema de archivos (JSON files) → Migrar a PostgreSQL/Redis

### Arquitectura Actual
El proyecto sigue **Clean Architecture** con separación de capas:
```
src/
├── controllers/     # Manejo de peticiones HTTP
├── services/        # Lógica de negocio
├── repositories/    # Acceso a datos
└── server.js        # Entry point
```

---

## 🎯 Principios de Desarrollo

### 1. Clean Architecture
- **Mantener separación de capas**: Controllers → Services → Repositories
- **Dependency Injection**: Pasar dependencias en constructores
- **Interfaces claras**: Cada capa debe tener responsabilidades bien definidas

```javascript
// ✅ CORRECTO
class AbiService {
    constructor(abiRepository, webSocketService) {
        this.abiRepository = abiRepository;
        this.webSocketService = webSocketService;
    }
}

// ❌ INCORRECTO - No instanciar dependencias internamente
class AbiService {
    constructor() {
        this.abiRepository = new AbiRepository(); // ❌
    }
}
```

### 2. ES Modules (no CommonJS)
```javascript
// ✅ CORRECTO
import { ethers } from 'ethers';
export class MyClass { }

// ❌ INCORRECTO
const ethers = require('ethers'); // ❌
module.exports = MyClass; // ❌
```

### 3. Testing First
- Crear tests antes o junto con el código
- Usar `node:test` y `node:assert` (nativos de Node.js)
- Mock de dependencias para unit tests

```javascript
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

describe('AbiService', () => {
    it('should load ABI successfully', async () => {
        const mockRepo = { save: mock.fn() };
        const service = new AbiService(mockRepo, {});
        
        await service.loadAbi('0x123', []);
        assert.strictEqual(mockRepo.save.mock.calls.length, 1);
    });
});
```

---

## 🔧 Reglas de Código

### Naming Conventions
- **Classes**: PascalCase (`AbiService`, `EthereumService`)
- **Files**: PascalCase for classes (`AbiService.js`), camelCase for utilities (`validators.js`)
- **Functions/Variables**: camelCase (`loadAbi`, `ethereumService`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `DEFAULT_PORT`)

### Error Handling
```javascript
// ✅ Crear errores personalizados
export class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

// ✅ Usar try-catch en funciones async
async function loadAbi(address) {
    try {
        const abi = await fs.readFile(`${address}.json`);
        return JSON.parse(abi);
    } catch (error) {
        logger.error(`Failed to load ABI: ${error.message}`);
        throw new ValidationError('Invalid ABI file', 'abi');
    }
}

// ✅ Wrapper para async routes
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
```

### Logging
```javascript
// ❌ EVITAR console.log directo
console.log('Event received'); // ❌

// ✅ Usar sistema de logging estructurado
logger.info('Event received', { 
    blockNumber, 
    address, 
    eventName 
});
```

### Configuración
```javascript
// ❌ EVITAR process.env directo en código
const port = process.env.PORT || 3000; // ❌

// ✅ Centralizar configuración
// config/environment.js
export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    rpcUrl: process.env.RPC_URL,
    // ...
};
```

---

## 🛠️ Tareas Comunes

### Agregar un Nuevo Endpoint

1. **Crear método en Service**:
```javascript
// src/services/AbiService.js
async searchAbis(query) {
    const allAbis = await this.abiRepository.getAll();
    return allAbis.filter(abi => 
        abi.address.includes(query.toLowerCase())
    );
}
```

2. **Agregar método en Controller**:
```javascript
// src/controllers/AbiController.js
async search(req, res) {
    try {
        const { query } = req.query;
        const results = await this.abiService.searchAbis(query);
        res.json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
```

3. **Registrar ruta en server.js**:
```javascript
app.get('/api/abis/search', (req, res) => abiController.search(req, res));
```

4. **Crear test**:
```javascript
// src/controllers/AbiController.test.js
it('should search ABIs by query', async () => {
    const mockService = {
        searchAbis: mock.fn(async () => [{ address: '0x123' }])
    };
    const controller = new AbiController(mockService);
    
    const req = { query: { query: '0x123' } };
    const res = { json: mock.fn() };
    
    await controller.search(req, res);
    assert.strictEqual(res.json.mock.calls[0].arguments[0].success, true);
});
```

### Agregar Nueva Validación

```javascript
// src/utils/validators.js
export function validateBlockNumber(blockNumber) {
    if (!Number.isInteger(blockNumber) || blockNumber < 0) {
        throw new ValidationError(
            'Block number must be a non-negative integer',
            'blockNumber'
        );
    }
    return true;
}

// Usar en Service
import { validateBlockNumber } from '../utils/validators.js';

async getBlockEvents(blockNumber) {
    validateBlockNumber(blockNumber);
    // ... resto del código
}
```

### Agregar Métrica

```javascript
// src/utils/metrics.js
this.abiUploads = new prometheus.Counter({
    name: 'abi_uploads_total',
    help: 'Total number of ABI uploads',
    labelNames: ['success']
});

// Usar en Service
metrics.abiUploads.inc({ success: 'true' });
```

---

## 🔒 Seguridad

### Checklist para Nuevo Código
- [ ] ¿Valida todas las entradas del usuario?
- [ ] ¿Sanitiza datos antes de usar en queries?
- [ ] ¿Maneja errores sin exponer información sensible?
- [ ] ¿Usa rate limiting para endpoints públicos?
- [ ] ¿No loguea información sensible (API keys, RPC URLs completas)?
- [ ] ¿Valida tamaños de archivos?
- [ ] ¿Valida tipos de contenido?

### Validaciones Requeridas
```javascript
// Direcciones Ethereum
import { ethers } from 'ethers';
const validAddress = ethers.getAddress(userInput); // Lanza error si inválido

// Archivos
const allowedMimeTypes = ['application/json'];
if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new ValidationError('Invalid file type');
}

// Tamaño de archivos
const MAX_SIZE = 1024 * 1024; // 1MB
if (file.size > MAX_SIZE) {
    throw new ValidationError('File too large');
}
```

---

## 🧪 Testing Guidelines

### Estructura de Tests
```javascript
import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

describe('ComponentName', () => {
    let instance;
    
    beforeEach(() => {
        // Setup antes de cada test
        instance = new ComponentName();
    });

    describe('methodName', () => {
        it('should do something when condition', async () => {
            // Arrange
            const input = 'test';
            
            // Act
            const result = await instance.methodName(input);
            
            // Assert
            assert.strictEqual(result, 'expected');
        });

        it('should throw error when invalid input', async () => {
            await assert.rejects(
                async () => await instance.methodName(null),
                { name: 'ValidationError' }
            );
        });
    });
});
```

### Mocking
```javascript
// Mock de función
const mockFn = mock.fn(async (address) => ({ address, abi: [] }));

// Mock de objeto completo
const mockRepository = {
    save: mock.fn(),
    get: mock.fn(async () => []),
    delete: mock.fn()
};

// Verificar llamadas
assert.strictEqual(mockFn.mock.calls.length, 1);
assert.deepStrictEqual(mockFn.mock.calls[0].arguments, ['0x123']);
```

---

## 📦 Dependencias

### Agregar Nueva Dependencia
```bash
# Producción
npm install package-name

# Desarrollo
npm install --save-dev package-name
```

**Antes de agregar, preguntarse:**
1. ¿Es realmente necesaria?
2. ¿Está mantenida activamente?
3. ¿Tiene vulnerabilidades conocidas? (`npm audit`)
4. ¿Hay alternativas más ligeras?

### Dependencias Aprobadas
- **Web**: express, ws
- **Blockchain**: ethers
- **Utilities**: dotenv
- **File Upload**: multer
- **Testing**: native node:test (no se requieren librerías externas)

### Dependencias a Considerar (según MEJORAS_ARQUITECTURA.md)
- **Database**: pg (PostgreSQL), ioredis (Redis)
- **Logging**: winston
- **Metrics**: prom-client
- **Queues**: bullmq
- **Validation**: joi o zod

---

## 🚀 Deployment

### Variables de Entorno Requeridas
```bash
# .env
RPC_URL=wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID
PORT=3000
NODE_ENV=production

# Opcionales (según mejoras)
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
LOG_LEVEL=info
MAX_FILE_SIZE=1048576
```

### Pre-deployment Checklist
- [ ] Tests pasan (`npm test`)
- [ ] No hay vulnerabilidades críticas (`npm audit`)
- [ ] Variables de entorno configuradas en Render
- [ ] Logs estructurados implementados
- [ ] Health check endpoint disponible (`/health`)

---

## 🐛 Debugging

### Logs
```javascript
// Desarrollo
logger.debug('Detailed debug info', { data });

// Producción
logger.info('User action', { userId, action });
logger.error('Operation failed', { error: error.message, stack: error.stack });
```

### Common Issues

**WebSocket desconecta frecuentemente**
- Verificar estabilidad del RPC provider
- Implementar reconnection logic con backoff exponencial
- Revisar rate limits del provider

**Eventos no se decodifican**
- Verificar que el ABI está cargado para esa dirección
- Confirmar que el ABI contiene el evento emitido
- Revisar logs para errores de parsing

**Performance degradado**
- Revisar número de clientes WebSocket conectados
- Verificar memoria heap (`process.memoryUsage()`)
- Considerar implementar event queue (BullMQ)

---

## 📚 Recursos

### Documentación Oficial
- [Node.js Documentation](https://nodejs.org/docs/latest-v18.x/api/)
- [Ethers.js v6](https://docs.ethers.org/v6/)
- [Express.js](https://expressjs.com/)

### Ejemplos de Clean Architecture en Node.js
- Ver estructura actual en `src/`
- Referencia: [Domain-Driven Hexagon](https://github.com/Sairyss/domain-driven-hexagon)

---

## ✅ Pre-commit Checklist

Antes de hacer commit, verificar:

- [ ] Código sigue ES Modules syntax
- [ ] No hay `console.log` (usar `logger`)
- [ ] Variables de entorno usan `config` centralizado
- [ ] Errores tienen manejo apropiado
- [ ] Tests creados/actualizados
- [ ] Tests pasan (`npm test`)
- [ ] No hay secretos hardcodeados
- [ ] Nombres descriptivos y convención consistente
- [ ] Código documentado si es complejo

---

## 🤖 Prompts Útiles para IA

### Cuando necesites ayuda, usa estos prompts:

**Crear nuevo endpoint:**
> "Necesito crear un endpoint GET `/api/events/:blockNumber` que retorne todos los eventos de un bloque específico. Debe seguir Clean Architecture: service method, controller method, route registration, y tests."

**Refactorizar código:**
> "Este código usa console.log directo. Refactoriza para usar el sistema de logging estructurado de winston con niveles apropiados."

**Agregar validación:**
> "Agrega validación robusta para direcciones Ethereum usando ethers.js, con error handling apropiado y tests."

**Implementar mejora de arquitectura:**
> "Implementa el sistema de métricas con Prometheus según se describe en MEJORAS_ARQUITECTURA.md sección 3.2, incluyendo métricas para eventos procesados y conexiones activas."

---

## 📝 Notas Finales

- **Prioriza legibilidad sobre brevedad**: Código claro > Código "clever"
- **Tests son documentación**: Escribe tests que expliquen el comportamiento esperado
- **Fail fast**: Validar inputs temprano y lanzar errores descriptivos
- **Async/await everywhere**: No usar callbacks ni mezclar con Promises
- **Immutability**: Preferir `const` sobre `let`, evitar mutaciones directas

**Recuerda**: El objetivo es código mantenible, escalable y seguro. Si tienes dudas, consulta `MEJORAS_ARQUITECTURA.md` para el roadmap completo.
