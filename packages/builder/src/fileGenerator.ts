import fs from 'fs-extra';
import path from 'path';
import { AppConfig } from '@app-builder/shared';
import { replaceInFile, extractDomain, generateSlug, TemplatePlaceholders } from './templateEngine';

/**
 * Copy template directory to output directory
 */
export async function copyTemplate(templateDir: string, outputDir: string): Promise<void> {
  // Ensure output directory exists and is empty
  await fs.ensureDir(outputDir);
  await fs.emptyDir(outputDir);

  // Copy all files from template
  await fs.copy(templateDir, outputDir, {
    filter: (src) => {
      // Skip node_modules and .git if they exist
      const basename = path.basename(src);
      return basename !== 'node_modules' && basename !== '.git';
    }
  });
}

/**
 * Generate all template placeholders from AppConfig
 */
export function generatePlaceholders(config: AppConfig): TemplatePlaceholders {
  return {
    'APP_NAME': config.appName,
    'APP_URL': config.url,
    'APP_URL_DOMAIN': extractDomain(config.url),
    'APP_URL_ORIGIN': new URL(config.url).origin,
    'APP_SLUG': generateSlug(config.appName),
    'BUNDLE_ID': config.bundleId,
    'SPLASH_COLOR': config.splashColor,
    'PUSH_ENABLED': config.pushNotifications ? 'true' : 'false',
    'SESSION_MODE': config.sessionMode,
    // These will be filled by environment or user
    'APPLE_ID': process.env.APPLE_ID || '',
    'ASC_APP_ID': process.env.ASC_APP_ID || '',
    'EAS_PROJECT_ID': process.env.EAS_PROJECT_ID || ''
  };
}

/**
 * Process all template files in the output directory
 */
export async function processTemplateFiles(
  outputDir: string,
  placeholders: TemplatePlaceholders
): Promise<void> {
  // List of files to process
  const filesToProcess = [
    'src/index.html',
    'capacitor.config.ts',
    'package.json',
    'app.json'
  ];

  for (const file of filesToProcess) {
    const filePath = path.join(outputDir, file);
    if (await fs.pathExists(filePath)) {
      await replaceInFile(filePath, placeholders);
    }
  }
}

/**
 * Rename template files (remove .template suffix)
 */
export async function renameTemplateFiles(outputDir: string): Promise<void> {
  const templateFiles = [
    { from: 'capacitor.config.template.ts', to: 'capacitor.config.ts' },
    { from: 'package.template.json', to: 'package.json' },
    { from: 'app.template.json', to: 'app.json' }
  ];

  for (const { from, to } of templateFiles) {
    const fromPath = path.join(outputDir, from);
    const toPath = path.join(outputDir, to);
    if (await fs.pathExists(fromPath)) {
      await fs.rename(fromPath, toPath);
    }
  }
}

/**
 * Generate package.json for Expo app
 */
export async function generatePackageJson(
  outputDir: string,
  config: AppConfig
): Promise<void> {
  const slug = generateSlug(config.appName);

  const packageJson = {
    name: slug,
    version: '1.0.0',
    main: 'node_modules/expo/AppEntry.js',
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
      web: 'expo start --web'
    },
    dependencies: {
      'expo': '~52.0.0',
      'expo-status-bar': '~2.0.0',
      'react': '18.3.1',
      'react-native': '0.76.9',
      'react-native-webview': '13.12.5',
      ...(config.pushNotifications && {
        'expo-notifications': '~0.29.0'
      })
    },
    devDependencies: {
      '@babel/core': '^7.24.0',
      '@types/react': '~18.3.12',
      'typescript': '~5.3.3'
    },
    private: true
  };

  await fs.writeJson(path.join(outputDir, 'package.json'), packageJson, { spaces: 2 });
}

/**
 * Generate app.json for Expo/EAS
 */
export async function generateAppJson(
  outputDir: string,
  config: AppConfig
): Promise<void> {
  const slug = generateSlug(config.appName);

  const appJson: Record<string, unknown> = {
    expo: {
      name: config.appName,
      slug: slug,
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'automatic',
      newArchEnabled: false,
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: config.splashColor
      },
      assetBundlePatterns: ['**/*'],
      ios: {
        supportsTablet: true,
        bundleIdentifier: config.bundleId,
        infoPlist: {
          NSCameraUsageDescription: 'This app uses the camera',
          NSMicrophoneUsageDescription: 'This app uses the microphone',
          NSLocationWhenInUseUsageDescription: 'This app uses your location'
        }
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: config.splashColor
        },
        package: config.bundleId,
        permissions: [
          'CAMERA',
          'RECORD_AUDIO',
          'ACCESS_FINE_LOCATION',
          'ACCESS_COARSE_LOCATION',
          'VIBRATE'
        ]
      },
      extra: {
        webviewUrl: config.url,
        eas: {}
      }
    }
  };

  // Add plugins only if needed (push notifications)
  if (config.pushNotifications) {
    (appJson.expo as Record<string, unknown>).plugins = ['expo-notifications'];
  }

  await fs.writeJson(path.join(outputDir, 'app.json'), appJson, { spaces: 2 });
}

/**
 * Generate capacitor.config.ts
 */
export async function generateCapacitorConfig(
  outputDir: string,
  config: AppConfig
): Promise<void> {
  const domain = extractDomain(config.url);

  const configContent = `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '${config.bundleId}',
  appName: '${config.appName}',
  webDir: 'src',
  server: {
    allowNavigation: ['${domain}', '*.${domain}']
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '${config.splashColor}',
    preferredContentMode: 'mobile'
  },
  android: {
    backgroundColor: '${config.splashColor}',
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '${config.splashColor}',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    ${config.pushNotifications ? `PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },` : ''}
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '${config.splashColor}'
    }
  }
};

export default config;
`;

  await fs.writeFile(path.join(outputDir, 'capacitor.config.ts'), configContent, 'utf-8');
}

/**
 * Generate App.tsx for Expo with WebView
 */
export async function generateIndexHtml(
  outputDir: string,
  config: AppConfig
): Promise<void> {
  // Generate App.tsx (React Native with WebView)
  const appContent = `import React, { useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, BackHandler, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';

const WEBVIEW_URL = '${config.url}';

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  React.useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      });
      return () => backHandler.remove();
    }
  }, [canGoBack]);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        ref={webViewRef}
        source={{ uri: WEBVIEW_URL }}
        style={styles.webview}
        onLoadEnd={() => setIsLoading(false)}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="${config.splashColor}" />
          </View>
        )}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '${config.splashColor}',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '${config.splashColor}',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '${config.splashColor}',
  },
});
`;

  await fs.writeFile(path.join(outputDir, 'App.tsx'), appContent, 'utf-8');

  // Generate tsconfig.json for Expo
  const tsconfig = {
    extends: 'expo/tsconfig.base',
    compilerOptions: {
      strict: true
    }
  };
  await fs.writeJson(path.join(outputDir, 'tsconfig.json'), tsconfig, { spaces: 2 });

  // Generate babel.config.js
  const babelConfig = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
`;
  await fs.writeFile(path.join(outputDir, 'babel.config.js'), babelConfig, 'utf-8');
}
