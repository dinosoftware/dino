/**
 * Dino Music App - Environment Configuration
 * Environment-specific configuration and utilities
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const ENV = {
  isDevelopment: __DEV__,
  isProduction: !__DEV__,
  
  platform: Platform.OS,
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  isWeb: Platform.OS === 'web',
  
  appVersion: Constants.expoConfig?.version || '1.0.0',
  buildNumber: Constants.expoConfig?.extra?.buildNumber || '1',
  
  // Device info
  deviceName: Constants.deviceName,
  systemVersion: Platform.Version,
};

export default ENV;
