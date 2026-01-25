/**
 * Dino Music App - Artist Detail Skeleton
 * Loading placeholder for artist detail screen
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView, FlatList } from 'react-native';
import { theme } from '../../config';
import { AlbumCardSkeleton } from './AlbumCardSkeleton';

export const ArtistDetailSkeleton: React.FC = () => {
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.avatar, { opacity }]} />
        <Animated.View style={[styles.name, { opacity }]} />
        <Animated.View style={[styles.albumCount, { opacity }]} />
      </View>

      {/* Albums Section */}
      <View style={styles.albumsSection}>
        <Animated.View style={[styles.sectionTitle, { opacity }]} />
        <FlatList
          data={[...Array(6)]}
          numColumns={2}
          scrollEnabled={false}
          keyExtractor={(_, index) => `skeleton-${index}`}
          renderItem={() => (
            <View style={styles.albumContainer}>
              <AlbumCardSkeleton />
            </View>
          )}
          contentContainerStyle={styles.albumsList}
        />
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    paddingTop: 60,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: theme.colors.background.card,
    marginBottom: theme.spacing.lg,
  },
  name: {
    height: 32,
    width: '70%',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  albumCount: {
    height: 18,
    width: '40%',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.sm,
  },
  albumsSection: {
    paddingTop: theme.spacing.lg,
  },
  sectionTitle: {
    height: 24,
    width: 100,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  albumsList: {
    paddingHorizontal: theme.spacing.md,
  },
  albumContainer: {
    flex: 1,
    margin: theme.spacing.sm,
    maxWidth: '50%',
  },
});
