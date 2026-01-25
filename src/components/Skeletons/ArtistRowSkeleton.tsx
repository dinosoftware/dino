/**
 * Dino Music App - Artist Row Skeleton
 * Loading placeholder for artist list rows
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../../config';

export const ArtistRowSkeleton: React.FC = () => {
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
    <View style={styles.container}>
      <Animated.View style={[styles.avatar, { opacity }]} />
      <View style={styles.content}>
        <Animated.View style={[styles.name, { opacity }]} />
        <Animated.View style={[styles.details, { opacity }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.background.card,
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  name: {
    height: 18,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
    width: '60%',
  },
  details: {
    height: 14,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.sm,
    width: '40%',
  },
});
