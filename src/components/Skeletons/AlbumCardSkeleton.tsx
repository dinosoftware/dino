/**
 * Dino Music App - Album Card Skeleton
 * Loading placeholder for album cards
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../../config';

interface AlbumCardSkeletonProps {
  width?: number;
}

export const AlbumCardSkeleton: React.FC<AlbumCardSkeletonProps> = ({ width }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

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
    <View style={[styles.container, width ? { width } : null]}>
      <Animated.View style={[styles.cover, { opacity }, width ? { width, height: width } : null]} />
      <Animated.View style={[styles.title, { opacity }]} />
      <Animated.View style={[styles.artist, { opacity }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  title: {
    height: 16,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
    width: '80%',
  },
  artist: {
    height: 14,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.sm,
    width: '60%',
  },
});
