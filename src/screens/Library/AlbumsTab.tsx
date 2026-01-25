/**
 * Dino Music App - Albums Tab
 * Grid view of all albums
 */

import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useAlbums, useCoverArt } from '../../hooks/api';
import { AlbumCard } from '../../components/Cards';
import { AlbumMenuWrapper } from '../../components/Menus';
import { EmptyState, ErrorView } from '../../components/common';
import { AlbumCardSkeleton } from '../../components/Skeletons';
import { useNavigationStore } from '../../stores/navigationStore';
import { useAlbumMenuState } from '../../hooks/useAlbumMenuState';
import { theme } from '../../config';
import { Album } from '../../api/opensubsonic/types';

export const AlbumsTab: React.FC = () => {
  const { data: albums, isLoading, error, refetch } = useAlbums('newest', 100);

  if (isLoading) {
    return (
      <FlatList
        data={[...Array(12)]}
        numColumns={2}
        keyExtractor={(_, index) => `skeleton-${index}`}
        renderItem={() => (
          <View style={styles.albumContainer}>
            <AlbumCardSkeleton />
          </View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  if (error) {
    return <ErrorView error="Failed to load albums" onRetry={() => refetch()} />;
  }

  if (!albums || albums.length === 0) {
    return <EmptyState title="No albums" message="Your library is empty" />;
  }

  return (
    <FlatList
      data={albums}
      numColumns={2}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AlbumItem album={item} />}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
};

const AlbumItem: React.FC<{ album: Album }> = ({ album }) => {
  const { data: coverArtUrl } = useCoverArt(album.coverArt, 300);
  const { navigate } = useNavigationStore();
  const albumMenuState = useAlbumMenuState();

  return (
    <>
      <View style={styles.albumContainer}>
        <AlbumCard
          album={album}
          coverArtUrl={coverArtUrl || undefined}
          onPress={() => {
            navigate({ name: 'album-detail', params: { albumId: album.id } });
          }}
          onLongPress={() => albumMenuState.openAlbumMenu(album)}
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
  list: {
    padding: theme.spacing.md,
  },
  albumContainer: {
    flex: 1,
    margin: theme.spacing.sm,
    maxWidth: '50%',
  },
});
