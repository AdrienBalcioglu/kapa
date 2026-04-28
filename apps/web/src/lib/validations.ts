import { z } from 'zod';

export const appFormSchema = z.object({
  appName: z
    .string()
    .min(2, 'App name must be at least 2 characters')
    .max(50, 'App name must be less than 50 characters'),
  bundleId: z
    .string()
    .regex(
      /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/,
      'Bundle ID must be in format: com.example.app'
    ),
  url: z
    .string()
    .url('Please enter a valid URL')
    .startsWith('https://', 'URL must use HTTPS'),
  splashColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color'),
  iconBase64: z.string().optional(),
  pushNotifications: z.boolean(),
  sessionMode: z.enum(['cookie', 'jwt', 'none']),
  platforms: z
    .array(z.enum(['ios', 'android']))
    .min(1, 'Please select at least one platform'),
});

export type AppFormData = z.infer<typeof appFormSchema>;

export function generateBundleId(appName: string): string {
  const sanitized = appName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  return `com.appbuilder.${sanitized || 'app'}`;
}
