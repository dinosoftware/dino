/**
 * Dino Music App - Playlists Tab
 * List view of all playlists
 */

import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl, Share } from 'react-native';
import { Plus, Download } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePlaylists, useCoverArt } from '../../hooks/api';
import { useNavigationStore } from '../../stores/navigationStore';
import { useQueueStore, usePlayerStore } from '../../stores';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { CreatePlaylistModal } from '../../components/Modals/CreatePlaylistModal';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { PlaylistMenu } from '../../components/Menus';
import { LoadingSpinner, EmptyState, ErrorView } from '../../components/common';
import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../config/theme';
import { Playlist } from '../../api/opensubsonic/types';
import { deletePlaylist, getPlaylist } from '../../api/opensubsonic/playlists';
import { createShare } from '../../api/opensubsonic/share';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToastStore } from '../../stores/toastStore';
import { useDownloadStore } from '../../stores/downloadStore';

export const PlaylistsTab: React.FC = () => {
  const theme = useTheme();
  const { data: playlists, isLoading, error, refetch, isRefetching } = usePlaylists();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  if (isLoading && !isRefetching) {
    return <LoadingSpinner message="Loading playlists..." />;
  }

  if (error && !playlists) {
    return <ErrorView error="Failed to load playlists" onRetry={() => refetch()} />;
  }

  const handleCreateSuccess = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <>
      <View style={styles.container}>
        {/* New Playlist Button */}
        <TouchableOpacity
          style={styles.newPlaylistButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCreateModal(true);
          }}
        >
          <View style={styles.newPlaylistIcon}>
            <Plus size={20} color={theme.colors.accent} strokeWidth={2.5} />
          </View>
          <Text style={styles.newPlaylistText}>New Playlist</Text>
        </TouchableOpacity>

        {/* Playlists List */}
        {!playlists || playlists.length === 0 ? (
          <EmptyState
            title="No playlists"
            message="Create a playlist to get started"
          />
        ) : (
          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PlaylistItem
                playlist={item}
                onLongPress={() => {
                  setSelectedPlaylist(item);
                  setShowPlaylistMenu(true);
                }}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
                tintColor={theme.colors.accent}
                colors={[theme.colors.accent]}
              />
            }
          />
        )}
      </View>

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Playlist Menu */}
      {selectedPlaylist && (
        <PlaylistMenuWrapper
          visible={showPlaylistMenu}
          onClose={() => {
            setShowPlaylistMenu(false);
            setSelectedPlaylist(null);
          }}
          playlist={selectedPlaylist}
          onDeleted={() => {
            setShowPlaylistMenu(false);
            setSelectedPlaylist(null);
            refetch();
          }}
        />
      )}
    </>
  );
};

const PlaylistMenuWrapper: React.FC<{
  visible: boolean;
  onClose: () => void;
  playlist: Playlist;
  onDeleted: () => void;
}> = ({ visible, onClose, playlist, onDeleted }) => {
  const { data: coverArtUrl } = useCoverArt(playlist.coverArt, 200);
  const [showConfirm, setShowConfirm] = useState(false);
  const { showToast } = useToastStore();
  const { setQueue, addToQueue } = useQueueStore();
  const { setCurrentTrack } = usePlayerStore();

  const handlePlayAll = async () => {
    try {
      const response = await getPlaylist(playlist.id);
      if (!response.playlist.entry || response.playlist.entry.length === 0) {
        showToast('Playlist is empty', 'error');
        return;
      }
      setQueue(response.playlist.entry, 0);
      setCurrentTrack(response.playlist.entry[0]);
      await trackPlayerService.play();
      onClose();
    } catch (error) {
      showToast('Failed to load playlist', 'error');
    }
  };

  const handleShuffle = async () => {
    try {
      const response = await getPlaylist(playlist.id);
      if (!response.playlist.entry || response.playlist.entry.length === 0) {
        showToast('Playlist is empty', 'error');
        return;
      }
      const shuffled = [...response.playlist.entry].sort(() => Math.random() - 0.5);
      setQueue(shuffled, 0);
      setCurrentTrack(shuffled[0]);
      await trackPlayerService.play();
      onClose();
    } catch (error) {
      showToast('Failed to load playlist', 'error');
    }
  };

  const handlePlayNext = async () => {
    try {
      const response = await getPlaylist(playlist.id);
      if (!response.playlist.entry || response.playlist.entry.length === 0) {
        showToast('Playlist is empty', 'error');
        return;
      }
      addToQueue(response.playlist.entry, 'next');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      showToast('Failed to load playlist', 'error');
    }
  };

  const handleAddToQueue = async () => {
    try {
      const response = await getPlaylist(playlist.id);
      if (!response.playlist.entry || response.playlist.entry.length === 0) {
        showToast('Playlist is empty', 'error');
        return;
      }
      addToQueue(response.playlist.entry, 'end');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      showToast('Failed to load playlist', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePlaylist(playlist.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Playlist deleted');
      setShowConfirm(false);
      onDeleted();
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      showToast('Failed to delete playlist', 'error');
      setShowConfirm(false);
    }
  };

  const handleShare = async () => {
    const includeShareMessage = useSettingsStore.getState().includeShareMessage;
    
    try {
      // Create OpenSubsonic share
      const description = playlist.owner ? `${playlist.name} by ${playlist.owner}` : playlist.name;
      const share = await createShare([playlist.id], description);

      // Build message based on setting
      let message: string;
      if (includeShareMessage) {
        message = `Check out the playlist "${playlist.name}"`;
        if (playlist.owner) {
          message += ` by ${playlist.owner}`;
        }
        if (playlist.songCount) {
          message += `\n${playlist.songCount} ${playlist.songCount === 1 ? 'track' : 'tracks'}`;
        }
        message += `\n\n${share.url}`;
      } else {
        message = share.url;
      }

      await Share.share({
        message: message,
        url: share.url,
        title: `Share Playlist: ${playlist.name}`,
      });
      
      showToast('Share link created');
    } catch (error) {
      console.error('Error sharing playlist:', error);
      showToast('Failed to create share link', 'error');
    }
  };

  return (
    <>
      <PlaylistMenu
        visible={visible}
        onClose={onClose}
        playlist={playlist}
        coverArtUrl={coverArtUrl || undefined}
        onPlay={handlePlayAll}
        onShuffle={handleShuffle}
        onPlayNext={handlePlayNext}
        onAddToQueue={handleAddToQueue}
        onShare={handleShare}
        onDelete={() => {
          onClose();
          setShowConfirm(true);
        }}
      />
      
      <ConfirmModal
        visible={showConfirm}
        title="Delete Playlist"
        message={`Are you sure you want to delete "${playlist.name}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onClose={() => setShowConfirm(false)}
        destructive={true}
      />
    </>
  );
};

const PlaylistItem: React.FC<{ playlist: Playlist; onLongPress: () => void }> = ({ playlist, onLongPress }) => {
  const theme = useTheme();
  const { data: coverArtUrl } = useCoverArt(playlist.coverArt, 200);
  const { navigate } = useNavigationStore();
  const { isPlaylistDownloaded } = useDownloadStore();
  const isDownloaded = isPlaylistDownloaded(playlist.id);

  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return (
    <TouchableOpacity
      style={styles.playlistContainer}
      onPress={() => {
        navigate({ name: 'playlist-detail', params: { playlistId: playlist.id } });
      }}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.coverWrapper}>
        <Image
          source={
            coverArtUrl
              ? { uri: coverArtUrl }
              : require('../../../assets/images/album_art_placeholder.png')
          }
          style={styles.playlistCover}
        />
        {/* Download Badge */}
        {isDownloaded && (
          <View style={styles.downloadBadge}>
            <Download size={12} color={theme.colors.text.inverse} strokeWidth={2.5} />
          </View>
        )}
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{playlist.name}</Text>
        <Text style={styles.playlistDetails}>
          {playlist.songCount} songs • {Math.floor(playlist.duration / 60)} min
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  newPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  newPlaylistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  newPlaylistText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.accent,
  },
  list: {
    padding: theme.spacing.lg,
  },
  playlistContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  coverWrapper: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  playlistCover: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.muted,
  },
  downloadBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  playlistDetails: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
});
