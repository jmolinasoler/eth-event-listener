import helmet from 'helmet';
import cors from 'cors';
import { env } from '../config/environment.js';

/**
 * Security middleware configuration
 * Implements CORS, security headers, and content security policy
 */

/**
 * CORS configuration
 * Controls which origins can access the API
 */
export const corsMiddleware = cors({
    origin: (origin, callback) => {
        const allowedOrigin = env.get('CORS_ORIGIN');
        
        // Allow all origins in development or if CORS_ORIGIN is '*'
        if (allowedOrigin === '*' || env.isDevelopment()) {
            callback(null, true);
            return;
        }
        
        // Allow specific origins
        const allowedOrigins = allowedOrigin.split(',').map(o => o.trim());
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            callback(null, true);
            return;
        }
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
});

/**
 * Helmet security headers configuration
 * Protects against common web vulnerabilities
 */
export const securityHeaders = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for the UI
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for the UI
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'wss:', 'ws:'], // Allow WebSocket connections
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    
    // Prevent clickjacking
    frameguard: {
        action: 'deny'
    },
    
    // Hide X-Powered-By header
    hidePoweredBy: true,
    
    // Prevent MIME type sniffing
    noSniff: true,
    
    // Enable XSS filter
    xssFilter: true,
    
    // Strict Transport Security (HTTPS only in production)
    hsts: env.isProduction() ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    } : false,
    
    // Referrer Policy
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    }
});

/**
 * Custom security middleware for additional checks
 */
export function additionalSecurity(req, res, next) {
    // Prevent parameter pollution
    if (req.query && Object.keys(req.query).length > 20) {
        return res.status(400).json({
            success: false,
            error: 'Too many query parameters'
        });
    }
    
    // Prevent large payloads (additional check beyond express.json limit)
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) { // 2MB
        return res.status(413).json({
            success: false,
            error: 'Payload too large'
        });
    }
    
    next();
}

/**
 * Request logging middleware (sanitized)
 * Logs requests without exposing sensitive information
 */
export function requestLogger(req, res, next) {
    const start = Date.now();
    
    // Log request
    const logData = {
        method: req.method,
        path: req.path,
        ip: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent']
    };
    
    // Don't log health checks to reduce noise
    if (req.path !== '/health' && req.path !== '/api/health') {
        console.log('[REQUEST]', JSON.stringify(logData));
    }
    
    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        const responseLog = {
            ...logData,
            status: res.statusCode,
            duration: `${duration}ms`
        };
        
        // Don't log health checks
        if (req.path !== '/health' && req.path !== '/api/health') {
            console.log('[RESPONSE]', JSON.stringify(responseLog));
        }
    });
    
    next();
}
