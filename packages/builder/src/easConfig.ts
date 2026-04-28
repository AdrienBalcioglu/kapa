import fs from 'fs-extra';
import path from 'path';

export interface EASConfig {
  cli: {
    version: string;
    appVersionSource: 'local' | 'remote';
  };
  build: {
    development?: BuildProfile;
    preview?: BuildProfile;
    production: BuildProfile;
  };
  submit?: {
    production?: SubmitConfig;
  };
}

interface BuildProfile {
  developmentClient?: boolean;
  distribution?: 'internal' | 'store';
  ios?: {
    simulator?: boolean;
    credentialsSource?: 'local' | 'remote';
    autoIncrement?: boolean;
  };
  android?: {
    buildType?: 'apk' | 'app-bundle';
    credentialsSource?: 'local' | 'remote';
  };
}

interface SubmitConfig {
  ios?: {
    appleId?: string;
    ascAppId?: string;
  };
  android?: {
    serviceAccountKeyPath?: string;
  };
}

/**
 * Generate EAS configuration based on target platforms
 */
export function generateEASConfig(
  platforms: ('ios' | 'android')[],
  options?: {
    developmentProfile?: boolean;
    previewProfile?: boolean;
  }
): EASConfig {
  const config: EASConfig = {
    cli: {
      version: '>= 5.0.0',
      appVersionSource: 'local'
    },
    build: {
      production: {}
    }
  };

  // Add development profile if requested
  if (options?.developmentProfile) {
    config.build.development = {
      developmentClient: true,
      distribution: 'internal'
    };

    if (platforms.includes('ios')) {
      config.build.development.ios = { simulator: true };
    }
    if (platforms.includes('android')) {
      config.build.development.android = { buildType: 'apk' };
    }
  }

  // Add preview profile if requested
  if (options?.previewProfile) {
    config.build.preview = {
      distribution: 'internal'
    };

    if (platforms.includes('ios')) {
      config.build.preview.ios = { simulator: false };
    }
    if (platforms.includes('android')) {
      config.build.preview.android = { buildType: 'apk' };
    }
  }

  // Configure production profile
  if (platforms.includes('ios')) {
    config.build.production.ios = {
      simulator: false,
      credentialsSource: 'remote',
      autoIncrement: true
    };
  }

  if (platforms.includes('android')) {
    config.build.production.android = {
      buildType: 'apk',
      credentialsSource: 'remote',
      image: 'ubuntu-22.04-jdk-17-ndk-r26b',
    };
  }

  // Note: Submit configuration is omitted as it requires store credentials
  // Users can add submit config manually when ready to publish

  return config;
}

/**
 * Write EAS configuration to file
 */
export async function writeEASConfig(
  outputDir: string,
  platforms: ('ios' | 'android')[],
  options?: {
    developmentProfile?: boolean;
    previewProfile?: boolean;
  }
): Promise<void> {
  const config = generateEASConfig(platforms, options);
  const easJsonPath = path.join(outputDir, 'eas.json');
  await fs.writeJson(easJsonPath, config, { spaces: 2 });
}

/**
 * Validate EAS configuration
 */
export function validateEASConfig(config: EASConfig): string[] {
  const errors: string[] = [];

  if (!config.cli?.version) {
    errors.push('Missing CLI version');
  }

  if (!config.build?.production) {
    errors.push('Missing production build profile');
  }

  return errors;
}

/**
 * Generate .easignore file
 */
export async function writeEASIgnore(outputDir: string): Promise<void> {
  const ignoreContent = `# EAS Build ignore file
node_modules/
.git/
.env
.env.*
*.log
.DS_Store
*.tgz
coverage/
dist/
build/
`;

  await fs.writeFile(path.join(outputDir, '.easignore'), ignoreContent, 'utf-8');
}
