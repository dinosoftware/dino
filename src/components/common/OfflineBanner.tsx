/**
 * Dino Music App - Offline Banner
 * Shows when the app is in offline mode
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import * as Network from 'expo-network';
import { theme } from '../../config';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const checkNetworkStatus = async () => {
      const networkState = await Network.getNetworkStateAsync();
      setIsOffline(!networkState.isConnected);
    };

    // Check immediately
    checkNetworkStatus();

    // Poll every 5 seconds
    const interval = setInterval(checkNetworkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.content}>
        <WifiOff size={14} color={theme.colors.text.inverse} strokeWidth={2.5} />
        <Text style={styles.text}>Offline Mode</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.warning || '#f59e0b',
  },
  content: {
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.semibold,
  },
});
