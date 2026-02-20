/**
 * Dino Music App - Dynamic Background
 * TIDAL-inspired dynamic backgrounds with blur, solid, or gradient modes
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getColors } from 'react-native-image-colors';
import { useTheme, useBackgroundStyle } from '../../hooks/useTheme';

interface AlbumColors {
  primary: string;
  secondary: string;
  background: string;
}

interface BlurredBackgroundProps {
  imageUri?: string;
  children?: React.ReactNode;
}

export const BlurredBackground: React.FC<BlurredBackgroundProps> = React.memo(({
  imageUri,
  children,
}) => {
  const theme = useTheme();
  const backgroundStyle = useBackgroundStyle();
  const [albumColors, setAlbumColors] = useState<AlbumColors | null>(null);

  useEffect(() => {
    if (!imageUri || backgroundStyle !== 'gradient') {
      setAlbumColors(null);
      return;
    }

    getColors(imageUri, {
      fallback: theme.colors.accent,
      cache: true,
      key: imageUri,
    })
      .then((result) => {
        if (result.platform === 'android') {
          setAlbumColors({
            primary: result.vibrant || result.lightVibrant || result.dominant || theme.colors.accent,
            secondary: result.darkVibrant || result.darkMuted || theme.colors.background.secondary,
            background: result.darkMuted || theme.colors.background.primary,
          });
        } else if (result.platform === 'ios') {
          setAlbumColors({
            primary: result.detail || result.primary || theme.colors.accent,
            secondary: result.secondary || theme.colors.background.secondary,
            background: result.background || theme.colors.background.primary,
          });
        }
      })
      .catch(() => {
        setAlbumColors(null);
      });
  }, [imageUri, backgroundStyle, theme.colors]);

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

  if (backgroundStyle === 'solid') {
    return (
      <View style={styles.container}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background.primary }]} />
        <LinearGradient
          colors={[
            theme.colors.background.primary,
            theme.colors.background.secondary,
            theme.colors.background.primary,
          ]}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }

  if (backgroundStyle === 'gradient' && albumColors) {
    const isDark = theme.mode !== 'light';
    const gradientOpacity = isDark ? 0.7 : 0.5;
    
    return (
      <View style={styles.container}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: albumColors.background }]} />
        <Image
          source={{ uri: imageUri }}
          style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.2 }] }]}
          blurRadius={80}
          resizeMode="cover"
        />
        <LinearGradient
          colors={[
            `${albumColors.primary}${Math.round(gradientOpacity * 40).toString(16).padStart(2, '0')}`,
            `${albumColors.secondary}${Math.round(gradientOpacity * 60).toString(16).padStart(2, '0')}`,
            `${albumColors.background}${Math.round(gradientOpacity * 90).toString(16).padStart(2, '0')}`,
          ]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[
            'transparent',
            `${theme.colors.background.primary}80`,
            theme.colors.background.primary,
          ]}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background.primary }]} />
      <Image
        source={{ uri: imageUri }}
        style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.2 }] }]}
        blurRadius={50}
        resizeMode="cover"
      />
      <LinearGradient
        colors={
          theme.mode === 'light'
            ? ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.8)']
            : ['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.8)']
        }
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
  },
});
