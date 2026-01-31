/**
 * Dino Music App - Search Screen
 * Search for tracks, albums, and artists
 */

import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { search3 } from '../../api/opensubsonic/search';
import { Album, Artist, Track } from '../../api/opensubsonic/types';
import { AlbumCard } from '../../components/Cards';
import { AlbumMenuWrapper } from '../../components/Menus';
import { AddToPlaylistModal } from '../../components/Modals/AddToPlaylistModal';
import { ArtistSelectionModal } from '../../components/Modals/ArtistSelectionModal';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { SongInfoModal } from '../../components/Modals/SongInfoModal';
import { TrackMenu } from '../../components/Player/TrackMenu';
import { AlbumCardSkeleton, ArtistRowSkeleton, TrackRowSkeleton } from '../../components/Skeletons';
import { EmptyState } from '../../components/common';
import { theme } from '../../config';
import { useCoverArt } from '../../hooks/api';
import { useAlbumMenuState } from '../../hooks/useAlbumMenuState';
import { useTrackMenuState } from '../../hooks/useTrackMenuState';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'tracks' | 'albums' | 'artists'>('all');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => search3(debouncedQuery, 20, 20, 50),
    enabled: debouncedQuery.length >= 2,
  });

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const hasResults =
    searchResults?.searchResult3 &&
    ((searchResults.searchResult3.album && searchResults.searchResult3.album.length > 0) ||
      (searchResults.searchResult3.artist && searchResults.searchResult3.artist.length > 0) ||
      (searchResults.searchResult3.song && searchResults.searchResult3.song.length > 0));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <SearchIcon size={20} color={theme.colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tracks, albums, artists..."
          placeholderTextColor={theme.colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
            <X size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      {debouncedQuery.length >= 2 && hasResults && (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tracks' && styles.tabActive]}
            onPress={() => setActiveTab('tracks')}
          >
            <Text style={[styles.tabText, activeTab === 'tracks' && styles.tabTextActive]}>
              Tracks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'albums' && styles.tabActive]}
            onPress={() => setActiveTab('albums')}
          >
            <Text style={[styles.tabText, activeTab === 'albums' && styles.tabTextActive]}>
              Albums
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'artists' && styles.tabActive]}
            onPress={() => setActiveTab('artists')}
          >
            <Text style={[styles.tabText, activeTab === 'artists' && styles.tabTextActive]}>
              Artists
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
        {debouncedQuery.length < 2 ? (
          <EmptyState
            title="Start searching"
            message="Enter at least 2 characters to search"
          />
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <AlbumCardSkeleton />
            <TrackRowSkeleton />
            <ArtistRowSkeleton />
          </View>
        ) : !hasResults ? (
          <EmptyState
            title="No results"
            message={`No results found for "${debouncedQuery}"`}
          />
        ) : (
          <>
            {/* Artists */}
            {(activeTab === 'all' || activeTab === 'artists') &&
              searchResults.searchResult3.artist &&
              searchResults.searchResult3.artist.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Artists</Text>
                  {searchResults.searchResult3.artist.slice(0, activeTab === 'all' ? 5 : undefined).map((artist: Artist) => (
                    <ArtistRow key={artist.id} artist={artist} />
                  ))}
                </View>
              )}

            {/* Albums */}
            {(activeTab === 'all' || activeTab === 'albums') &&
              searchResults.searchResult3.album &&
              searchResults.searchResult3.album.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Albums</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.albumsScroll}
                  >
                    {searchResults.searchResult3.album.slice(0, activeTab === 'all' ? 10 : undefined).map((album: Album) => (
                      <AlbumItem key={album.id} album={album} />
                    ))}
                  </ScrollView>
                </View>
              )}

            {/* Tracks */}
            {(activeTab === 'all' || activeTab === 'tracks') &&
              searchResults.searchResult3.song &&
              searchResults.searchResult3.song.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tracks</Text>
                  {searchResults.searchResult3.song.slice(0, activeTab === 'all' ? 10 : undefined).map((track: Track) => (
                    <TrackItem key={track.id} track={track} />
                  ))}
                </View>
              )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// Artist Row Component
const ArtistRow: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { data: coverArtUrl } = useCoverArt(artist.coverArt, 200);
  const { navigate } = useNavigationStore();

  return (
    <TouchableOpacity
      style={styles.artistRow}
      onPress={() => navigate({ name: 'artist-detail', params: { artistId: artist.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.artistAvatar}>
        {coverArtUrl ? (
          <Image source={{ uri: coverArtUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <User size={24} color={theme.colors.text.tertiary} />
          </View>
        )}
      </View>
      <View style={styles.artistInfo}>
        <Text style={styles.artistName} numberOfLines={1}>
          {artist.name}
        </Text>
        {artist.albumCount !== undefined && (
          <Text style={styles.artistDetails}>
            {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Album Item Component
const AlbumItem: React.FC<{ album: Album }> = ({ album }) => {
  const { data: coverArtUrl } = useCoverArt(album.coverArt, 300);
  const { navigate } = useNavigationStore();
  const albumMenuState = useAlbumMenuState();

  return (
    <>
      <View style={styles.albumItem}>
        <AlbumCard
          album={album}
          coverArtUrl={coverArtUrl || undefined}
          width={140}
          onPress={() => navigate({ name: 'album-detail', params: { albumId: album.id } })}
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

// Track Item Component
const TrackItem: React.FC<{ track: Track }> = ({ track }) => {
  const { data: coverArtUrl } = useCoverArt(track.coverArt, 100);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const { setQueue } = useQueueStore();
  const { navigate } = useNavigationStore();
  const trackMenuState = useTrackMenuState();

  const handlePlayTrack = async () => {
    setQueue([track], 0);
    setCurrentTrack(track);
    await trackPlayerService.play();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.trackRow}
        onPress={handlePlayTrack}
        onLongPress={() => trackMenuState.openTrackMenu(track)}
        activeOpacity={0.7}
      >
        {coverArtUrl && (
          <Image source={{ uri: coverArtUrl }} style={styles.trackArt} />
        )}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {track.artist || 'Unknown Artist'}
          </Text>
        </View>
      </TouchableOpacity>

      <TrackMenu
        visible={trackMenuState.showTrackMenu}
        onClose={trackMenuState.closeTrackMenu}
        track={trackMenuState.selectedTrack}
        onShowInfo={trackMenuState.handleShowInfo}
        onShowAddToPlaylist={trackMenuState.handleShowAddToPlaylist}
        onShowConfirm={trackMenuState.handleShowConfirm}
        onGoToArtist={trackMenuState.handleGoToArtist}
      />

      <SongInfoModal
        visible={trackMenuState.showSongInfo}
        onClose={() => trackMenuState.setShowSongInfo(false)}
        track={trackMenuState.selectedTrack}
      />

      <AddToPlaylistModal
        visible={trackMenuState.showAddToPlaylist}
        onClose={() => trackMenuState.setShowAddToPlaylist(false)}
        songIds={trackMenuState.selectedTrack ? [trackMenuState.selectedTrack.id] : []}
        songTitle={trackMenuState.selectedTrack?.title}
      />

      <ConfirmModal
        visible={trackMenuState.showConfirm}
        title={trackMenuState.confirmMessage.title}
        message={trackMenuState.confirmMessage.message}
        onClose={() => trackMenuState.setShowConfirm(false)}
      />

      <ArtistSelectionModal
        visible={trackMenuState.showArtistSelection}
        onClose={() => trackMenuState.setShowArtistSelection(false)}
        artists={trackMenuState.artistsToSelect}
        onSelectArtist={(artistId) => {
          navigate({ name: 'artist-detail', params: { artistId } });
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  title: {
    fontSize: theme.typography.fontSize.huge,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.card,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    paddingVertical: theme.spacing.md,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tab: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.card,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  tabTextActive: {
    color: theme.colors.text.inverse,
  },
  results: {
    flex: 1,
  },
  loadingContainer: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  artistAvatar: {
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  placeholderAvatar: {
    backgroundColor: theme.colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  artistDetails: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  albumsScroll: {
    paddingHorizontal: theme.spacing.lg,
  },
  albumItem: {
    marginRight: theme.spacing.md,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  trackArt: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
});
