import type { EASBuildResult } from '@app-builder/shared';

interface EASBuildStatus {
  id: string;
  status: 'new' | 'in_queue' | 'in_progress' | 'pending_cancel' | 'errored' | 'finished' | 'canceled';
  platform: 'ios' | 'android';
  artifacts?: {
    buildUrl?: string;
    applicationArchiveUrl?: string;
  };
  error?: {
    message: string;
    errorCode: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export class EASService {
  private static baseUrl = 'https://api.expo.dev/v2';

  /**
   * Get the EAS token from environment
   */
  private static getToken(): string {
    const token = process.env.EAS_TOKEN;
    if (!token) {
      throw new Error('EAS_TOKEN environment variable is not set');
    }
    return token;
  }

  /**
   * Initialize EAS project (create new or link existing)
   */
  static async initProject(projectDir: string): Promise<string> {
    const token = this.getToken();
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    console.log(`Initializing EAS project in ${projectDir}`);

    try {
      // Create new EAS project with --force to handle conflicts
      const { stdout, stderr } = await execAsync(
        'npx eas-cli project:init --non-interactive --force',
        {
          cwd: projectDir,
          env: {
            ...process.env,
            EXPO_TOKEN: token,
          },
          timeout: 60000,
        }
      );

      console.log('EAS project:init stdout:', stdout);
      if (stderr) console.log('EAS project:init stderr:', stderr);

      // Extract project ID from app.json
      const fs = await import('fs-extra');
      const path = await import('path');
      const appJson = await fs.default.readJson(path.default.join(projectDir, 'app.json'));
      const projectId = appJson.expo?.extra?.eas?.projectId || '';

      console.log(`EAS project initialized with ID: ${projectId}`);
      return projectId;
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      console.error('EAS project:init error:', err.stderr || err.message);
      throw new Error(`EAS project init failed: ${err.stderr || err.message}`);
    }
  }

  /**
   * Trigger a build on EAS using the CLI
   */
  static async triggerBuild(
    projectDir: string,
    platform: 'ios' | 'android'
  ): Promise<EASBuildResult> {
    const token = this.getToken();

    console.log(`Triggering EAS build for ${platform} from ${projectDir}`);

    // Use EAS CLI via npx with non-interactive mode
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      // Step 1: Initialize EAS project first
      await this.initProject(projectDir);

      // Step 2: Commit the changes made by eas project:init
      try {
        const gitEnv = {
          ...process.env,
          GIT_AUTHOR_NAME: 'App Builder',
          GIT_AUTHOR_EMAIL: 'build@appbuilder.local',
          GIT_COMMITTER_NAME: 'App Builder',
          GIT_COMMITTER_EMAIL: 'build@appbuilder.local',
        };
        await execAsync('git add -A && git commit -m "Link EAS project"', {
          cwd: projectDir,
          env: gitEnv,
          timeout: 30000,
        });
      } catch {
        // Ignore commit errors (might be no changes)
      }

      // Step 3: Run eas build command (--no-wait: submit and return immediately with build ID)
      const { stdout, stderr } = await execAsync(
        `npx eas-cli build --platform ${platform} --profile production --non-interactive --json --no-wait`,
        {
          cwd: projectDir,
          env: {
            ...process.env,
            EXPO_TOKEN: token,
            EAS_BUILD_NO_EXPO_GO_WARNING: 'true',
          },
          timeout: 120000, // 2 minutes timeout for submission only
        }
      );

      console.log('EAS CLI stdout:', stdout);
      if (stderr) console.log('EAS CLI stderr:', stderr);

      // Parse the JSON output from EAS CLI
      const builds = JSON.parse(stdout);
      const build = Array.isArray(builds) ? builds[0] : builds;

      return {
        easBuildId: build.id,
        status: build.status,
        artifacts: build.artifacts,
      };
    } catch (error: unknown) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      console.error('EAS CLI error:', err.stderr || err.message);
      throw new Error(`EAS Build failed: ${err.stderr || err.message}`);
    }
  }

  /**
   * Get the status of an EAS build
   */
  static async getBuildStatus(easBuildId: string): Promise<EASBuildStatus> {
    const token = this.getToken();

    const response = await fetch(`${this.baseUrl}/builds/${easBuildId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`EAS Build API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<EASBuildStatus>;
  }

  /**
   * Cancel an EAS build
   */
  static async cancelBuild(easBuildId: string): Promise<void> {
    const token = this.getToken();

    const response = await fetch(`${this.baseUrl}/builds/${easBuildId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`EAS Cancel Build API error: ${response.status} - ${error}`);
    }
  }

  /**
   * Poll for build completion (alternative to webhook)
   */
  static async waitForBuildCompletion(
    easBuildId: string,
    maxWaitMs: number = 30 * 60 * 1000, // 30 minutes default
    pollIntervalMs: number = 30000 // 30 seconds
  ): Promise<EASBuildStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getBuildStatus(easBuildId);

      // Terminal states
      if (['finished', 'errored', 'canceled'].includes(status.status)) {
        return status;
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Build ${easBuildId} did not complete within ${maxWaitMs}ms`);
  }
}
