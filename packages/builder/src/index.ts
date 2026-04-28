import { AppConfig } from '@app-builder/shared';
import fs from 'fs-extra';
import { processIcon, generateDefaultIcon } from './iconProcessor';
import {
  generatePackageJson,
  generateAppJson,
  generateIndexHtml
} from './fileGenerator';
import { writeEASConfig, writeEASIgnore } from './easConfig';

// Re-export utilities
export * from './templateEngine';
export * from './iconProcessor';
export * from './fileGenerator';
export * from './easConfig';

export interface GenerateResult {
  outputDir: string;
  files: string[];
  platforms: ('ios' | 'android')[];
}

/**
 * Main function to generate a Capacitor app from AppConfig
 *
 * @param config - The application configuration
 * @param outputDir - Optional output directory (defaults to /tmp/builds/{config.id})
 * @returns Promise with the output directory path and list of generated files
 */
export async function generateCapacitorApp(
  config: AppConfig,
  outputDir?: string
): Promise<GenerateResult> {
  const buildDir = outputDir || `/tmp/builds/${config.id}`;

  console.log(`[Builder] Starting generation for ${config.appName} (${config.id})`);
  console.log(`[Builder] Output directory: ${buildDir}`);

  // Step 1: Create and clean output directory
  await fs.ensureDir(buildDir);
  await fs.emptyDir(buildDir);

  const generatedFiles: string[] = [];

  // Step 2: Generate App.tsx (React Native WebView)
  console.log('[Builder] Generating App.tsx...');
  await generateIndexHtml(buildDir, config);
  generatedFiles.push('App.tsx');

  // Step 3: Generate package.json
  console.log('[Builder] Generating package.json...');
  await generatePackageJson(buildDir, config);
  generatedFiles.push('package.json');

  // Step 5: Generate app.json for Expo/EAS
  console.log('[Builder] Generating app.json...');
  await generateAppJson(buildDir, config);
  generatedFiles.push('app.json');

  // Step 6: Generate EAS configuration
  console.log('[Builder] Generating eas.json...');
  await writeEASConfig(buildDir, config.platforms, {
    developmentProfile: false,
    previewProfile: true
  });
  generatedFiles.push('eas.json');

  // Step 7: Generate .easignore
  await writeEASIgnore(buildDir);
  generatedFiles.push('.easignore');

  // Step 8: Process icon (or generate default)
  console.log('[Builder] Processing icon...');
  if (config.iconBase64) {
    await processIcon(config.iconBase64, buildDir, config.platforms);
    generatedFiles.push('assets/icon.png', 'assets/adaptive-icon.png', 'assets/splash.png');
  } else {
    await generateDefaultIcon(config.appName, config.splashColor, buildDir);
    generatedFiles.push('assets/icon.png', 'assets/adaptive-icon.png', 'assets/splash.png');
  }

  // Step 9: Initialize git repository (required by EAS)
  console.log('[Builder] Initializing git repository...');
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    const gitEnv = {
      ...process.env,
      GIT_AUTHOR_NAME: 'App Builder',
      GIT_AUTHOR_EMAIL: 'build@appbuilder.local',
      GIT_COMMITTER_NAME: 'App Builder',
      GIT_COMMITTER_EMAIL: 'build@appbuilder.local',
    };
    await execAsync('git init', { cwd: buildDir, env: gitEnv });
    await execAsync('git add -A', { cwd: buildDir, env: gitEnv });
    await execAsync('git commit -m "Initial commit"', { cwd: buildDir, env: gitEnv });
    console.log('[Builder] Git repository initialized');
  } catch (error) {
    console.warn('[Builder] Git init warning:', error);
  }

  console.log(`[Builder] Generation complete! ${generatedFiles.length} files created.`);

  return {
    outputDir: buildDir,
    files: generatedFiles,
    platforms: config.platforms
  };
}

/**
 * Validate AppConfig before generation
 */
export function validateAppConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (!config.id) {
    errors.push('Missing app ID');
  }

  if (!config.appName || config.appName.trim().length === 0) {
    errors.push('App name is required');
  }

  if (!config.bundleId || !/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i.test(config.bundleId)) {
    errors.push('Invalid bundle ID format (expected: com.example.app)');
  }

  if (!config.url) {
    errors.push('URL is required');
  } else {
    try {
      new URL(config.url);
    } catch {
      errors.push('Invalid URL format');
    }
  }

  if (!config.splashColor || !/^#[0-9A-Fa-f]{6}$/.test(config.splashColor)) {
    errors.push('Invalid splash color format (expected: #RRGGBB)');
  }

  if (!config.platforms || config.platforms.length === 0) {
    errors.push('At least one platform (ios or android) is required');
  }

  if (config.iconBase64) {
    // Basic validation - check if it looks like base64
    const base64Regex = /^(data:image\/[a-z]+;base64,)?[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(config.iconBase64.substring(0, 100))) {
      errors.push('Invalid icon format (expected: base64 encoded PNG)');
    }
  }

  return errors;
}

/**
 * Clean up build directory after completion or failure
 */
export async function cleanupBuildDir(buildDir: string): Promise<void> {
  try {
    await fs.remove(buildDir);
    console.log(`[Builder] Cleaned up build directory: ${buildDir}`);
  } catch (error) {
    console.error(`[Builder] Failed to cleanup build directory: ${error}`);
  }
}
