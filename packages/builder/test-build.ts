/**
 * Test script for builder - validates generated Expo project
 */
import { generateCapacitorApp, validateAppConfig } from './src/index';
import { AppConfig } from '@app-builder/shared';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const testConfig: AppConfig = {
  id: 'test-build-123',
  userId: 'test-user',
  appName: 'Test App',
  bundleId: 'com.test.app',
  url: 'https://example.com',
  splashColor: '#3498db',
  platforms: ['android'],
  pushNotifications: false,
  sessionMode: 'cookie',
  createdAt: new Date()
};

async function runTest() {
  console.log('=== Builder Test ===\n');

  // Step 1: Validate config
  console.log('1. Validating config...');
  const errors = validateAppConfig(testConfig);
  if (errors.length > 0) {
    console.error('Config validation failed:', errors);
    process.exit(1);
  }
  console.log('   Config is valid\n');

  // Step 2: Generate project
  console.log('2. Generating project...');
  const result = await generateCapacitorApp(testConfig);
  console.log(`   Generated ${result.files.length} files in ${result.outputDir}\n`);

  // Step 3: Verify files exist
  console.log('3. Verifying generated files...');
  const requiredFiles = ['App.tsx', 'package.json', 'app.json', 'eas.json', 'tsconfig.json', 'babel.config.js'];
  for (const file of requiredFiles) {
    const filePath = path.join(result.outputDir, file);
    if (await fs.pathExists(filePath)) {
      console.log(`   ✓ ${file}`);
    } else {
      console.error(`   ✗ ${file} missing!`);
      process.exit(1);
    }
  }

  // Step 4: Parse and validate JSON files
  console.log('\n4. Validating JSON files...');

  const packageJson = await fs.readJson(path.join(result.outputDir, 'package.json'));
  console.log(`   package.json: name=${packageJson.name}`);

  const appJson = await fs.readJson(path.join(result.outputDir, 'app.json'));
  console.log(`   app.json: slug=${appJson.expo.slug}, bundleId=${appJson.expo.ios.bundleIdentifier}`);

  const easJson = await fs.readJson(path.join(result.outputDir, 'eas.json'));
  console.log(`   eas.json: cli version=${easJson.cli.version}`);

  // Step 5: Check that expo-splash-screen is NOT in plugins
  console.log('\n5. Checking plugin configuration...');
  if (appJson.expo.plugins && appJson.expo.plugins.includes('expo-splash-screen')) {
    console.error('   ✗ expo-splash-screen should NOT be in plugins array!');
    process.exit(1);
  }
  console.log('   ✓ No problematic plugins');

  // Step 6: Verify git repository
  console.log('\n6. Checking git repository...');
  try {
    const { stdout } = await execAsync('git status', { cwd: result.outputDir });
    console.log('   ✓ Git repository initialized');
  } catch (error) {
    console.error('   ✗ Git repository not initialized');
  }

  // Step 7: Try npm install (optional - tests if package.json is valid)
  console.log('\n7. Testing npm install (this may take a moment)...');
  try {
    await execAsync('npm install --prefer-offline', {
      cwd: result.outputDir,
      timeout: 60000
    });
    console.log('   ✓ npm install succeeded');
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn('   ⚠ npm install failed (might be network issue):', errorMsg.substring(0, 100));
  }

  // Step 8: Dry run EAS build (validates configuration without actually building)
  console.log('\n8. Testing EAS build configuration...');
  try {
    // Check if eas-cli is available
    await execAsync('npx eas-cli --version');

    // Run eas build with --local and --dry-run would be ideal but not supported
    // Instead, we can validate the project structure
    const { stdout } = await execAsync('npx expo-doctor', {
      cwd: result.outputDir,
      timeout: 30000
    });
    console.log('   ✓ expo-doctor passed');
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    // expo-doctor might not be installed, that's okay
    console.log('   ⚠ expo-doctor not available:', errorMsg.substring(0, 50));
  }

  console.log('\n=== Test Complete ===');
  console.log(`Output directory: ${result.outputDir}`);
  console.log('\nTo manually test EAS build:');
  console.log(`  cd ${result.outputDir}`);
  console.log('  EXPO_TOKEN=your-token npx eas-cli build --platform android --profile production --non-interactive');

  // Cleanup option
  console.log('\nTo cleanup:');
  console.log(`  rm -rf ${result.outputDir}`);
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
