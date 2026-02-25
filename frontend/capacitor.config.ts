import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arvion.app',
  appName: 'Arvix AI',
  webDir: 'out',
  server: {
    // This points the app directly to your Cloud Run frontend
    // Any code you push to Cloud Run will automatically update in the app!
    url: 'https://arvion-frontend-348624065149.us-central1.run.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  ios: {
    contentInset: 'always'
  }
};


export default config;
