/**
 * Dino Music App - Blurred Background
 * Dynamic blur background for screens
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../config';

interface BlurredBackgroundProps {
  imageUri?: string;
  children?: React.ReactNode;
}

export const BlurredBackground: React.FC<BlurredBackgroundProps> = React.memo(({
  imageUri,
  children,
}) => {
  if (!imageUri) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.background.primary, theme.colors.background.secondary]}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Solid background to prevent white flash */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background.primary }]} />
      
      {/* Static blurred background image - always works even for GIFs (uses first frame) */}
      <Image
        source={{ uri: imageUri }}
        style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.2 }] }]}
        blurRadius={50}
        resizeMode="cover"
      />
      
      {/* Gradient overlay for readability */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.4)',   // Light at top
          'rgba(0, 0, 0, 0.6)',   // Medium in middle
          'rgba(0, 0, 0, 0.8)',   // Dark at bottom
        ]}
        style={StyleSheet.absoluteFill}
      />
      
      {children}
    </View>
  );
});

BlurredBackground.displayName = 'BlurredBackground';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
});
