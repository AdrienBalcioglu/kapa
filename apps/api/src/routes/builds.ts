import { Router, Request, Response, NextFunction } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth';
import { BuildService } from '../services/BuildService';
import { EASService } from '../services/EASService';

export const buildsRouter: RouterType = Router();

// Validation schema for creating a build
const createBuildSchema = z.object({
  appConfigId: z.string().cuid(),
  platform: z.enum(['ios', 'android']),
});

// Create a new build job
buildsRouter.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const data = createBuildSchema.parse(req.body);

    // Check if app exists and belongs to user
    const app = await prisma.appConfig.findFirst({
      where: { id: data.appConfigId, userId },
    });

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Check if platform is enabled for this app
    if (!app.platforms.includes(data.platform)) {
      return res.status(400).json({
        error: `Platform ${data.platform} is not enabled for this app`
      });
    }

    // Check for existing pending/in-progress builds for same app+platform
    const existingBuild = await prisma.buildJob.findFirst({
      where: {
        appConfigId: data.appConfigId,
        platform: data.platform,
        status: {
          in: ['pending', 'generating', 'queued', 'building'],
        },
      },
    });

    if (existingBuild) {
      return res.status(409).json({
        error: 'A build is already in progress for this app and platform',
        buildId: existingBuild.id,
      });
    }

    // Create build job and add to queue
    const build = await BuildService.createBuild(data.appConfigId, data.platform);

    res.status(201).json(build);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// Get a build by ID
buildsRouter.get('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const build = await prisma.buildJob.findFirst({
      where: {
        id,
        appConfig: { userId },
      },
      include: {
        appConfig: {
          select: {
            appName: true,
            bundleId: true,
            url: true,
          },
        },
      },
    });

    if (!build) {
      return res.status(404).json({ error: 'Build not found' });
    }

    // Auto-sync with EAS if build is in 'building' state and has an EAS build ID
    if (build.status === 'building' && build.easBuildId) {
      try {
        const easStatus = await EASService.getBuildStatus(build.easBuildId);
        if (easStatus.status === 'finished') {
          const downloadUrl = easStatus.artifacts?.applicationArchiveUrl || easStatus.artifacts?.buildUrl;
          await BuildService.updateStatus(build.id, 'success', { downloadUrl: downloadUrl ?? undefined });
          build.status = 'success';
          build.downloadUrl = downloadUrl ?? null;
        } else if (easStatus.status === 'errored' || easStatus.status === 'canceled') {
          await BuildService.updateStatus(build.id, 'failed', {
            errorMessage: easStatus.error?.message || `Build ${easStatus.status}`,
          });
          build.status = 'failed';
        }
      } catch {
        // Ignore EAS sync errors — return whatever we have in DB
      }
    }

    res.json(build);
  } catch (error) {
    next(error);
  }
});

// List all builds for an app
buildsRouter.get('/app/:appId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;

    // Verify app belongs to user
    const app = await prisma.appConfig.findFirst({
      where: { id: appId, userId },
    });

    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }

    const builds = await prisma.buildJob.findMany({
      where: { appConfigId: appId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(builds);
  } catch (error) {
    next(error);
  }
});

// Cancel a build (if possible)
buildsRouter.post('/:id/cancel', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const build = await prisma.buildJob.findFirst({
      where: {
        id,
        appConfig: { userId },
      },
    });

    if (!build) {
      return res.status(404).json({ error: 'Build not found' });
    }

    // Can only cancel pending or generating builds
    if (!['pending', 'generating'].includes(build.status)) {
      return res.status(400).json({
        error: 'Build cannot be cancelled in its current state',
        status: build.status,
      });
    }

    const cancelled = await prisma.buildJob.update({
      where: { id },
      data: {
        status: 'failed',
        errorMessage: 'Cancelled by user',
        completedAt: new Date(),
      },
    });

    res.json(cancelled);
  } catch (error) {
    next(error);
  }
});

// Get build logs (streaming would be better but polling works too)
buildsRouter.get('/:id/logs', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const build = await prisma.buildJob.findFirst({
      where: {
        id,
        appConfig: { userId },
      },
      select: {
        id: true,
        status: true,
        logs: true,
      },
    });

    if (!build) {
      return res.status(404).json({ error: 'Build not found' });
    }

    res.json({
      id: build.id,
      status: build.status,
      logs: build.logs || '',
    });
  } catch (error) {
    next(error);
  }
});
