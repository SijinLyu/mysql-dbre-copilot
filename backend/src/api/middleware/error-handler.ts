import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error('Request error', { error: err.message, stack: err.stack });

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation error',
      details: JSON.parse(err.message),
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
}

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  logger.debug(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
}
