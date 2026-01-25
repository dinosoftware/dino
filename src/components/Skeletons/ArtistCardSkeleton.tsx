/**
 * Dino Music App - Artist Card Skeleton
 * Loading placeholder for artist cards
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../../config';

interface ArtistCardSkeletonProps {
  width?: number;
}

export const ArtistCardSkeleton: React.FC<ArtistCardSkeletonProps> = ({ width }) => {
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
      <Animated.View style={[styles.image, { opacity }, width ? { width, height: width } : null]} />
      <Animated.View style={[styles.name, { opacity }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.background.card,
    borderRadius: 999, // Circular for artist images
    marginBottom: theme.spacing.sm,
  },
  name: {
    height: 16,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.sm,
    width: '80%',
  },
});
