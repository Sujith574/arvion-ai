import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arvion.app',
  appName: 'Arvion AI',
  webDir: 'out',
  server: {
    url: 'https://arvion-backend-348624065149.us-central1.run.app',
    cleartext: true
  }
};


export default config;
