/**
 * Dino Music App - Favorites Tab
 * Shows all starred tracks, albums, and artists
 */

import * as Haptics from 'expo-haptics';
import { Play } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Album, Artist, Track } from '../../api/opensubsonic/types';
import { AlbumCard } from '../../components/Cards/AlbumCard';
import { TrackRow } from '../../components/Cards/TrackRow';
import { AlbumMenuWrapper as AlbumMenuWrapperComponent } from '../../components/Menus';
import { AddToPlaylistModal } from '../../components/Modals/AddToPlaylistModal';
import { ArtistSelectionModal } from '../../components/Modals/ArtistSelectionModal';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { SongInfoModal } from '../../components/Modals/SongInfoModal';
import { TrackMenu } from '../../components/Player/TrackMenu';
import { EmptyState, ArtistArtImage } from '../../components/common';
import { theme } from '../../config';
import { useCoverArt } from '../../hooks/api';
import { useAlbumMenuState } from '../../hooks/useAlbumMenuState';
import { useTrackMenuState } from '../../hooks/useTrackMenuState';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';

type SubTab = 'tracks' | 'albums' | 'artists';

export const FavoritesTab: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('tracks');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { starredTrackObjects, starredAlbumObjects, starredArtistObjects, loadStarred } = useFavoritesStore();

  // Load starred items when component mounts
  useEffect(() => {
    loadStarred();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadStarred();
    } catch (error) {
      console.error('Failed to refresh favorites:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderContent = () => {
    switch (subTab) {
      case 'tracks':
        return <StarredTracks tracks={starredTrackObjects} isRefreshing={isRefreshing} onRefresh={handleRefresh} />;
      case 'albums':
        return <StarredAlbums albums={starredAlbumObjects} isRefreshing={isRefreshing} onRefresh={handleRefresh} />;
      case 'artists':
        return <StarredArtists artists={starredArtistObjects} isRefreshing={isRefreshing} onRefresh={handleRefresh} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Sub Tabs */}
      <View style={styles.subTabs}>
        <TouchableOpacity
          style={[styles.subTab, subTab === 'tracks' && styles.subTabActive]}
          onPress={() => setSubTab('tracks')}
        >
          <Text style={[styles.subTabText, subTab === 'tracks' && styles.subTabTextActive]}>
            Tracks ({starredTrackObjects.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, subTab === 'albums' && styles.subTabActive]}
          onPress={() => setSubTab('albums')}
        >
          <Text style={[styles.subTabText, subTab === 'albums' && styles.subTabTextActive]}>
            Albums ({starredAlbumObjects.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTab, subTab === 'artists' && styles.subTabActive]}
          onPress={() => setSubTab('artists')}
        >
          <Text style={[styles.subTabText, subTab === 'artists' && styles.subTabTextActive]}>
            Artists ({starredArtistObjects.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {renderContent()}
    </View>
  );
};

// Starred Tracks Component
const StarredTracks: React.FC<{
  tracks: Track[];
  isRefreshing: boolean;
  onRefresh: () => void;
}> = ({ tracks, isRefreshing, onRefresh }) => {
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const { setQueue } = useQueueStore();
  const { navigate } = useNavigationStore();
  const trackMenuState = useTrackMenuState();

  const handlePlayAll = async () => {
    if (tracks.length === 0) return;

    setQueue(tracks, 0);
    setCurrentTrack(tracks[0]);
    await trackPlayerService.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleTrackPress = async (track: Track, index: number) => {
    setQueue(tracks, index);
    setCurrentTrack(track);
    await trackPlayerService.play();
  };

  if (tracks.length === 0) {
    return (
      <EmptyState
        title="No Favorite Tracks"
        message="Tap the heart icon to add tracks to your favorites"
      />
    );
  }

  return (
    <View style={styles.section}>
      {/* Play All Button */}
      <TouchableOpacity style={styles.playAllButton} onPress={handlePlayAll}>
        <Play size={20} color={theme.colors.accentForeground} fill={theme.colors.accentForeground} />
        <Text style={styles.playAllText}>Play All ({tracks.length})</Text>
      </TouchableOpacity>

      {/* Track List */}
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            onPress={() => handleTrackPress(item, index)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              trackMenuState.openTrackMenu(item);
            }}
            showArtwork={true}
            showMenu={true}
            onMenuPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              trackMenuState.openTrackMenu(item);
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      />

      {/* Track Menu */}
      <TrackMenu
        visible={trackMenuState.showTrackMenu}
        onClose={trackMenuState.closeTrackMenu}
        track={trackMenuState.selectedTrack}
        onShowInfo={trackMenuState.handleShowInfo}
        onShowAddToPlaylist={trackMenuState.handleShowAddToPlaylist}
        onShowConfirm={trackMenuState.handleShowConfirm}
        onGoToArtist={trackMenuState.handleGoToArtist}
      />

      {/* Song Info Modal */}
      <SongInfoModal
        visible={trackMenuState.showSongInfo}
        onClose={() => trackMenuState.setShowSongInfo(false)}
        track={trackMenuState.selectedTrack}
      />

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        visible={trackMenuState.showAddToPlaylist}
        onClose={() => trackMenuState.setShowAddToPlaylist(false)}
        songIds={trackMenuState.selectedTrack ? [trackMenuState.selectedTrack.id] : []}
        songTitle={trackMenuState.selectedTrack?.title}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        visible={trackMenuState.showConfirm}
        title={trackMenuState.confirmMessage.title}
        message={trackMenuState.confirmMessage.message}
        onClose={() => trackMenuState.setShowConfirm(false)}
      />

      {/* Artist Selection Modal */}
      <ArtistSelectionModal
        visible={trackMenuState.showArtistSelection}
        onClose={() => trackMenuState.setShowArtistSelection(false)}
        artists={trackMenuState.artistsToSelect}
        onSelectArtist={(artistId) => {
          navigate({ name: 'artist-detail', params: { artistId } });
        }}
      />
    </View>
  );
};

// Starred Albums Component
const StarredAlbums: React.FC<{
  albums: Album[];
  isRefreshing: boolean;
  onRefresh: () => void;
}> = ({ albums, isRefreshing, onRefresh }) => {
  const { navigate } = useNavigationStore();
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  if (albums.length === 0) {
    return (
      <EmptyState
        title="No Favorite Albums"
        message="Long-press an album and select 'Add to Favorites'"
      />
    );
  }

  return (
    <View style={styles.section}>
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <AlbumGridItem
            album={item}
            onPress={() => navigate({ name: 'album-detail', params: { albumId: item.id } })}
            onLongPress={() => {
              setSelectedAlbum(item);
              setShowMenu(true);
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      />

      {/* Album Menu */}
      {selectedAlbum && (
        <AlbumMenuWrapper
          visible={showMenu}
          onClose={() => {
            setShowMenu(false);
            setSelectedAlbum(null);
          }}
          album={selectedAlbum}
        />
      )}
    </View>
  );
};

const AlbumGridItem: React.FC<{
  album: Album;
  onPress: () => void;
  onLongPress: () => void;
}> = ({ album, onPress, onLongPress }) => {
  const { data: coverArtUrl } = useCoverArt(album.coverArt, 300);

  return (
    <AlbumCard
      album={album}
      coverArtUrl={coverArtUrl || undefined}
      width={160}
      onPress={onPress}
      onLongPress={onLongPress}
    />
  );
};

const AlbumMenuWrapper: React.FC<{
  visible: boolean;
  onClose: () => void;
  album: Album;
}> = ({ visible, onClose, album }) => {
  const albumMenuState = useAlbumMenuState();

  // Sync visibility with parent
  React.useEffect(() => {
    if (visible && album) {
      albumMenuState.openAlbumMenu(album);
    } else if (!visible) {
      albumMenuState.closeAlbumMenu();
    }
  }, [visible, album]);

  return (
    <AlbumMenuWrapperComponent
      visible={albumMenuState.showAlbumMenu}
      onClose={() => {
        albumMenuState.closeAlbumMenu();
        onClose();
      }}
      album={albumMenuState.selectedAlbum}
      showAlbumInfo={albumMenuState.showAlbumInfo}
      setShowAlbumInfo={albumMenuState.setShowAlbumInfo}
      showAddToPlaylist={albumMenuState.showAddToPlaylist}
      setShowAddToPlaylist={albumMenuState.setShowAddToPlaylist}
    />
  );
};

// Starred Artists Component
const StarredArtists: React.FC<{
  artists: Artist[];
  isRefreshing: boolean;
  onRefresh: () => void;
}> = ({ artists, isRefreshing, onRefresh }) => {
  if (artists.length === 0) {
    return (
      <EmptyState
        title="No Favorite Artists"
        message="Long-press an artist and select 'Add to Favorites'"
      />
    );
  }

  return (
    <FlatList
      data={artists}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ArtistItem artist={item} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.accent}
          colors={[theme.colors.accent]}
        />
      }
    />
  );
};

const ArtistItem: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { data: coverArtUrl } = useCoverArt(artist.coverArt, 100);
  const { navigate } = useNavigationStore();

  return (
    <TouchableOpacity
      style={styles.artistRow}
      onPress={() => navigate({ name: 'artist-detail', params: { artistId: artist.id } })}
      activeOpacity={0.7}
    >
      <ArtistArtImage
        uri={coverArtUrl}
        style={styles.artistAvatar}
      />
      <View style={styles.artistInfo}>
        <Text style={styles.artistName}>{artist.name}</Text>
        <Text style={styles.artistDetails}>
          {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subTabs: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  subTab: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  subTabActive: {
    backgroundColor: theme.colors.accent + '20',
  },
  subTabText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  subTabTextActive: {
    color: theme.colors.accent,
  },
  section: {
    flex: 1,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  playAllText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.accentForeground,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  gridList: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  artistAvatar: {
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
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  artistDetails: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
});
