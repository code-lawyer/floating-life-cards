import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fusheng.cards',
  appName: '浮生牌局',
  webDir: 'dist',
  backgroundColor: '#17213b',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  android: {
    adjustMarginsForEdgeToEdge: 'auto',
    backgroundColor: '#17213b',
  },
};

export default config;
