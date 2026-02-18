/**
 * Dino Music App - Artists Tab
 * List view of all artists
 */

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useArtists, useCoverArt } from '../../hooks/api';
import { EmptyState, ErrorView, ArtistArtImage } from '../../components/common';
import { ArtistRowSkeleton } from '../../components/Skeletons';
import { useNavigationStore } from '../../stores/navigationStore';
import { theme } from '../../config';
import { Artist } from '../../api/opensubsonic/types';

export const ArtistsTab: React.FC = () => {
  const { data: artists, isLoading, error, refetch } = useArtists();

  if (isLoading) {
    return (
      <FlatList
        data={[...Array(10)]}
        keyExtractor={(_, index) => `skeleton-${index}`}
        renderItem={() => <ArtistRowSkeleton />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  if (error) {
    return <ErrorView error="Failed to load artists" onRetry={() => refetch()} />;
  }

  if (!artists || artists.length === 0) {
    return <EmptyState title="No artists" message="Your library is empty" />;
  }

  return (
    <FlatList
      data={artists}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ArtistItem artist={item} />}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
};

const ArtistItem: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { data: coverArtUrl } = useCoverArt(artist.coverArt, 200);
  const { navigate } = useNavigationStore();

  return (
    <TouchableOpacity
      style={styles.artistContainer}
      onPress={() => {
        navigate({ name: 'artist-detail', params: { artistId: artist.id } });
      }}
      activeOpacity={0.7}
    >
      {/* Artist Avatar */}
      <ArtistArtImage
        uri={coverArtUrl}
        style={styles.avatar}
      />

      <View style={styles.artistInfo}>
        <Text style={styles.artistName}>{artist.name}</Text>
        {artist.albumCount !== undefined && (
          <Text style={styles.artistDetails}>{artist.albumCount} albums</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.lg,
  },
  artistContainer: {
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
    marginRight: theme.spacing.md,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  artistDetails: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
});
