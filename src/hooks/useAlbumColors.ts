/**
 * Dino Music App - Album Colors Hook
 * Extract dominant colors from album artwork
 */

import { useState, useEffect } from 'react';
import { getColors } from 'react-native-image-colors';
import { useTheme } from './useTheme';
import { getContrastColor } from '../utils/colorUtils';

interface AlbumColors {
  primary: string;
  secondary: string;
  background: string;
  detail: string;
  textColor: string;
}

export const useAlbumColors = (imageUri?: string): AlbumColors => {
  const theme = useTheme();
  
  const getDefaultColors = () => ({
    primary: theme.colors.accent,
    secondary: theme.colors.background.secondary,
    background: theme.colors.background.primary,
    detail: theme.colors.text.secondary,
    textColor: getContrastColor(theme.colors.accent),
  });
  
  const [colors, setColors] = useState<AlbumColors>(getDefaultColors);

  useEffect(() => {
    if (!imageUri) {
      setColors(getDefaultColors());
      return;
    }

    getColors(imageUri, {
      fallback: theme.colors.accent,
      cache: true,
      key: imageUri,
    })
      .then((result) => {
        if (result.platform === 'android') {
          const primaryColor = result.vibrant || result.lightVibrant || result.dominant || theme.colors.accent;
          setColors({
            primary: primaryColor,
            secondary: result.darkVibrant || result.darkMuted || theme.colors.background.secondary,
            background: result.darkMuted || theme.colors.background.primary,
            detail: result.vibrant || theme.colors.text.secondary,
            textColor: getContrastColor(primaryColor),
          });
        } else if (result.platform === 'ios') {
          const primaryColor = result.detail || result.primary || theme.colors.accent;
          setColors({
            primary: primaryColor,
            secondary: result.secondary || theme.colors.background.secondary,
            background: result.background || theme.colors.background.primary,
            detail: result.detail || theme.colors.text.secondary,
            textColor: getContrastColor(primaryColor),
          });
        }
      })
      .catch((error) => {
        console.error('Failed to extract colors:', error);
        setColors(getDefaultColors());
      });
  }, [imageUri, theme]);

  return colors;
};
