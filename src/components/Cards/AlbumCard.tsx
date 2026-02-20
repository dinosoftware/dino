/**
 * Dino Music App - Album Card
 * shadcn/ui-inspired album card with clean, modern aesthetics
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Download } from 'lucide-react-native';
import { Album } from '../../api/opensubsonic/types';
import { useTheme } from '../../hooks/useTheme';
import { useDownloadStore } from '../../stores/downloadStore';

interface AlbumCardProps {
  album: Album;
  onPress: () => void;
  onLongPress?: () => void;
  coverArtUrl?: string;
  width?: number;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({
  album,
  onPress,
  onLongPress,
  coverArtUrl,
  width,
}) => {
  const theme = useTheme();
  const [scaleAnim] = useState(new Animated.Value(1));
  const { isAlbumDownloaded } = useDownloadStore();
  const isDownloaded = isAlbumDownloaded(album.id);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      width: '100%',
    },
    coverContainer: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.background.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    cover: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    placeholderCover: {
      backgroundColor: theme.colors.background.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: theme.typography.fontSize.huge,
      color: theme.colors.text.muted,
      fontFamily: theme.typography.fontFamily.medium,
    },
    info: {
      marginTop: theme.spacing.sm,
      gap: 4,
    },
    title: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text.primary,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.tight,
    },
    artist: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.secondary,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
    },
    downloadBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.md,
    },
  }), [theme]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  return (
    <TouchableOpacity
      style={[styles.container, width ? { width } : null]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View 
        style={[
          styles.coverContainer, 
          width ? { width, height: width } : null,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        {coverArtUrl ? (
          <Image source={{ uri: coverArtUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholderCover]}>
            <Text style={styles.placeholderText}>♪</Text>
          </View>
        )}
        {isDownloaded && (
          <View style={styles.downloadBadge}>
            <Download size={14} color={theme.colors.text.inverse} strokeWidth={2.5} />
          </View>
        )}
      </Animated.View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {album.name}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {album.artist || 'Unknown Artist'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
