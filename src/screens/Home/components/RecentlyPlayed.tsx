/**
 * Dino Music App - Recently Played Component
 * Horizontal carousel of recently played albums
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAlbums, useCoverArt } from '../../../hooks/api';
import { AlbumCard } from '../../../components/Cards';
import { AlbumMenuWrapper } from '../../../components/Menus';
import { EmptyState, ErrorView, Skeleton } from '../../../components/common';
import { AlbumCardSkeleton } from '../../../components/Skeletons';
import { useNavigationStore } from '../../../stores/navigationStore';
import { useAlbumMenuState } from '../../../hooks/useAlbumMenuState';
import { theme } from '../../../config';
import { Album } from '../../../api/opensubsonic/types';

export const RecentlyPlayed: React.FC = () => {
  const { data: albums, isLoading, error, refetch } = useAlbums('recent', 10);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={180} height={24} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[...Array(6)].map((_, i) => (
            <View key={i} style={styles.cardWrapper}>
              <AlbumCardSkeleton width={160} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorView
          error="Failed to load recently played"
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  if (!albums || albums.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="No recently played"
          message="Start listening to see your recent albums here"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Recently Played</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            refetch();
          }}
        >
          <RefreshCw size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {albums.map((album) => (
          <AlbumCardWithArt key={album.id} album={album} />
        ))}
      </ScrollView>
    </View>
  );
};

// Helper component to fetch cover art for each album
const AlbumCardWithArt: React.FC<{ album: Album }> = ({ album }) => {
  const { data: coverArtUrl } = useCoverArt(album.coverArt, 300);
  const { navigate } = useNavigationStore();
  const albumMenuState = useAlbumMenuState();

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    albumMenuState.openAlbumMenu(album);
  };

  return (
    <>
      <View style={styles.cardWrapper}>
        <AlbumCard
          album={album}
          coverArtUrl={coverArtUrl || undefined}
          width={160}
          onPress={() => {
            navigate({ name: 'album-detail', params: { albumId: album.id } });
          }}
          onLongPress={handleLongPress}
        />
      </View>
      <AlbumMenuWrapper
        visible={albumMenuState.showAlbumMenu}
        onClose={albumMenuState.closeAlbumMenu}
        album={albumMenuState.selectedAlbum}
        showAlbumInfo={albumMenuState.showAlbumInfo}
        setShowAlbumInfo={albumMenuState.setShowAlbumInfo}
        showAddToPlaylist={albumMenuState.showAddToPlaylist}
        setShowAddToPlaylist={albumMenuState.setShowAddToPlaylist}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  cardWrapper: {
    marginRight: theme.spacing.md,
  },
});
