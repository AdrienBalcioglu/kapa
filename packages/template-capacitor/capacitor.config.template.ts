import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '{{BUNDLE_ID}}',
  appName: '{{APP_NAME}}',
  webDir: 'src',
  server: {
    // Pour webview externe, on utilise allowNavigation
    allowNavigation: ['{{APP_URL_DOMAIN}}', '*.{{APP_URL_DOMAIN}}']
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '{{SPLASH_COLOR}}',
    preferredContentMode: 'mobile'
  },
  android: {
    backgroundColor: '{{SPLASH_COLOR}}',
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '{{SPLASH_COLOR}}',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '{{SPLASH_COLOR}}'
    }
  }
};

export default config;
