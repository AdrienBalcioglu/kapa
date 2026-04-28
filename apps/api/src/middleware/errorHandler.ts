import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message);
  }
}

/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 */
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', error);

  // Handle custom API errors
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        res.status(409).json({
          error: 'A record with this value already exists',
          field: (error.meta?.target as string[])?.join(', '),
        });
        return;
      case 'P2025': // Record not found
        res.status(404).json({
          error: 'Record not found',
        });
        return;
      case 'P2003': // Foreign key constraint violation
        res.status(400).json({
          error: 'Invalid reference',
        });
        return;
      default:
        res.status(500).json({
          error: 'Database error',
          code: error.code,
        });
        return;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: 'Invalid data format',
    });
    return;
  }

  // Handle JWT errors (already handled in auth middleware, but just in case)
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Authentication failed',
    });
    return;
  }

  // Handle syntax errors (malformed JSON)
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      error: 'Invalid JSON',
    });
    return;
  }

  // Default error response
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    error: 'Internal server error',
    ...(isDev && { message: error.message, stack: error.stack }),
  });
}

/**
 * Async handler wrapper to catch errors from async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
