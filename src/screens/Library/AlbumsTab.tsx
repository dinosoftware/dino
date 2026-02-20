/**
 * Dino Music App - Albums Tab
 * Grid view of all albums with sorting options
 */

import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAlbums, useCoverArt } from '../../hooks/api';
import { AlbumCard } from '../../components/Cards';
import { AlbumMenuWrapper } from '../../components/Menus';
import { EmptyState, ErrorView } from '../../components/common';
import { AlbumCardSkeleton } from '../../components/Skeletons';
import { useNavigationStore } from '../../stores/navigationStore';
import { useAlbumMenuState } from '../../hooks/useAlbumMenuState';
import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../config/theme';
import { Album } from '../../api/opensubsonic/types';

type SortType = 'newest' | 'alphabeticalByName' | 'alphabeticalByArtist' | 'recent' | 'frequent' | 'random';

const sortOptions: { value: SortType; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'alphabeticalByName', label: 'A-Z' },
  { value: 'alphabeticalByArtist', label: 'By Artist' },
  { value: 'recent', label: 'Recent' },
  { value: 'frequent', label: 'Most Played' },
  { value: 'random', label: 'Random' },
];

export const AlbumsTab: React.FC = () => {
  const theme = useTheme();
  const [sortType, setSortType] = useState<SortType>('newest');
  const { data: albums, isLoading, error, refetch } = useAlbums(sortType, 100);
  const styles = useMemo(() => createStyles(theme), [theme]);

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
    <View style={styles.container}>
      {/* Sort Options */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortContainer}
      >
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.sortButton,
              sortType === option.value && styles.sortButtonActive,
            ]}
            onPress={() => setSortType(option.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortType === option.value && styles.sortButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Albums Grid */}
      <FlatList
        data={albums}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlbumItem album={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const AlbumItem: React.FC<{ album: Album }> = ({ album }) => {
  const theme = useTheme();
  const { data: coverArtUrl } = useCoverArt(album.coverArt, 300);
  const { navigate } = useNavigationStore();
  const albumMenuState = useAlbumMenuState();

  const styles = useMemo(() => createStyles(theme), [theme]);

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

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  sortContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sortButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    height: 32,
  },
  sortButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  sortButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.fontSize.sm * 1.2,
    textAlignVertical: 'center',
  },
  sortButtonTextActive: {
    color: theme.colors.text.inverse,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  list: {
    padding: theme.spacing.md,
  },
  albumContainer: {
    flex: 1,
    margin: theme.spacing.sm,
    maxWidth: '50%',
  },
});
