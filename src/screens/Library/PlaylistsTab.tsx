/**
 * Dino Music App - Playlists Tab
 * List view of all playlists
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl } from 'react-native';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePlaylists, useCoverArt } from '../../hooks/api';
import { useNavigationStore } from '../../stores/navigationStore';
import { CreatePlaylistModal } from '../../components/Modals/CreatePlaylistModal';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { PlaylistMenu } from '../../components/Menus';
import { LoadingSpinner, EmptyState, ErrorView } from '../../components/common';
import { theme } from '../../config';
import { Playlist } from '../../api/opensubsonic/types';
import { deletePlaylist } from '../../api/opensubsonic/playlists';

export const PlaylistsTab: React.FC = () => {
  const { data: playlists, isLoading, error, refetch, isRefetching } = usePlaylists();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

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

  const handleDelete = async () => {
    try {
      await deletePlaylist(playlist.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConfirm(false);
      onDeleted();
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <PlaylistMenu
        visible={visible}
        onClose={onClose}
        playlist={playlist}
        coverArtUrl={coverArtUrl || undefined}
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
  const { data: coverArtUrl } = useCoverArt(playlist.coverArt, 200);
  const { navigate } = useNavigationStore();
  
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
      <Image
        source={
          coverArtUrl
            ? { uri: coverArtUrl }
            : require('../../../assets/images/icon.png')
        }
        style={styles.playlistCover}
      />
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{playlist.name}</Text>
        <Text style={styles.playlistDetails}>
          {playlist.songCount} songs • {Math.floor(playlist.duration / 60)} min
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  playlistCover: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.background.muted,
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
