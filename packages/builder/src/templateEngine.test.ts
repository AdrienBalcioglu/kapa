import {
  replacePlaceholders,
  extractDomain,
  generateSlug,
  sanitizeBundleId
} from './templateEngine';

describe('templateEngine', () => {
  describe('replacePlaceholders', () => {
    it('should replace single placeholder', () => {
      const result = replacePlaceholders('Hello {{NAME}}!', { NAME: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should replace multiple placeholders', () => {
      const result = replacePlaceholders(
        '{{APP_NAME}} - {{URL}}',
        { APP_NAME: 'MyApp', URL: 'https://example.com' }
      );
      expect(result).toBe('MyApp - https://example.com');
    });

    it('should replace same placeholder multiple times', () => {
      const result = replacePlaceholders(
        '{{COLOR}} is {{COLOR}}',
        { COLOR: 'blue' }
      );
      expect(result).toBe('blue is blue');
    });

    it('should leave unknown placeholders unchanged', () => {
      const result = replacePlaceholders('{{KNOWN}} {{UNKNOWN}}', { KNOWN: 'value' });
      expect(result).toBe('value {{UNKNOWN}}');
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from https URL', () => {
      expect(extractDomain('https://www.example.com/path')).toBe('www.example.com');
    });

    it('should extract domain from http URL', () => {
      expect(extractDomain('http://example.com')).toBe('example.com');
    });

    it('should handle URL with port', () => {
      expect(extractDomain('https://example.com:8080/path')).toBe('example.com');
    });

    it('should handle subdomain', () => {
      expect(extractDomain('https://app.example.com')).toBe('app.example.com');
    });
  });

  describe('generateSlug', () => {
    it('should convert to lowercase', () => {
      expect(generateSlug('MyApp')).toBe('myapp');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('My Cool App')).toBe('my-cool-app');
    });

    it('should remove special characters', () => {
      expect(generateSlug('My App! @#$%')).toBe('my-app');
    });

    it('should trim leading and trailing hyphens', () => {
      expect(generateSlug(' - My App - ')).toBe('my-app');
    });
  });

  describe('sanitizeBundleId', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeBundleId('COM.Example.App')).toBe('com.example.app');
    });

    it('should remove invalid characters', () => {
      expect(sanitizeBundleId('com.my-app.test!')).toBe('com.myapp.test');
    });

    it('should remove consecutive dots', () => {
      expect(sanitizeBundleId('com..example...app')).toBe('com.example.app');
    });

    it('should remove leading and trailing dots', () => {
      expect(sanitizeBundleId('.com.example.app.')).toBe('com.example.app');
    });
  });
});
