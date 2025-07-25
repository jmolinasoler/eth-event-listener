// src/routes/index.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import config from '../config/index.js';

/**
 * Setup application routes
 * @param {Object} controllers - Controller instances
 * @returns {express.Router} - Configured router
 */
export function setupRoutes(controllers) {
  const router = express.Router();
  const { abiController, statsController } = controllers;

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, config.abiDir);
      },
      filename: (req, file, cb) => {
        // Extract address from form data or use original filename
        const address = req.body.address || file.originalname.replace('.json', '');
        cb(null, `${address.toLowerCase().replace('0x', '')}.json`);
      }
    }),
    fileFilter: (req, file, cb) => {
      // Only accept JSON files
      if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
        cb(null, true);
      } else {
        cb(new Error('Only JSON files are allowed'));
      }
    },
    limits: {
      fileSize: config.maxFileSize
    }
  });

  // ABI Management Routes
  router.get('/api/abis', (req, res) => abiController.getAllAbis(req, res));
  router.get('/api/abis/:address', (req, res) => abiController.getAbi(req, res));
  router.post('/api/abis', (req, res) => abiController.addAbi(req, res));
  router.post('/api/abis/upload', upload.single('abi'), (req, res) => abiController.uploadAbi(req, res));
  router.delete('/api/abis/:address', (req, res) => abiController.deleteAbi(req, res));

  // Statistics and Health Routes
  router.get('/api/stats', (req, res) => statsController.getStats(req, res));
  router.get('/api/health', (req, res) => statsController.getHealth(req, res));
  router.get('/api/metrics', (req, res) => statsController.getMetrics(req, res));

  // Error handling middleware for multer
  router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 1MB.'
        });
      }
    }
    if (error.message === 'Only JSON files are allowed') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  });

  return router;
}

export default setupRoutes;
