import { Router, Request, Response, NextFunction } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth';

export const appsRouter: RouterType = Router();

// Validation schema for creating an app
const createAppSchema = z.object({
  appName: z.string().min(1).max(100),
  bundleId: z.string().regex(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/, 'Invalid bundle ID format'),
  url: z.string().url(),
  splashColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  iconBase64: z.string().optional(),
  pushNotifications: z.boolean().default(false),
  sessionMode: z.enum(['cookie', 'jwt', 'none']).default('cookie'),
  platforms: z.array(z.enum(['ios', 'android'])).min(1),
});

// Validation schema for updating an app
const updateAppSchema = createAppSchema.partial();

// Create a new app
appsRouter.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const data = createAppSchema.parse(req.body);

    // Check if bundleId already exists
    const existing = await prisma.appConfig.findUnique({
      where: { bundleId: data.bundleId },
    });

    if (existing) {
      return res.status(409).json({ error: 'Bundle ID already exists' });
    }

    // Handle icon upload if provided
    let iconPath: string | undefined;
    if (data.iconBase64) {
      // TODO: Upload to S3 and get path
      // iconPath = await StorageService.uploadIcon(data.iconBase64, data.bundleId);
      iconPath = `icons/${data.bundleId}/icon.png`;
    }

    const app = await prisma.appConfig.create({
      data: {
        userId,
        appName: data.appName,
        bundleId: data.bundleId,
        url: data.url,
        splashColor: data.splashColor,
        iconPath,
        pushNotifications: data.pushNotifications,
        sessionMode: data.sessionMode,
        platforms: data.platforms,
      },
    });

    res.status(201).json(app);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// List all apps for the current user
appsRouter.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const apps = await prisma.appConfig.findMany({
      where: { userId },
      include: {
        builds: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get only the latest build
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(apps);
  } catch (error) {
    next(error);
  }
});

// Get a single app by ID
appsRouter.get('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const app = await prisma.appConfig.findFirst({
      where: { id, userId },
      include: {
        builds: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    res.json(app);
  } catch (error) {
    next(error);
  }
});

// Update an app
appsRouter.patch('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = updateAppSchema.parse(req.body);

    // Check if app exists and belongs to user
    const existing = await prisma.appConfig.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'App not found' });
    }

    // If updating bundleId, check uniqueness
    if (data.bundleId && data.bundleId !== existing.bundleId) {
      const bundleExists = await prisma.appConfig.findUnique({
        where: { bundleId: data.bundleId },
      });
      if (bundleExists) {
        return res.status(409).json({ error: 'Bundle ID already exists' });
      }
    }

    // Remove iconBase64 from data as it's not a DB field
    const { iconBase64: _iconBase64, ...updateData } = data;

    const updated = await prisma.appConfig.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// Delete an app
appsRouter.delete('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.appConfig.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'App not found' });
    }

    await prisma.appConfig.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
