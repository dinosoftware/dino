/**
 * Dino Music App - Blurred Background
 * Dynamic blur background for screens
 */

import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../config';

interface BlurredBackgroundProps {
  imageUri?: string;
  children?: React.ReactNode;
}

export const BlurredBackground: React.FC<BlurredBackgroundProps> = ({
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
      {/* Large blurred background image */}
      <ImageBackground
        source={{ uri: imageUri }}
        style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.2 }] }]}
        blurRadius={50}
        resizeMode="cover"
      >
        {/* Lighter blur overlay for better visibility */}
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
          {/* Much lighter gradient to show more of the image */}
          <LinearGradient
            colors={[
              'rgba(0, 0, 0, 0.3)',   // Very light at top - shows image
              'rgba(0, 0, 0, 0.5)',   // Medium in middle
              'rgba(0, 0, 0, 0.7)',   // Darker at bottom for readability
            ]}
            style={StyleSheet.absoluteFill}
          />
        </BlurView>
      </ImageBackground>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
});
