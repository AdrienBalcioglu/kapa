import sharp from 'sharp';
import fs from 'fs-extra';
import path from 'path';

export interface IconSizes {
  name: string;
  size: number;
}

const IOS_ICON_SIZES: IconSizes[] = [
  { name: 'icon-20.png', size: 20 },
  { name: 'icon-20@2x.png', size: 40 },
  { name: 'icon-20@3x.png', size: 60 },
  { name: 'icon-29.png', size: 29 },
  { name: 'icon-29@2x.png', size: 58 },
  { name: 'icon-29@3x.png', size: 87 },
  { name: 'icon-40.png', size: 40 },
  { name: 'icon-40@2x.png', size: 80 },
  { name: 'icon-40@3x.png', size: 120 },
  { name: 'icon-60@2x.png', size: 120 },
  { name: 'icon-60@3x.png', size: 180 },
  { name: 'icon-76.png', size: 76 },
  { name: 'icon-76@2x.png', size: 152 },
  { name: 'icon-83.5@2x.png', size: 167 },
  { name: 'icon-1024.png', size: 1024 },
];

const ANDROID_ICON_SIZES: IconSizes[] = [
  { name: 'mipmap-mdpi/ic_launcher.png', size: 48 },
  { name: 'mipmap-hdpi/ic_launcher.png', size: 72 },
  { name: 'mipmap-xhdpi/ic_launcher.png', size: 96 },
  { name: 'mipmap-xxhdpi/ic_launcher.png', size: 144 },
  { name: 'mipmap-xxxhdpi/ic_launcher.png', size: 192 },
  { name: 'mipmap-mdpi/ic_launcher_round.png', size: 48 },
  { name: 'mipmap-hdpi/ic_launcher_round.png', size: 72 },
  { name: 'mipmap-xhdpi/ic_launcher_round.png', size: 96 },
  { name: 'mipmap-xxhdpi/ic_launcher_round.png', size: 144 },
  { name: 'mipmap-xxxhdpi/ic_launcher_round.png', size: 192 },
];

/**
 * Process icon from base64 and generate all required sizes
 */
export async function processIcon(
  iconBase64: string,
  outputDir: string,
  platforms: ('ios' | 'android')[]
): Promise<void> {
  // Remove data URL prefix if present
  const base64Data = iconBase64.replace(/^data:image\/\w+;base64,/, '');
  const iconBuffer = Buffer.from(base64Data, 'base64');

  // Validate image
  const metadata = await sharp(iconBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid icon image');
  }

  // Generate assets for Expo/EAS
  const assetsDir = path.join(outputDir, 'assets');
  await fs.ensureDir(assetsDir);

  // Main icon (1024x1024)
  await sharp(iconBuffer)
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  // Adaptive icon for Android
  await sharp(iconBuffer)
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));

  // Generate splash screen with icon centered
  await generateSplashScreen(iconBuffer, assetsDir);

  // Generate platform-specific icons if needed
  if (platforms.includes('ios')) {
    await generateIOSIcons(iconBuffer, outputDir);
  }

  if (platforms.includes('android')) {
    await generateAndroidIcons(iconBuffer, outputDir);
  }
}

/**
 * Generate iOS icon set
 */
async function generateIOSIcons(iconBuffer: Buffer, outputDir: string): Promise<void> {
  const iosIconDir = path.join(outputDir, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  await fs.ensureDir(iosIconDir);

  await Promise.all(
    IOS_ICON_SIZES.map(async ({ name, size }) => {
      await sharp(iconBuffer)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(path.join(iosIconDir, name));
    })
  );

  // Generate Contents.json for iOS
  const contentsJson = {
    images: IOS_ICON_SIZES.map(({ name, size }) => ({
      filename: name,
      idiom: size <= 87 ? 'iphone' : 'ipad',
      scale: name.includes('@3x') ? '3x' : name.includes('@2x') ? '2x' : '1x',
      size: `${Math.floor(size / (name.includes('@3x') ? 3 : name.includes('@2x') ? 2 : 1))}x${Math.floor(size / (name.includes('@3x') ? 3 : name.includes('@2x') ? 2 : 1))}`
    })),
    info: { author: 'app-builder', version: 1 }
  };
  await fs.writeJson(path.join(iosIconDir, 'Contents.json'), contentsJson, { spaces: 2 });
}

/**
 * Generate Android icon set
 */
async function generateAndroidIcons(iconBuffer: Buffer, outputDir: string): Promise<void> {
  const androidResDir = path.join(outputDir, 'android', 'app', 'src', 'main', 'res');

  // Create all mipmap directories
  const mipmapDirs = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
  await Promise.all(
    mipmapDirs.map(dir => fs.ensureDir(path.join(androidResDir, `mipmap-${dir}`)))
  );

  await Promise.all(
    ANDROID_ICON_SIZES.map(async ({ name, size }) => {
      const fullPath = path.join(androidResDir, name);
      await fs.ensureDir(path.dirname(fullPath));
      await sharp(iconBuffer)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(fullPath);
    })
  );
}

/**
 * Generate splash screen with centered icon
 */
async function generateSplashScreen(
  iconBuffer: Buffer,
  assetsDir: string,
  backgroundColor = '#FFFFFF'
): Promise<void> {
  // Parse background color
  const hexColor = backgroundColor.replace('#', '');
  const r = parseInt(hexColor.substring(0, 2), 16) || 255;
  const g = parseInt(hexColor.substring(2, 4), 16) || 255;
  const b = parseInt(hexColor.substring(4, 6), 16) || 255;

  // Create splash screen (2732x2732 for all devices)
  const splashSize = 2732;
  const iconSize = 512;

  const iconResized = await sharp(iconBuffer)
    .resize(iconSize, iconSize, { fit: 'cover' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: splashSize,
      height: splashSize,
      channels: 3,
      background: { r, g, b }
    }
  })
    .composite([{
      input: iconResized,
      top: Math.floor((splashSize - iconSize) / 2),
      left: Math.floor((splashSize - iconSize) / 2)
    }])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
}

/**
 * Generate a default icon with app initial
 */
export async function generateDefaultIcon(
  appName: string,
  backgroundColor: string,
  outputDir: string
): Promise<void> {
  const assetsDir = path.join(outputDir, 'assets');
  await fs.ensureDir(assetsDir);

  const initial = appName.charAt(0).toUpperCase();
  const hexColor = backgroundColor.replace('#', '');
  const r = parseInt(hexColor.substring(0, 2), 16) || 100;
  const g = parseInt(hexColor.substring(2, 4), 16) || 100;
  const b = parseInt(hexColor.substring(4, 6), 16) || 100;

  // Create a simple colored square with the initial
  const svgIcon = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="rgb(${r},${g},${b})"/>
      <text
        x="512"
        y="512"
        font-size="512"
        font-family="Arial, sans-serif"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        dominant-baseline="central"
      >${initial}</text>
    </svg>
  `;

  await sharp(Buffer.from(svgIcon))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  await sharp(Buffer.from(svgIcon))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));

  // Simple splash
  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 3,
      background: { r, g, b }
    }
  })
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
}
