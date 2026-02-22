import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.claw.control',
  appName: 'ClawControl',
  webDir: 'dist',
  server: {
    // Use https:// origin instead of capacitor:// to avoid CORS/mixed-content issues
    hostname: 'localhost',
    iosScheme: 'https',
    androidScheme: 'https',
    allowNavigation: ['*']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#06080a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashImmersive: true
    },
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#06080a'
    }
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#06080a',
    scheme: 'ClawControl',
    preferredContentMode: 'mobile'
  },
  android: {
    backgroundColor: '#06080a',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
}

export default config
