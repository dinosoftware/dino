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
  vibrant: string;
}

interface DynamicBackgroundProps {
  imageUri?: string;
  children?: React.ReactNode;
}

export const DynamicBackground: React.FC<DynamicBackgroundProps> = React.memo(({
  imageUri,
  children,
}) => {
  const theme = useTheme();
  const backgroundStyle = useBackgroundStyle();
  const [albumColors, setAlbumColors] = useState<AlbumColors | null>(null);

  useEffect(() => {
    if (!imageUri || backgroundStyle === 'solid') {
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
            vibrant: result.vibrant || result.lightVibrant || theme.colors.accent,
          });
        } else if (result.platform === 'ios') {
          setAlbumColors({
            primary: result.detail || result.primary || theme.colors.accent,
            secondary: result.secondary || theme.colors.background.secondary,
            background: result.background || theme.colors.background.primary,
            vibrant: result.detail || result.primary || theme.colors.accent,
          });
        }
      })
      .catch(() => {
        setAlbumColors(null);
      });
  }, [imageUri, backgroundStyle, theme.colors.accent, theme.colors.background.primary, theme.colors.background.secondary]);

  if (backgroundStyle === 'solid') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        {children}
      </View>
    );
  }

  if (backgroundStyle === 'gradient' && albumColors && imageUri) {
    const isDark = theme.mode !== 'light';
    
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={
            isDark
              ? [`${albumColors.primary}30`, `${albumColors.secondary}50`, `${albumColors.background}80`, theme.colors.background.primary]
              : [`${albumColors.primary}15`, `${albumColors.secondary}25`, `${albumColors.background}40`, theme.colors.background.primary]
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {children}
      </View>
    );
  }

  if (backgroundStyle === 'blur' && imageUri) {
    const isDark = theme.mode !== 'light';
    
    return (
      <View style={styles.container}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background.primary }]} />
        <Image
          source={{ uri: imageUri }}
          style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.2 }] }]}
          blurRadius={60}
          resizeMode="cover"
        />
        <LinearGradient
          colors={
            isDark
              ? ['transparent', `${theme.colors.background.primary}80`, theme.colors.background.primary]
              : ['transparent', `${theme.colors.background.primary}60`, theme.colors.background.primary]
          }
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {children}
    </View>
  );
});

DynamicBackground.displayName = 'DynamicBackground';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export const useDynamicGradient = (imageUri?: string) => {
  const theme = useTheme();
  const backgroundStyle = useBackgroundStyle();
  const [albumColors, setAlbumColors] = useState<AlbumColors | null>(null);

  useEffect(() => {
    if (!imageUri || backgroundStyle === 'solid') {
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
            vibrant: result.vibrant || result.lightVibrant || theme.colors.accent,
          });
        } else if (result.platform === 'ios') {
          setAlbumColors({
            primary: result.detail || result.primary || theme.colors.accent,
            secondary: result.secondary || theme.colors.background.secondary,
            background: result.background || theme.colors.background.primary,
            vibrant: result.detail || result.primary || theme.colors.accent,
          });
        }
      })
      .catch(() => {
        setAlbumColors(null);
      });
  }, [imageUri, backgroundStyle, theme]);

  if (backgroundStyle === 'solid' || !albumColors) {
    return {
      colors: [theme.colors.background.primary, theme.colors.background.primary],
      hasGradient: false,
    };
  }

  const isDark = theme.mode !== 'light';
  
  if (backgroundStyle === 'gradient') {
    return {
      colors: isDark
        ? [`${albumColors.primary}30`, `${albumColors.secondary}50`, `${albumColors.background}80`, theme.colors.background.primary]
        : [`${albumColors.primary}15`, `${albumColors.secondary}25`, `${albumColors.background}40`, theme.colors.background.primary],
      hasGradient: true,
    };
  }

  return {
    colors: isDark
      ? ['transparent', `${theme.colors.background.primary}80`, theme.colors.background.primary]
      : ['transparent', `${theme.colors.background.primary}60`, theme.colors.background.primary],
    hasGradient: true,
  };
};
