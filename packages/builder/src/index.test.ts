import { validateAppConfig } from './index';
import { AppConfig } from '@app-builder/shared';

describe('validateAppConfig', () => {
  const validConfig: AppConfig = {
    id: 'test-123',
    userId: 'user-456',
    appName: 'Test App',
    bundleId: 'com.example.testapp',
    url: 'https://example.com',
    splashColor: '#FFFFFF',
    pushNotifications: false,
    sessionMode: 'cookie',
    platforms: ['ios', 'android'],
    createdAt: new Date()
  };

  it('should return empty array for valid config', () => {
    const errors = validateAppConfig(validConfig);
    expect(errors).toEqual([]);
  });

  it('should detect missing app ID', () => {
    const config = { ...validConfig, id: '' };
    const errors = validateAppConfig(config);
    expect(errors).toContain('Missing app ID');
  });

  it('should detect missing app name', () => {
    const config = { ...validConfig, appName: '' };
    const errors = validateAppConfig(config);
    expect(errors).toContain('App name is required');
  });

  it('should detect invalid bundle ID', () => {
    const config = { ...validConfig, bundleId: 'invalid' };
    const errors = validateAppConfig(config);
    expect(errors).toContain('Invalid bundle ID format (expected: com.example.app)');
  });

  it('should detect invalid URL', () => {
    const config = { ...validConfig, url: 'not-a-url' };
    const errors = validateAppConfig(config);
    expect(errors).toContain('Invalid URL format');
  });

  it('should detect invalid splash color', () => {
    const config = { ...validConfig, splashColor: 'red' };
    const errors = validateAppConfig(config);
    expect(errors).toContain('Invalid splash color format (expected: #RRGGBB)');
  });

  it('should detect missing platforms', () => {
    const config = { ...validConfig, platforms: [] as ('ios' | 'android')[] };
    const errors = validateAppConfig(config);
    expect(errors).toContain('At least one platform (ios or android) is required');
  });

  it('should accept valid bundle ID formats', () => {
    const validBundleIds = [
      'com.example.app',
      'com.example.myapp',
      'io.company.app123',
      'org.nonprofit.app'
    ];

    for (const bundleId of validBundleIds) {
      const config = { ...validConfig, bundleId };
      const errors = validateAppConfig(config);
      expect(errors).not.toContain('Invalid bundle ID format (expected: com.example.app)');
    }
  });
});
