/**
 * Dino Music App - Search Screen
 * Search for tracks, albums, and artists
 */

import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, X } from 'lucide-react-native';
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { EmptyState, ArtistArtImage } from '../../components/common';
import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../config/theme';
import { useCoverArt } from '../../hooks/api';
import { useAlbumMenuState } from '../../hooks/useAlbumMenuState';
import { useTrackMenuState } from '../../hooks/useTrackMenuState';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';
import { useSettingsStore } from '../../stores/settingsStore';

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
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'tracks' | 'albums' | 'artists'>('all');
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const searchInputRef = useRef<TextInput>(null);
  
  const { autoFocusSearch } = useSettingsStore();

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (autoFocusSearch && searchInputRef.current) {
      const timeout = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [autoFocusSearch]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => search3(debouncedQuery, 20, 20, 50),
    enabled: debouncedQuery.length >= 2,
  });

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
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

      {/* Search Input - shadcn-inspired design */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchContainer, isFocused && styles.searchContainerFocused]}>
          <SearchIcon 
            size={18} 
            color={isFocused ? theme.colors.text.primary : theme.colors.text.tertiary} 
            strokeWidth={2.5}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search your library..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            selectionColor={theme.colors.accent}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={styles.clearButtonInner}>
                <X size={14} color={theme.colors.text.secondary} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      {debouncedQuery.length >= 2 && hasResults && (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tracks' && styles.tabActive]}
            onPress={() => setActiveTab('tracks')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'tracks' && styles.tabTextActive]}>
              Tracks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'albums' && styles.tabActive]}
            onPress={() => setActiveTab('albums')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'albums' && styles.tabTextActive]}>
              Albums
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'artists' && styles.tabActive]}
            onPress={() => setActiveTab('artists')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'artists' && styles.tabTextActive]}>
              Artists
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      <ScrollView style={styles.results} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {debouncedQuery.length < 2 ? (
          <EmptyState
            title="Start searching"
            message="Enter at least 2 characters to search"
          />
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.section}>
              <View style={styles.skeletonSectionTitle} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albumsScroll}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={`album-${i}`} style={styles.albumSkeletonWrapper}>
                    <AlbumCardSkeleton width={140} />
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={styles.section}>
              <View style={styles.skeletonSectionTitle} />
              {[1, 2, 3].map((i) => (
                <ArtistRowSkeleton key={`artist-${i}`} />
              ))}
            </View>
            <View style={styles.section}>
              <View style={styles.skeletonSectionTitle} />
              {[1, 2, 3, 4, 5].map((i) => (
                <TrackRowSkeleton key={`track-${i}`} showAlbumArt />
              ))}
            </View>
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

const ArtistRow: React.FC<{ artist: Artist }> = ({ artist }) => {
  const theme = useTheme();
  const { data: coverArtUrl } = useCoverArt(artist.coverArt, 200);
  const { navigate } = useNavigationStore();

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity
      style={styles.artistRow}
      onPress={() => navigate({ name: 'artist-detail', params: { artistId: artist.id } })}
      activeOpacity={0.7}
    >
      <ArtistArtImage
        uri={coverArtUrl}
        style={[styles.avatar, { marginRight: theme.spacing.md }]}
      />
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

const AlbumItem: React.FC<{ album: Album }> = ({ album }) => {
  const theme = useTheme();
  const { data: coverArtUrl } = useCoverArt(album.coverArt, 300);
  const { navigate } = useNavigationStore();
  const albumMenuState = useAlbumMenuState();

  const styles = useMemo(() => createStyles(theme), [theme]);

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

const TrackItem: React.FC<{ track: Track }> = ({ track }) => {
  const theme = useTheme();
  const { data: coverArtUrl } = useCoverArt(track.coverArt, 100);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const { setQueue } = useQueueStore();
  const { navigate } = useNavigationStore();
  const trackMenuState = useTrackMenuState();

  const styles = useMemo(() => createStyles(theme), [theme]);

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

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl + theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.huge,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  searchWrapper: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchContainerFocused: {
    borderColor: theme.colors.text.primary,
    backgroundColor: theme.colors.background.primary,
  },
  searchIcon: {
    marginRight: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
    padding: 0,
    paddingVertical: theme.spacing.xs,
  },
  clearButton: {
    marginLeft: theme.spacing.sm,
  },
  clearButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.background.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tab: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: {
    backgroundColor: theme.colors.text.primary,
    borderColor: theme.colors.text.primary,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  tabTextActive: {
    color: theme.colors.text.inverse,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  results: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  skeletonSectionTitle: {
    height: 24,
    width: 100,
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  albumSkeletonWrapper: {
    marginRight: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bold,
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  artistDetails: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
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
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.regular,
  },
});
