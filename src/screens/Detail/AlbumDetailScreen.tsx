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
import { Track } from '../../api/opensubsonic/types';
import { TrackRow } from '../../components/Cards/TrackRow';
import { AlbumMenu } from '../../components/Menus';
import { AddToPlaylistModal } from '../../components/Modals/AddToPlaylistModal';
import { AlbumInfoModal } from '../../components/Modals/AlbumInfoModal';
import { ArtistSelectionModal } from '../../components/Modals/ArtistSelectionModal';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { SongInfoModal } from '../../components/Modals/SongInfoModal';
import { TrackMenu } from '../../components/Player/TrackMenu';
import { AlbumDetailSkeleton } from '../../components/Skeletons';
import { ErrorView } from '../../components/common/ErrorView';
import { theme } from '../../config/theme';
import { useAlbum, useCoverArt } from '../../hooks/api/useAlbums';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { useTrackMenuState } from '../../hooks/useTrackMenuState';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';

interface AlbumDetailScreenProps {
  albumId: string;
}

export default function AlbumDetailScreen({ albumId }: AlbumDetailScreenProps) {
  const { data: album, isLoading, error, refetch } = useAlbum(albumId!);
  const { data: coverArtUrl } = useCoverArt(album?.coverArt, 500);
  const albumColors = useAlbumColors(coverArtUrl || undefined);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const { setQueue } = useQueueStore();
  const { goBack, navigate } = useNavigationStore();
  const [showAlbumMenu, setShowAlbumMenu] = useState(false);
  const [showAlbumInfo, setShowAlbumInfo] = useState(false);
  const [showAlbumAddToPlaylist, setShowAlbumAddToPlaylist] = useState(false);

  const trackMenuState = useTrackMenuState();

  const handleArtistPress = () => {
    if (album?.artistId) {
      navigate({ name: 'artist-detail', params: { artistId: album.artistId } });
    }
  };

  const getTotalDuration = () => {
    if (!album?.song) return '0:00';
    const total = album.song.reduce((sum, track) => sum + (track.duration || 0), 0);
    const mins = Math.floor(total / 60);
    return `${mins} min`;
  };

  const handlePlayAll = async () => {
    if (!album?.song || album.song.length === 0) return;

    const tracks: Track[] = album.song;

    // Set queue and play first track
    setQueue(tracks, 0);
    setCurrentTrack(tracks[0]);
    await trackPlayerService.play();
  };

  const handleShuffle = async () => {
    if (!album?.song || album.song.length === 0) return;

    const tracks: Track[] = album.song;

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
    if (!album?.song) return;

    // Set entire album as queue
    setQueue(album.song, index);
    setCurrentTrack(track);
    await trackPlayerService.play();
  };

  if (isLoading) {
    return <AlbumDetailSkeleton />;
  }

  if (error || !album) {
    return (
      <ErrorView
        error={error?.message || 'Failed to load album'}
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

        {/* Album Header */}
        <View style={styles.header}>
          <Image
            source={
              coverArtUrl
                ? { uri: coverArtUrl }
                : require('../../../assets/images/album_art_placeholder.png')
            }
            style={styles.coverArt}
          />

          <Text style={styles.title} numberOfLines={2}>
            {album.name}
          </Text>

          <TouchableOpacity onPress={handleArtistPress}>
            <Text style={styles.artist} numberOfLines={1}>
              {album.artist}
            </Text>
          </TouchableOpacity>

          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              {album.year} • {album.songCount || album.song?.length || 0} songs • {getTotalDuration()}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: albumColors.primary }]}
            onPress={handlePlayAll}
            activeOpacity={0.8}
          >
            <Play size={24} color={albumColors.textColor} fill={albumColors.textColor} />
            <Text style={[styles.playButtonText, { color: albumColors.textColor }]}>Play</Text>
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
              setShowAlbumMenu(true);
            }}
          >
            <MoreVertical size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Track List */}
        <View style={styles.trackList}>
          {album.song && album.song.length > 0 ? (
            album.song.map((track, index) => (
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
              <Text style={styles.emptyText}>No tracks available</Text>
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

      {/* Album Menu */}
      <AlbumMenu
        visible={showAlbumMenu}
        onClose={() => setShowAlbumMenu(false)}
        album={album}
        coverArtUrl={coverArtUrl || undefined}
        onShowInfo={() => setShowAlbumInfo(true)}
        onAddToPlaylist={() => setShowAlbumAddToPlaylist(true)}
      />

      {/* Album Add to Playlist Modal */}
      <AddToPlaylistModal
        visible={showAlbumAddToPlaylist}
        onClose={() => setShowAlbumAddToPlaylist(false)}
        songIds={album?.song?.map(s => s.id) || []}
        songTitle={album?.name}
      />

      {/* Album Info Modal */}
      <AlbumInfoModal
        visible={showAlbumInfo}
        onClose={() => setShowAlbumInfo(false)}
        album={album || null}
        coverArtUrl={coverArtUrl || undefined}
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
    top: 50,
    left: theme.spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    paddingTop: 60,
    gap: theme.spacing.sm,
  },
  coverArt: {
    width: 220,
    height: 220,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  artist: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  metadataText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.muted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  playButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  shuffleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  shuffleButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
  },
  trackList: {
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
});
