import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  // Dev mode: allow unauthenticated access with a mock user
  if (!authHeader && process.env.NODE_ENV !== 'production') {
    req.user = {
      id: 'dev-user-123',
      email: 'dev@example.com',
    };
    return next();
  }

  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
    return;
  }

  const token = parts[1];

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    req.user = {
      id: payload.sub,
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
