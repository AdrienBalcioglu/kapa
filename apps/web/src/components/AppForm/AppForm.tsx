'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { BundleIdField } from './BundleIdField';
import { IconUpload } from './IconUpload';
import { appFormSchema, AppFormData } from '@/lib/validations';
import { createApp, startBuild } from '@/lib/api';

export function AppForm() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<AppFormData>({
    appName: 'Mon App Test',
    bundleId: 'com.monapp.test',
    url: 'https://example.com',
    splashColor: '#3B82F6',
    iconBase64: undefined,
    pushNotifications: false,
    sessionMode: 'cookie',
    platforms: ['ios'],
  });

  const updateField = <K extends keyof AppFormData>(field: K, value: AppFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const result = appFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const token = await getToken();
      const app = await createApp(result.data, token ?? undefined);
      const build = await startBuild(app.id, formData.platforms[0], token ?? undefined);
      router.push('/builds/' + build.id);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to create app' });
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.form && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {errors.form}
            </div>
          )}

          <Input
            id="appName"
            label="App Name"
            value={formData.appName}
            onChange={(e) => updateField('appName', e.target.value)}
            placeholder="My Awesome App"
            error={errors.appName}
          />

          <BundleIdField
            appName={formData.appName}
            value={formData.bundleId}
            onChange={(value) => updateField('bundleId', value)}
            error={errors.bundleId}
          />

          <Input
            id="url"
            label="Website URL"
            type="url"
            value={formData.url}
            onChange={(e) => updateField('url', e.target.value)}
            placeholder="https://example.com"
            error={errors.url}
          />

          <IconUpload
            value={formData.iconBase64}
            onChange={(value) => updateField('iconBase64', value)}
            error={errors.iconBase64}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Splash Screen Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.splashColor}
                onChange={(e) => updateField('splashColor', e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <Input
                value={formData.splashColor}
                onChange={(e) => updateField('splashColor', e.target.value)}
                placeholder="#3B82F6"
                className="flex-1"
                error={errors.splashColor}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="pushNotifications"
              checked={formData.pushNotifications}
              onChange={(e) => updateField('pushNotifications', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="pushNotifications" className="text-sm font-medium text-gray-700">
              Enable Push Notifications
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Mode
            </label>
            <select
              value={formData.sessionMode}
              onChange={(e) => updateField('sessionMode', e.target.value as 'cookie' | 'jwt' | 'none')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cookie">Cookie-based</option>
              <option value="jwt">JWT Token</option>
              <option value="none">No Session</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Platforms
            </label>
            <div className="flex gap-4">
              {(['ios', 'android'] as const).map((platform) => (
                <label key={platform} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.platforms.includes(platform)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateField('platforms', [...formData.platforms, platform]);
                      } else {
                        updateField('platforms', formData.platforms.filter((p) => p !== platform));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {platform === 'ios' ? 'iOS' : 'Android'}
                  </span>
                </label>
              ))}
            </div>
            {errors.platforms && <p className="mt-1 text-sm text-red-600">{errors.platforms}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
            Create App & Start Build
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
