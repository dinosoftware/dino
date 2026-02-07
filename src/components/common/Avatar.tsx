/**
 * Dino Music App - Avatar Component
 * User avatar with fallback to initials
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../config';
import { apiClient } from '../../api/client';

interface AvatarProps {
  username: string;
  avatarUrl?: string; // Optional: if not provided, will auto-build from username
  size?: number;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  username, 
  avatarUrl: providedAvatarUrl, 
  size = 40,
  style 
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [builtAvatarUrl, setBuiltAvatarUrl] = useState<string | null>(null);

  // Auto-build avatar URL if not provided
  useEffect(() => {
    if (!providedAvatarUrl && username) {
      apiClient.buildAvatarUrl(username).then(url => {
        setBuiltAvatarUrl(url);
      });
    }
  }, [username, providedAvatarUrl]);

  // Get initial from username (first letter only, like UserAvatar)
  const getInitial = (name: string): string => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const initial = getInitial(username);
  const avatarUrl = providedAvatarUrl || builtAvatarUrl;
  const showFallback = !avatarUrl || hasError || isLoading;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {!showFallback && avatarUrl && (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => {
            console.log('[Avatar] Failed to load avatar for:', username);
            setHasError(true);
            setIsLoading(false);
          }}
          onLoad={() => {
            console.log('[Avatar] Successfully loaded avatar for:', username);
            setIsLoading(false);
          }}
        />
      )}
      {showFallback && (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initial, { fontSize: size * 0.5 }]}>
            {initial}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: theme.colors.text.primary, // White circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: theme.colors.background.primary, // Dark text on white background
    fontFamily: theme.typography.fontFamily.bold,
    textAlign: 'center',
  },
});
