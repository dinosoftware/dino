/**
 * Dino Music App - Album Detail Skeleton
 * Loading placeholder for album detail screen
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { TrackRowSkeleton } from './TrackRowSkeleton';

export const AlbumDetailSkeleton: React.FC = () => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    header: {
      padding: theme.spacing.xl,
      alignItems: 'center',
      paddingTop: 60,
    },
    coverArt: {
      width: 240,
      height: 240,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.background.card,
      marginBottom: theme.spacing.lg,
    },
    title: {
      height: 28,
      width: '80%',
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.xs,
    },
    artist: {
      height: 20,
      width: '50%',
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.sm,
    },
    metadata: {
      height: 16,
      width: '60%',
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.sm,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    playButton: {
      flex: 1,
      height: 48,
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.round,
    },
    shuffleButton: {
      width: 120,
      height: 48,
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.round,
    },
    iconButton: {
      width: 44,
      height: 44,
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.round,
    },
    trackList: {
      paddingHorizontal: theme.spacing.md,
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.coverArt, { opacity }]} />
        <Animated.View style={[styles.title, { opacity }]} />
        <Animated.View style={[styles.artist, { opacity }]} />
        <Animated.View style={[styles.metadata, { opacity }]} />
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Animated.View style={[styles.playButton, { opacity }]} />
        <Animated.View style={[styles.shuffleButton, { opacity }]} />
        <Animated.View style={[styles.iconButton, { opacity }]} />
      </View>

      {/* Track List */}
      <View style={styles.trackList}>
        {[...Array(8)].map((_, i) => (
          <TrackRowSkeleton key={i} />
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};
