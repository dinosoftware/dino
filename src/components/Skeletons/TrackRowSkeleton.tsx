/**
 * Dino Music App - Track Row Skeleton
 * Loading placeholder for track rows
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface TrackRowSkeletonProps {
  showAlbumArt?: boolean;
}

export const TrackRowSkeleton: React.FC<TrackRowSkeletonProps> = ({ showAlbumArt = false }) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    albumArt: {
      width: 48,
      height: 48,
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.sm,
      marginRight: theme.spacing.md,
    },
    content: {
      flex: 1,
    },
    title: {
      height: 16,
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.xs,
      width: '70%',
    },
    artist: {
      height: 14,
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.sm,
      width: '50%',
    },
    duration: {
      height: 14,
      width: 40,
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.sm,
    },
  }), [theme]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={styles.container}>
      {showAlbumArt && (
        <Animated.View style={[styles.albumArt, { opacity }]} />
      )}
      <View style={styles.content}>
        <Animated.View style={[styles.title, { opacity }]} />
        <Animated.View style={[styles.artist, { opacity }]} />
      </View>
      <Animated.View style={[styles.duration, { opacity }]} />
    </View>
  );
};
