/**
 * Dino Music App - Full Player
 * Optimized full screen player with memoization
 */

import * as Haptics from 'expo-haptics';
import { ArrowRightLeft, Cast, ChevronDown, Heart, ListMusic, MicVocal, MoreVertical, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react-native';
import React, { memo, useCallback, useRef, useState, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Track } from '../../api/opensubsonic/types';
import { theme } from '../../config';
import { useCoverArt } from '../../hooks/api';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { useLyrics } from '../../hooks/useLyrics';
import { usePlayer } from '../../hooks/usePlayer';
import { useProgress } from '../../hooks/useProgress';
import { useTrackMenuState } from '../../hooks/useTrackMenuState';
import { LyricsScreen } from '../../screens/Player/LyricsScreen';
import { QueueScreen } from '../../screens/Player/QueueScreen';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';
import { AddToPlaylistModal } from '../Modals/AddToPlaylistModal';
import { ConfirmModal } from '../Modals/ConfirmModal';
import { SongInfoModal } from '../Modals/SongInfoModal';
import { BlurredBackground } from '../common';
import { ProgressBar } from './ProgressBar';
import { TrackMenu } from './TrackMenu';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FullPlayerProps {
  onClose: () => void;
}

// Memoized artwork component
const Artwork = memo<{ uri?: string }>(({ uri }) => {
  if (uri) {
    return <Image source={{ uri }} style={styles.artwork} resizeMode="cover" />;
  }
  return (
    <View style={[styles.artwork, styles.placeholderArtwork]}>
      <Text style={styles.placeholderText}>♪</Text>
    </View>
  );
});
Artwork.displayName = 'Artwork';

// Memoized track info component with navigation
const TrackInfo = memo<{ track: Track; onNavigate: (action: () => void) => void }>(({ track, onNavigate }) => {
  const { navigate, currentScreen } = useNavigationStore();

  const handleArtistPress = useCallback((artistId?: string, _artistName?: string) => {
    if (!artistId) return;
    // Don't close if already on this artist page
    if (currentScreen.name === 'artist-detail' && currentScreen.params?.artistId === artistId) return;
    onNavigate(() => navigate({ name: 'artist-detail', params: { artistId } }));
  }, [navigate, currentScreen, onNavigate]);

  const handleAlbumPress = useCallback(() => {
    if (!track.albumId) return;
    // Don't close if already on this album page
    if (currentScreen.name === 'album-detail' && currentScreen.params?.albumId === track.albumId) return;
    onNavigate(() => navigate({ name: 'album-detail', params: { albumId: track.albumId! } }));
  }, [track.albumId, navigate, currentScreen, onNavigate]);

  // Determine which artist string to display
  const displayArtist = track.displayArtist || track.artist || 'Unknown Artist';
  const hasMultipleArtists = track.artists && track.artists.length > 1;

  return (
    <View style={styles.info}>
      <Text style={styles.title} numberOfLines={2}>
        {track.title}
      </Text>

      {/* Artists - clickable */}
      {hasMultipleArtists && track.artists ? (
        <View style={styles.artistsContainer}>
          {track.artists.map((artist, index) => {
            const isLast = index === track.artists!.length - 1;
            const isSecondToLast = index === track.artists!.length - 2;
            return (
              <React.Fragment key={artist.id}>
                <TouchableOpacity onPress={() => handleArtistPress(artist.id, artist.name)}>
                  <Text style={styles.artistLink}>{artist.name}</Text>
                </TouchableOpacity>
                {!isLast && (
                  <Text style={styles.artistSeparator}>
                    {isSecondToLast ? ' & ' : ', '}
                  </Text>
                )}
              </React.Fragment>
            );
          })}
        </View>
      ) : (
        <TouchableOpacity onPress={() => handleArtistPress(track.artistId, track.artist)}>
          <Text style={styles.artist} numberOfLines={1}>
            {displayArtist}
          </Text>
        </TouchableOpacity>
      )}

      {/* Album - clickable */}
      {track.album && (
        <TouchableOpacity onPress={handleAlbumPress}>
          <Text style={styles.album} numberOfLines={1}>
            {track.album}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});
TrackInfo.displayName = 'TrackInfo';

// Memoized control button
const ControlButton = memo<{ onPress: () => void; children: React.ReactNode; style?: any }>(
  ({ onPress, children, style }) => (
    <TouchableOpacity onPress={onPress} style={[styles.mainControlButton, style]}>
      {children}
    </TouchableOpacity>
  )
);
ControlButton.displayName = 'ControlButton';

export const FullPlayer: React.FC<FullPlayerProps> = ({ onClose }) => {
  const {
    currentTrack,
    isPlaying,
    repeatMode,
    shuffleEnabled,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekTo,
    toggleShuffle,
    cycleRepeatMode,
  } = usePlayer();

  // Separate progress subscription - only ProgressBar will re-render on updates
  const progress = useProgress();

  // Get streaming info from player store
  const streamingInfo = usePlayerStore((state) => state.streamingInfo);

  const { hasLyrics } = useLyrics();
  const { data: coverArtUrl } = useCoverArt(currentTrack?.coverArt, 500);
  const albumColors = useAlbumColors(coverArtUrl || undefined);
  const { isTrackStarred, toggleTrackStar } = useFavoritesStore();
  const trackMenuState = useTrackMenuState();
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Slide up animation on mount
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, []);

  const handleClose = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [translateY, onClose]);

  // Animate close then run a navigation action
  const handleNavigate = useCallback((action: () => void) => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      action();
    });
  }, [translateY, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isMenuOpen,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Don't handle gestures if menu is open
        if (isMenuOpen) return false;
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        translateY.setOffset(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 25,
          }).start();
        }
      },
    })
  ).current;

  // Update menu open state when menu visibility changes
  const handleMenuOpen = useCallback(() => {
    if (currentTrack) {
      trackMenuState.openTrackMenu(currentTrack);
      setIsMenuOpen(true);
    }
  }, [currentTrack, trackMenuState]);

  const handleMenuClose = useCallback(() => {
    trackMenuState.closeTrackMenu();
    setIsMenuOpen(false);
  }, [trackMenuState]);

  const handleTogglePlayPause = useCallback(() => {
    togglePlayPause();
  }, [togglePlayPause]);

  const handleSkipNext = useCallback(() => {
    skipToNext();
  }, [skipToNext]);

  const handleSkipPrevious = useCallback(() => {
    skipToPrevious();
  }, [skipToPrevious]);

  const handleToggleShuffle = useCallback(() => {
    toggleShuffle();
  }, [toggleShuffle]);

  const handleCycleRepeat = useCallback(() => {
    cycleRepeatMode();
  }, [cycleRepeatMode]);

  const handleToggleFavorite = useCallback(async () => {
    if (!currentTrack) return;

    const isStarred = isTrackStarred(currentTrack.id);
    try {
      await toggleTrackStar(currentTrack.id, isStarred);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [currentTrack, isTrackStarred, toggleTrackStar]);

  if (!currentTrack) {
    return null;
  }

  const isFavorite = isTrackStarred(currentTrack.id);

  return (
    <>
    <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateY }] }]}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <BlurredBackground imageUri={coverArtUrl || undefined}>
          <View
            style={styles.container}
            {...panResponder.panHandlers}
          >
        {/* Swipe Indicator */}
        <View style={styles.swipeIndicator}>
          <View style={styles.swipeHandle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <ChevronDown size={28} color={theme.colors.text.primary} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.placeholder} />
        </View>

        {/* Album Artwork */}
        <View style={styles.artworkContainer}>
          <Artwork uri={coverArtUrl || undefined} />
        </View>

        {/* Track Info with Actions */}
        <View style={styles.infoRow}>
          <TrackInfo track={currentTrack} onNavigate={handleNavigate} />
          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.topActionButton}
              onPress={handleMenuOpen}
            >
              <MoreVertical size={24} color={albumColors.primary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topActionButton}
              onPress={handleToggleFavorite}
            >
              <Heart
                size={24}
                color={albumColors.primary}
                strokeWidth={2}
                fill={isFavorite ? albumColors.primary : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar with Quality Indicator */}
        <ProgressBar
          position={progress.position}
          duration={progress.duration}
          buffered={progress.buffered}
          onSeek={seekTo}
          color={albumColors.primary}
          qualityText={streamingInfo?.displayText}
          qualityTextSimple={streamingInfo?.displayTextSimple}
        />

        {/* Main Controls */}
        <View style={styles.mainControls}>
          <ControlButton onPress={handleToggleShuffle}>
            {shuffleEnabled ? (
              <Shuffle
                size={28}
                color={albumColors.primary}
                strokeWidth={2}
              />
            ) : (
              <ArrowRightLeft
                size={28}
                color={albumColors.primary}
                strokeWidth={2}
              />
            )}
          </ControlButton>

          <ControlButton onPress={handleSkipPrevious}>
            <SkipBack size={36} color={albumColors.primary} fill={albumColors.primary} />
          </ControlButton>

          <ControlButton
            onPress={handleTogglePlayPause}
            style={[styles.playButton, { backgroundColor: albumColors.primary }]}
          >
            {isPlaying ? (
              <Pause size={40} color={albumColors.textColor} fill={albumColors.textColor} />
            ) : (
              <Play size={40} color={albumColors.textColor} fill={albumColors.textColor} />
            )}
          </ControlButton>

          <ControlButton onPress={handleSkipNext}>
            <SkipForward size={36} color={albumColors.primary} fill={albumColors.primary} />
          </ControlButton>

          <ControlButton onPress={handleCycleRepeat}>
            {repeatMode === 'track' ? (
              <Repeat1
                size={28}
                color={albumColors.primary}
                strokeWidth={2}
              />
            ) : repeatMode === 'queue' ? (
              <Repeat
                size={28}
                color={albumColors.primary}
                strokeWidth={2}
              />
            ) : (
              <View style={styles.repeatOffContainer}>
                <Repeat
                  size={28}
                  color={albumColors.primary}
                  strokeWidth={2}
                />
                <View style={styles.repeatOffSlash}>
                  <View style={[styles.repeatOffLine, { backgroundColor: albumColors.primary }]} />
                </View>
              </View>
            )}
          </ControlButton>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            onPress={() => setShowLyrics(true)}
            style={styles.bottomButton}
          >
            <MicVocal
              size={24}
              color={albumColors.primary}
              strokeWidth={2}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomButton}>
            <Cast size={24} color={albumColors.primary} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => setShowQueue(true)}
          >
            <ListMusic size={24} color={albumColors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Track Menu Modal */}
        <TrackMenu
          visible={trackMenuState.showTrackMenu}
          onClose={handleMenuClose}
          track={trackMenuState.selectedTrack}
          onShowInfo={trackMenuState.handleShowInfo}
          onShowAddToPlaylist={trackMenuState.handleShowAddToPlaylist}
          onShowConfirm={trackMenuState.handleShowConfirm}
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
      </View>
      </BlurredBackground>
      </View>
    </Animated.View>

    {/* Lyrics and Queue overlays */}
    {showLyrics && <LyricsScreen onClose={() => setShowLyrics(false)} />}
    {showQueue && <QueueScreen onClose={() => setShowQueue(false)} />}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  swipeIndicator: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  swipeHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // More visible
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.muted,
  },
  placeholder: {
    width: 40,
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md, // Moved up
    marginBottom: theme.spacing.xl,
  },
  artwork: {
    width: width - theme.spacing.lg * 3, // Bigger (was *4, now *3)
    height: width - theme.spacing.lg * 3,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  placeholderArtwork: {
    backgroundColor: theme.colors.background.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 64,
    color: theme.colors.text.muted,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  artist: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  artistsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  artistLink: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  artistSeparator: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  album: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.muted,
  },
  topActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  topActionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityBadgeContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  qualityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1.5,
  },
  qualityText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs, // Reduced further to bring controls even closer
    paddingHorizontal: theme.spacing.md,
  },
  mainControlButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bottomControls: {
    position: 'absolute', // Position absolutely at bottom
    bottom: theme.spacing.xl, // Fixed distance from bottom
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  bottomButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatOffContainer: {
    position: 'relative',
  },
  repeatOffSlash: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatOffLine: {
    width: 35,
    height: 2,
    // backgroundColor is dynamic (passed inline as albumColors.textColor)
    transform: [{ rotate: '-45deg' }],
  },
});
