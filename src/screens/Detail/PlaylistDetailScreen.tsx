/**
 * Dino Music App - Playlist Detail Screen
 * Shows playlist details and tracks
 */

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, MoreVertical, Play, Shuffle } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deletePlaylist } from '../../api/opensubsonic/playlists';
import { Track } from '../../api/opensubsonic/types';
import { TrackRow } from '../../components/Cards/TrackRow';
import { PlaylistMenu } from '../../components/Menus';
import { AddToPlaylistModal } from '../../components/Modals/AddToPlaylistModal';
import { ArtistSelectionModal } from '../../components/Modals/ArtistSelectionModal';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { SongInfoModal } from '../../components/Modals/SongInfoModal';
import { TrackMenu } from '../../components/Player/TrackMenu';
import { ErrorView } from '../../components/common/ErrorView';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { theme } from '../../config/theme';
import { useCoverArt } from '../../hooks/api/useAlbums';
import { usePlaylist } from '../../hooks/api/usePlaylists';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { useTrackMenuState } from '../../hooks/useTrackMenuState';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';

interface PlaylistDetailScreenProps {
  playlistId: string;
}

export default function PlaylistDetailScreen({ playlistId }: PlaylistDetailScreenProps) {
  const { data: playlist, isLoading, error, refetch } = usePlaylist(playlistId);
  const { data: coverArtUrl } = useCoverArt(playlist?.coverArt, 500);
  const playlistColors = useAlbumColors(coverArtUrl || undefined);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const { setQueue } = useQueueStore();
  const { goBack, navigate } = useNavigationStore();
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const trackMenuState = useTrackMenuState();

  const getTotalDuration = () => {
    if (!playlist?.entry) return '0:00';
    const total = playlist.entry.reduce((sum, track) => sum + (track.duration || 0), 0);
    const mins = Math.floor(total / 60);
    return `${mins} min`;
  };

  const handlePlayAll = async () => {
    if (!playlist?.entry || playlist.entry.length === 0) return;

    const tracks: Track[] = playlist.entry;

    setQueue(tracks, 0);
    setCurrentTrack(tracks[0]);
    await trackPlayerService.play();
  };

  const handleShuffle = async () => {
    if (!playlist?.entry || playlist.entry.length === 0) return;

    const tracks: Track[] = playlist.entry;

    // Shuffle the tracks array before setting queue
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Set queue with shuffled tracks
    setQueue(shuffled, 0);
    setCurrentTrack(shuffled[0]);
    await trackPlayerService.play();
  };

  const handleTrackPress = async (track: Track, index: number) => {
    if (!playlist?.entry) return;

    setQueue(playlist.entry, index);
    setCurrentTrack(track);
    await trackPlayerService.play();
  };

  const handleDeleteConfirm = async () => {
    try {
      await deletePlaylist(playlistId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goBack();
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading playlist..." />;
  }

  if (error || !playlist) {
    return (
      <ErrorView
        error={error?.message || 'Failed to load playlist'}
        onRetry={refetch}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => goBack()}
        activeOpacity={0.7}
      >
        <ChevronLeft size={28} color={theme.colors.text.primary} strokeWidth={2.5} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Blurred background - scrolls with content */}
        {coverArtUrl && (
          <View style={styles.blurredBackground}>
            <Image
              source={{ uri: coverArtUrl }}
              style={styles.blurredImage}
              blurRadius={60}
            />
            <LinearGradient
              colors={['transparent', theme.colors.background.primary]}
              locations={[0, 0.5]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}

        {/* Playlist Header */}
        <View style={styles.header}>
          <Image
            source={
              coverArtUrl
                ? { uri: coverArtUrl }
                : require('../../../assets/images/icon.png')
            }
            style={styles.coverArt}
          />

          <Text style={styles.title} numberOfLines={2}>
            {playlist.name}
          </Text>

          {playlist.comment && (
            <Text style={styles.comment} numberOfLines={2}>
              {playlist.comment}
            </Text>
          )}

          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              {playlist.songCount || playlist.entry?.length || 0} songs • {getTotalDuration()}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: playlistColors.primary }]}
            onPress={handlePlayAll}
            activeOpacity={0.8}
          >
            <Play size={24} color={playlistColors.textColor} fill={playlistColors.textColor} />
            <Text style={[styles.playButtonText, { color: playlistColors.textColor }]}>Play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shuffleButton}
            onPress={handleShuffle}
            activeOpacity={0.8}
          >
            <Shuffle size={20} color={theme.colors.text.primary} />
            <Text style={styles.shuffleButtonText}>Shuffle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPlaylistMenu(true);
            }}
          >
            <MoreVertical size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Track List */}
        <View style={styles.trackList}>
          {playlist.entry && playlist.entry.length > 0 ? (
            playlist.entry.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                onPress={() => handleTrackPress(track, index)}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  trackMenuState.openTrackMenu(track);
                }}
                showArtwork={false}
                showMenu={true}
                onMenuPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  trackMenuState.openTrackMenu(track);
                }}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tracks in this playlist</Text>
            </View>
          )}
        </View>

        {/* Bottom padding for mini player */}
        <View style={{ height: 100 }} />
      </ScrollView>

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

      {/* Confirm Modal (for track operations) */}
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

      {/* Playlist Menu */}
      <PlaylistMenu
        visible={showPlaylistMenu}
        onClose={() => setShowPlaylistMenu(false)}
        playlist={playlist || null}
        coverArtUrl={coverArtUrl || undefined}
        onPlay={handlePlayAll}
        onShuffle={handleShuffle}
        onDelete={() => {
          setShowPlaylistMenu(false);
          setTimeout(() => setShowDeleteConfirm(true), 100);
        }}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Playlist"
        message={`Are you sure you want to delete "${playlist?.name}"? This cannot be undone.`}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  blurredBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 800,
    zIndex: -1,
  },
  blurredImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing.xxl,
    left: theme.spacing.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: theme.spacing.xxl * 2,
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  coverArt: {
    width: 220,
    height: 220,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.fontSize.huge,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  comment: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  metadata: {
    marginTop: theme.spacing.sm,
  },
  metadataText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.muted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  playButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  shuffleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  shuffleButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  trackList: {
    paddingHorizontal: theme.spacing.lg,
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
});
