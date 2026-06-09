import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maskedon.app',
  appName: 'MaskedOn',
  webDir: 'dist',
  server: {
    // Keep native WebView origin as capacitor://localhost so backend CORS
    // allowlist can reliably distinguish mobile app traffic.
    androidScheme: 'capacitor',
    iosScheme: 'capacitor',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#080c15',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080c15',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
