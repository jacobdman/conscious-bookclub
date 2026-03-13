import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.consciousbookclub.app',
  appName: 'Conscious Book Club',
  webDir: 'build',
  // Uncomment for live reload during native dev (run npm start, then cap run ios/android):
  // server: { url: 'http://YOUR_LOCAL_IP:3000', cleartext: true },
};

export default config;
