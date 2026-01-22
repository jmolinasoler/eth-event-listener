import rateLimit from 'express-rate-limit';
import { env } from '../config/environment.js';

/**
 * Rate limiter middleware for API protection
 * Prevents DDoS attacks by limiting requests per IP address
 */

/**
 * Create rate limiter for API endpoints
 * Default: 100 requests per minute per IP
 */
export const apiLimiter = rateLimit({
    windowMs: env.get('RATE_LIMIT_WINDOW_MS'), // Time window in milliseconds
    max: env.get('RATE_LIMIT_MAX_REQUESTS'), // Max requests per window
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    // Skip rate limiting for health check endpoints
    skip: (req) => {
        return req.path === '/health' || req.path === '/api/health';
    },
    // Custom key generator (uses IP address)
    keyGenerator: (req) => {
        // Use X-Forwarded-For header if behind a proxy (like Render.com)
        return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    },
    // Handler for when rate limit is exceeded
    handler: (req, res) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: req.rateLimit?.resetTime
        });
    }
});

/**
 * Stricter rate limiter for upload endpoints
 * 20 requests per minute per IP
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: {
        success: false,
        error: 'Too many upload attempts from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    },
    handler: (req, res) => {
        console.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many upload attempts from this IP, please try again later.',
            retryAfter: req.rateLimit?.resetTime
        });
    }
});

/**
 * Very strict rate limiter for delete operations
 * 10 requests per minute per IP
 */
export const deleteLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: {
        success: false,
        error: 'Too many delete attempts from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    },
    handler: (req, res) => {
        console.warn(`Delete rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many delete attempts from this IP, please try again later.',
            retryAfter: req.rateLimit?.resetTime
        });
    }
});
