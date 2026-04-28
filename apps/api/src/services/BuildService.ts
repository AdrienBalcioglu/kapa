import { Queue } from 'bullmq';
import { prisma } from '../db/prisma';
import type { BuildJob, BuildStatus, GenerateAppPayload, AppConfig } from '@app-builder/shared';

// Build queue instance
let buildQueue: Queue<GenerateAppPayload> | null = null;

function getBuildQueue(): Queue<GenerateAppPayload> {
  if (!buildQueue) {
    buildQueue = new Queue<GenerateAppPayload>('build-jobs', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 3600, // Keep completed jobs for 24 hours
        },
        removeOnFail: {
          count: 50,
        },
      },
    });
  }
  return buildQueue;
}

export class BuildService {
  /**
   * Create a new build job and add it to the queue
   */
  static async createBuild(
    appConfigId: string,
    platform: 'ios' | 'android'
  ): Promise<BuildJob> {
    // Create the build job in DB
    const build = await prisma.buildJob.create({
      data: {
        appConfigId,
        platform,
        status: 'pending',
        startedAt: new Date(),
      },
    });

    // Get the full app config for the queue
    const appConfig = await prisma.appConfig.findUnique({
      where: { id: appConfigId },
    });

    if (!appConfig) {
      throw new Error('App config not found');
    }

    // Transform to shared AppConfig type
    const config: AppConfig = {
      id: appConfig.id,
      userId: appConfig.userId,
      appName: appConfig.appName,
      bundleId: appConfig.bundleId,
      url: appConfig.url,
      splashColor: appConfig.splashColor,
      pushNotifications: appConfig.pushNotifications,
      sessionMode: appConfig.sessionMode as 'cookie' | 'jwt' | 'none',
      platforms: appConfig.platforms as ('ios' | 'android')[],
      createdAt: appConfig.createdAt,
    };

    // Add job to queue
    const queue = getBuildQueue();
    await queue.add(
      `build-${platform}`,
      {
        config,
        jobId: build.id,
      },
      {
        jobId: build.id, // Use our build ID as the BullMQ job ID
      }
    );

    console.log(`Build job ${build.id} added to queue for ${platform}`);

    return {
      id: build.id,
      appConfigId: build.appConfigId,
      status: build.status as BuildStatus,
      platform: build.platform as 'ios' | 'android',
      easBuildId: build.easBuildId || undefined,
      downloadUrl: build.downloadUrl || undefined,
      logs: build.logs || undefined,
      startedAt: build.startedAt || undefined,
      completedAt: build.completedAt || undefined,
      errorMessage: build.errorMessage || undefined,
    };
  }

  /**
   * Update build status in the database
   */
  static async updateStatus(
    buildId: string,
    status: BuildStatus,
    additionalData?: {
      easBuildId?: string;
      downloadUrl?: string;
      logs?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    const updateData: {
      status: string;
      easBuildId?: string;
      downloadUrl?: string;
      logs?: string;
      errorMessage?: string;
      completedAt?: Date;
    } = {
      status,
      ...additionalData,
    };

    // Set completedAt for terminal statuses
    if (status === 'success' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    await prisma.buildJob.update({
      where: { id: buildId },
      data: updateData,
    });

    console.log(`Build ${buildId} status updated to: ${status}`);
  }

  /**
   * Append logs to a build
   */
  static async appendLogs(buildId: string, newLogs: string): Promise<void> {
    const build = await prisma.buildJob.findUnique({
      where: { id: buildId },
      select: { logs: true },
    });

    const currentLogs = build?.logs || '';
    const updatedLogs = currentLogs + '\n' + newLogs;

    await prisma.buildJob.update({
      where: { id: buildId },
      data: { logs: updatedLogs },
    });
  }

  /**
   * Get a build by ID
   */
  static async getBuild(buildId: string): Promise<BuildJob | null> {
    const build = await prisma.buildJob.findUnique({
      where: { id: buildId },
    });

    if (!build) return null;

    return {
      id: build.id,
      appConfigId: build.appConfigId,
      status: build.status as BuildStatus,
      platform: build.platform as 'ios' | 'android',
      easBuildId: build.easBuildId || undefined,
      downloadUrl: build.downloadUrl || undefined,
      logs: build.logs || undefined,
      startedAt: build.startedAt || undefined,
      completedAt: build.completedAt || undefined,
      errorMessage: build.errorMessage || undefined,
    };
  }

  /**
   * Get queue instance for external use
   */
  static getQueue(): Queue<GenerateAppPayload> {
    return getBuildQueue();
  }
}
