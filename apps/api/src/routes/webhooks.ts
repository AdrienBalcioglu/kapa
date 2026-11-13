import { Router, Request, Response, NextFunction } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import type { BuildStatus } from '@app-builder/shared';

export const webhooksRouter: RouterType = Router();

// EAS webhook payload schema
const easWebhookSchema = z.object({
  id: z.string(),
  accountName: z.string(),
  projectName: z.string(),
  buildDetailsPageUrl: z.string().optional(),
  parentBuildId: z.string().optional(),
  appId: z.string(),
  initiatingUserId: z.string().optional(),
  cancelingUserId: z.string().optional(),
  platform: z.enum(['ios', 'android']),
  status: z.enum([
    'new',
    'in_queue',
    'in_progress',
    'pending_cancel',
    'errored',
    'finished',
    'canceled',
  ]),
  artifacts: z.object({
    buildUrl: z.string().optional(),
    applicationArchiveUrl: z.string().optional(),
    buildArtifactsUrl: z.string().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
  error: z.object({
    message: z.string(),
    errorCode: z.string(),
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});

type EASWebhookPayload = z.infer<typeof easWebhookSchema>;

// Map EAS status to our BuildStatus
function mapEASStatus(easStatus: EASWebhookPayload['status']): BuildStatus {
  switch (easStatus) {
    case 'new':
    case 'in_queue':
      return 'queued';
    case 'in_progress':
      return 'building';
    case 'finished':
      return 'success';
    case 'errored':
    case 'canceled':
    case 'pending_cancel':
      return 'failed';
    default:
      return 'building';
  }
}

// Verify EAS webhook signature
function verifyEASSignature(payload: string, signature: string | undefined): boolean {
  if (!process.env.EAS_WEBHOOK_SECRET) {
    // Without a secret, unsigned webhooks are only accepted outside production.
    if (process.env.NODE_ENV === 'production') {
      console.error('EAS_WEBHOOK_SECRET is not set: webhook rejected');
      return false;
    }
    console.warn('EAS webhook signature verification skipped - no secret configured');
    return true;
  }

  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.EAS_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  // timingSafeEqual throws on buffers of different lengths.
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

// EAS Build webhook endpoint
webhooksRouter.post('/eas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['expo-signature'] as string | undefined;

    // Verify signature
    if (!verifyEASSignature(rawBody, signature)) {
      console.error('Invalid EAS webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse and validate payload
    const payload = easWebhookSchema.parse(req.body);
    console.log(`EAS webhook received: build ${payload.id}, status: ${payload.status}`);

    // Find the build job by EAS build ID
    const build = await prisma.buildJob.findFirst({
      where: { easBuildId: payload.id },
    });

    if (!build) {
      console.warn(`Build job not found for EAS build ID: ${payload.id}`);
      // Return 200 anyway to acknowledge receipt
      return res.status(200).json({ received: true, warning: 'Build not found' });
    }

    // Map status and update build
    const newStatus = mapEASStatus(payload.status);
    const updateData: {
      status: BuildStatus;
      downloadUrl?: string;
      errorMessage?: string;
      completedAt?: Date;
      logs?: string;
    } = {
      status: newStatus,
    };

    // Add download URL if build succeeded
    if (payload.status === 'finished' && payload.artifacts?.applicationArchiveUrl) {
      updateData.downloadUrl = payload.artifacts.applicationArchiveUrl;
      updateData.completedAt = new Date();
    }

    // Add error message if build failed
    if (payload.status === 'errored' && payload.error) {
      updateData.errorMessage = payload.error.message;
      updateData.completedAt = new Date();
    }

    if (payload.status === 'canceled') {
      updateData.errorMessage = 'Build was cancelled';
      updateData.completedAt = new Date();
    }

    // Update the build job
    await prisma.buildJob.update({
      where: { id: build.id },
      data: updateData,
    });

    console.log(`Build ${build.id} updated to status: ${newStatus}`);

    res.status(200).json({ received: true, buildId: build.id, status: newStatus });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid EAS webhook payload:', error.errors);
      return res.status(400).json({ error: 'Invalid payload', details: error.errors });
    }
    next(error);
  }
});

// Health check for webhook endpoint
webhooksRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', endpoint: 'webhooks' });
});
