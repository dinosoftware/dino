/**
 * Dino Music App - Album Colors Hook
 * Extract dominant colors from album artwork
 */

import { useState, useEffect } from 'react';
import { getColors } from 'react-native-image-colors';
import { theme } from '../config';
import { getContrastColor } from '../utils/colorUtils';

interface AlbumColors {
  primary: string;
  background: string;
  detail: string;
  textColor: string; // Contrasting text color for primary background
}

export const useAlbumColors = (imageUri?: string): AlbumColors => {
  const [colors, setColors] = useState<AlbumColors>({
    primary: theme.colors.accent,
    background: theme.colors.background.primary,
    detail: theme.colors.text.secondary,
    textColor: getContrastColor(theme.colors.accent),
  });

  useEffect(() => {
    if (!imageUri) {
      const defaultPrimary = theme.colors.accent;
      setColors({
        primary: defaultPrimary,
        background: theme.colors.background.primary,
        detail: theme.colors.text.secondary,
        textColor: getContrastColor(defaultPrimary),
      });
      return;
    }

    getColors(imageUri, {
      fallback: theme.colors.accent,
      cache: true,
      key: imageUri,
    })
      .then((result) => {
        let primaryColor = theme.colors.accent;
        
        if (result.platform === 'android') {
          // Prefer vibrant colors over dominant for brightness
          primaryColor = result.vibrant || result.lightVibrant || result.dominant || theme.colors.accent;
          setColors({
            primary: primaryColor,
            background: result.darkMuted || theme.colors.background.primary,
            detail: result.vibrant || theme.colors.text.secondary,
            textColor: getContrastColor(primaryColor),
          });
        } else if (result.platform === 'ios') {
          // iOS: prefer detail (usually vibrant) over primary
          primaryColor = result.detail || result.primary || theme.colors.accent;
          setColors({
            primary: primaryColor,
            background: result.background || theme.colors.background.primary,
            detail: result.detail || theme.colors.text.secondary,
            textColor: getContrastColor(primaryColor),
          });
        }
      })
      .catch((error) => {
        console.error('Failed to extract colors:', error);
        const defaultPrimary = theme.colors.accent;
        setColors({
          primary: defaultPrimary,
          background: theme.colors.background.primary,
          detail: theme.colors.text.secondary,
          textColor: getContrastColor(defaultPrimary),
        });
      });
  }, [imageUri]);

  return colors;
};
