import fs from 'fs-extra';

export interface TemplatePlaceholders {
  [key: string]: string;
}

/**
 * Replace all placeholders in a string
 * Placeholders are in format {{PLACEHOLDER_NAME}}
 */
export function replacePlaceholders(content: string, placeholders: TemplatePlaceholders): string {
  let result = content;
  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * Replace placeholders in a file and write the result
 */
export async function replaceInFile(
  filePath: string,
  placeholders: TemplatePlaceholders
): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  const replaced = replacePlaceholders(content, placeholders);
  await fs.writeFile(filePath, replaced, 'utf-8');
}

/**
 * Process multiple files with the same placeholders
 */
export async function replaceInFiles(
  filePaths: string[],
  placeholders: TemplatePlaceholders
): Promise<void> {
  await Promise.all(filePaths.map(fp => replaceInFile(fp, placeholders)));
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // If URL is invalid, return as-is
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}

/**
 * Generate a slug from app name
 */
export function generateSlug(appName: string): string {
  return appName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate and sanitize bundle ID
 */
export function sanitizeBundleId(bundleId: string): string {
  // Bundle ID should be in format: com.example.app
  // Only allow lowercase letters, numbers, and dots
  return bundleId
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/, '');
}
