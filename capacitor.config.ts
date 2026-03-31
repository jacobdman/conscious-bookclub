/// <reference types="@capacitor-firebase/authentication" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.consciousbookclub.app',
  appName: 'Conscious Book Club',
  webDir: 'build',
  backgroundColor: '#F5F1EA',
  // Uncomment for live reload during native dev (run npm start, then cap run ios/android):
  // server: { url: 'http://192.168.0.132:3000', cleartext: true },
  plugins: {
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    FirebaseAuthentication: {
      providers: ['google.com'],
    },
  },
};

export default config;
