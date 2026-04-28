import { Worker, Job } from 'bullmq';
import { BuildService } from '../services/BuildService';
import { EASService } from '../services/EASService';
import type { GenerateAppPayload } from '@app-builder/shared';
import { generateCapacitorApp as builderGenerateApp } from '@app-builder/builder';

let buildWorker: Worker<GenerateAppPayload> | null = null;

/**
 * Process a build job
 * This is the main function that orchestrates the build process
 */
async function processBuildJob(job: Job<GenerateAppPayload>): Promise<void> {
  const { config, jobId } = job.data;
  const platform = config.platforms[0]; // For now, build one platform at a time

  console.log(`Processing build job ${jobId} for ${config.appName} (${platform})`);

  try {
    // Step 1: Update status to 'generating'
    await BuildService.updateStatus(jobId, 'generating');
    await BuildService.appendLogs(jobId, `[${new Date().toISOString()}] Starting code generation...`);

    // Step 2: Generate the Capacitor app
    // This would call the builder package
    // For now, we'll simulate this step
    const appDir = await generateCapacitorApp(config, jobId);

    await BuildService.appendLogs(jobId, `[${new Date().toISOString()}] Code generation complete. Output: ${appDir}`);

    // Step 3: Update status to 'queued'
    await BuildService.updateStatus(jobId, 'queued');
    await BuildService.appendLogs(jobId, `[${new Date().toISOString()}] Submitting to EAS Build...`);

    // Step 4: Trigger EAS Build
    const easResult = await EASService.triggerBuild(appDir, platform);

    // Step 5: Save the EAS build ID and update status
    await BuildService.updateStatus(jobId, 'building', {
      easBuildId: easResult.easBuildId,
    });
    await BuildService.appendLogs(
      jobId,
      `[${new Date().toISOString()}] EAS Build started: ${easResult.easBuildId}`
    );

    // Step 6: The webhook will handle status updates from here
    // Alternatively, we could poll here:
    // const finalStatus = await EASService.waitForBuildCompletion(easResult.easBuildId);

    console.log(`Build job ${jobId} submitted to EAS: ${easResult.easBuildId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Build job ${jobId} failed:`, errorMessage);

    await BuildService.updateStatus(jobId, 'failed', {
      errorMessage,
    });
    await BuildService.appendLogs(
      jobId,
      `[${new Date().toISOString()}] ERROR: ${errorMessage}`
    );

    throw error; // Re-throw to trigger BullMQ retry logic
  }
}

/**
 * Generate the Capacitor app using the builder package
 * This function calls the @app-builder/builder package
 */
async function generateCapacitorApp(
  config: GenerateAppPayload['config'],
  jobId: string
): Promise<string> {
  await BuildService.appendLogs(jobId, `[${new Date().toISOString()}] Starting code generation with builder...`);
  await BuildService.appendLogs(jobId, `[${new Date().toISOString()}] Bundle ID: ${config.bundleId}`);
  await BuildService.appendLogs(jobId, `[${new Date().toISOString()}] URL: ${config.url}`);
  await BuildService.appendLogs(jobId, `[${new Date().toISOString()}] Platforms: ${config.platforms.join(', ')}`);

  // Call the real builder
  const result = await builderGenerateApp(config);

  await BuildService.appendLogs(jobId, `[${new Date().toISOString()}] Generated ${result.files.length} files`);
  await BuildService.appendLogs(jobId, `[${new Date().toISOString()}] Output directory: ${result.outputDir}`);

  return result.outputDir;
}

/**
 * Start the build worker
 */
export async function startBuildWorker(): Promise<void> {
  if (buildWorker) {
    console.log('Build worker already running');
    return;
  }

  buildWorker = new Worker<GenerateAppPayload>(
    'build-jobs',
    processBuildJob,
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      concurrency: parseInt(process.env.BUILD_WORKER_CONCURRENCY || '2'),
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute
      },
    }
  );

  buildWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  buildWorker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
  });

  buildWorker.on('error', (error) => {
    console.error('Worker error:', error);
  });

  buildWorker.on('stalled', (jobId) => {
    console.warn(`Job ${jobId} stalled`);
  });

  console.log('Build worker started');
}

/**
 * Stop the build worker gracefully
 */
export async function stopBuildWorker(): Promise<void> {
  if (buildWorker) {
    await buildWorker.close();
    buildWorker = null;
    console.log('Build worker stopped');
  }
}

/**
 * Get the build worker instance
 */
export function getBuildWorker(): Worker<GenerateAppPayload> | null {
  return buildWorker;
}
