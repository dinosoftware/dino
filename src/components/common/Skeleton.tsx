/**
 * Dino Music App - Skeleton Loader
 * Animated loading placeholders
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../config';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = theme.borderRadius.md,
  style,
}) => {
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
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.background.muted,
  },
});

// Preset skeleton components for common use cases
export const AlbumCardSkeleton: React.FC = () => (
  <View style={skeletonStyles.albumCard}>
    <Skeleton width={160} height={160} borderRadius={theme.borderRadius.lg} />
    <Skeleton width={140} height={16} style={{ marginTop: theme.spacing.sm }} />
    <Skeleton width={100} height={14} style={{ marginTop: theme.spacing.xs }} />
  </View>
);

export const HorizontalAlbumListSkeleton: React.FC = () => (
  <View style={skeletonStyles.section}>
    <View style={skeletonStyles.header}>
      <Skeleton width={150} height={24} />
    </View>
    <View style={skeletonStyles.horizontalList}>
      <AlbumCardSkeleton />
      <AlbumCardSkeleton />
      <AlbumCardSkeleton />
    </View>
  </View>
);

export const HeroBannerSkeleton: React.FC = () => (
  <View style={skeletonStyles.heroBanner}>
    <Skeleton width="100%" height={200} borderRadius={theme.borderRadius.lg} />
  </View>
);

export const RecentlyPlayedSkeleton: React.FC = () => (
  <View style={skeletonStyles.section}>
    <View style={skeletonStyles.header}>
      <Skeleton width={180} height={24} />
    </View>
    <View style={skeletonStyles.horizontalList}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={skeletonStyles.recentCard}>
          <Skeleton width={120} height={120} borderRadius={theme.borderRadius.md} />
          <Skeleton width={100} height={14} style={{ marginTop: theme.spacing.xs }} />
          <Skeleton width={80} height={12} style={{ marginTop: theme.spacing.xs }} />
        </View>
      ))}
    </View>
  </View>
);

const skeletonStyles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.xl,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  horizontalList: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  albumCard: {
    width: 160,
    marginRight: theme.spacing.md,
  },
  recentCard: {
    width: 120,
  },
  heroBanner: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
});
