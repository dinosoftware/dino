/**
 * Dino Music App - Full Player
 * Optimized full screen player with memoization, dynamic backgrounds, and responsive layout
 */

import * as Haptics from 'expo-haptics';
import { ArrowRightLeft, Cast, ChevronDown, Heart, ListMusic, MicVocal, MoreVertical, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react-native';
import React, { memo, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Track, Artist } from '../../api/opensubsonic/types';
import { useTheme, useBackgroundStyle } from '../../hooks/useTheme';
import { useCoverArt } from '../../hooks/api';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { usePlayer } from '../../hooks/usePlayer';
import { useProgress } from '../../hooks/useProgress';
import { useTrackMenuState } from '../../hooks/useTrackMenuState';
import { LyricsScreen } from '../../screens/Player/LyricsScreen';
import { QueueScreen } from '../../screens/Player/QueueScreen';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { MarqueeText } from '../common/MarqueeText';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useRemotePlaybackStore } from '../../stores/remotePlaybackStore';
import { AddToPlaylistModal } from '../Modals/AddToPlaylistModal';
import { ArtistSelectionModal } from '../Modals/ArtistSelectionModal';
import { ConfirmModal } from '../Modals/ConfirmModal';
import { RemoteDevicesSheet } from '../Modals/RemoteDevicesSheet';
import { SongInfoModal } from '../Modals/SongInfoModal';
import { ProgressBar } from './ProgressBar';
import { TrackMenu } from './TrackMenu';

interface FullPlayerProps {
  onClose: () => void;
}

const createStyles = (theme: ReturnType<typeof useTheme>, screenWidth: number, screenHeight: number, isTablet: boolean) => {
  const isLandscape = screenWidth > screenHeight;
  const useTabletLayout = isTablet && isLandscape;
  
  // Detect screen height category for responsive positioning
  // Standard phone: aspect ratio ~1.78-1.95 (e.g., 16:9, 18:9)
  // Tall phone: aspect ratio ~1.95-2.1 (e.g., 19.5:9, 20:9)
  // Very tall phone: aspect ratio > 2.1 (e.g., 20.5:9, 21:9, 22:9+)
  const aspectRatio = screenHeight / screenWidth;
  
  // Calculate extra spacing for tall screens - AFTER artwork
  // Only applies to screens with aspect ratio > 2.1
  let infoMarginTop = 0;
  let artworkMarginTop = 0;

    if (!isTablet && aspectRatio > 2.1) {
      const tallThreshold = 2.1;
      const extraRatio = aspectRatio - tallThreshold;
      
      // Scale the extra space based on how much taller the screen is, half the original
      const extraSpace = Math.floor(screenHeight * extraRatio * 0.275);
      
      // Put extra space before artwork (as margin on artwork container)
      artworkMarginTop = extraSpace;
      // Put extra space after artwork (as margin on info section)
      infoMarginTop = extraSpace;
    }
  
  // Phone: full width minus padding, max 380px (or slightly larger for tall screens)
  // Tablet portrait: 50% of width, max 280px
  // Tablet landscape: fixed 280px
  let phoneArtworkSize = Math.min(screenWidth - theme.spacing.lg * 2, 380);
  
  // Increase artwork size slightly for tall phones
  if (!isTablet && aspectRatio > 2.1) {
    phoneArtworkSize = Math.min(screenWidth - theme.spacing.lg * 2, 400);
  }
  
  const tabletArtworkSize = useTabletLayout ? 350 : Math.min(screenWidth * 0.5, 350);
  const artworkSize = isTablet ? tabletArtworkSize : phoneArtworkSize;

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    swipeIndicator: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingTop: theme.spacing.xxl,
    },
    swipeHandle: {
      width: 48,
      height: 5,
      borderRadius: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: isTablet ? theme.spacing.sm : 0,
      height: isTablet ? undefined : 44,
    },
    closeButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholder: {
      width: 44,
    },
    contentWrapper: {
      flex: 1,
      justifyContent: isTablet ? 'center' : 'flex-start',
    },
    artworkContainer: {
      alignItems: 'center',
      marginTop: isTablet ? theme.spacing.lg : artworkMarginTop,
      marginBottom: isTablet ? theme.spacing.lg : theme.spacing.sm,
    },
    artwork: {
      width: artworkSize,
      height: artworkSize,
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
      alignItems: 'center',
      marginTop: isTablet ? theme.spacing.md : (theme.spacing.sm + infoMarginTop),
      marginBottom: isTablet ? theme.spacing.md : theme.spacing.sm,
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
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text.secondary,
    },
    topActions: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    topActionButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mainControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: isTablet ? theme.spacing.md : theme.spacing.sm,
      gap: theme.spacing.lg,
    },
    mainControlButton: {
      width: isTablet ? 60 : 56,
      height: isTablet ? 60 : 56,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButton: {
      width: isTablet ? 84 : 80,
      height: isTablet ? 84 : 80,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bottomControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: isTablet ? theme.spacing.md : theme.spacing.sm,
      gap: theme.spacing.xxl,
    },
    bottomControlsFixed: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.xxl,
    },
    bottomButton: {
      width: 52,
      height: 52,
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
      width: 32,
      height: 2,
      transform: [{ rotate: '-45deg' }],
    },
    tabletLayout: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.xl,
    },
    tabletLeftSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabletRightSection: {
      flex: 1.2,
      justifyContent: 'center',
      gap: theme.spacing.lg,
    },
    tabletInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tabletTrackInfo: {
      flex: 1,
    },
    tabletActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
  });
};

const Artwork = memo<{ uri?: string; style: any }>(({ uri, style }) => {
  if (uri) {
    return <Image source={{ uri }} style={style} resizeMode="cover" />;
  }
  return (
    <View style={[style, { backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ fontSize: 64, color: '#666' }}>♪</Text>
    </View>
  );
});
Artwork.displayName = 'Artwork';

const TrackInfo = memo<{ 
  track: Track; 
  onNavigate: (action?: () => void) => void; 
  onShowArtistSelection: (artists: Artist[]) => void;
  styles: any 
}>(({ track, onNavigate, onShowArtistSelection, styles }) => {
  const { navigate, currentScreen } = useNavigationStore();

  const handleArtistPress = useCallback(() => {
    const artists = track.artists;
    if (artists && artists.length > 1) {
      onShowArtistSelection(artists);
      return;
    }
    
    const artistId = artists?.[0]?.id || track.artistId;
    if (!artistId) return;
    
    if (currentScreen.name === 'artist-detail' && currentScreen.params?.artistId === artistId) {
      onNavigate();
      return;
    }
    onNavigate(() => navigate({ name: 'artist-detail', params: { artistId } }));
  }, [track.artists, track.artistId, navigate, currentScreen, onNavigate, onShowArtistSelection]);

  const handleAlbumPress = useCallback(() => {
    if (!track.albumId) return;
    if (currentScreen.name === 'album-detail' && currentScreen.params?.albumId === track.albumId) {
      onNavigate();
      return;
    }
    onNavigate(() => navigate({ name: 'album-detail', params: { albumId: track.albumId! } }));
  }, [track.albumId, navigate, currentScreen, onNavigate]);

  const displayArtist = track.displayArtist || track.artist || 'Unknown Artist';

  return (
    <View style={styles.info}>
      <MarqueeText style={styles.title}>
        {track.title}
      </MarqueeText>
      <TouchableOpacity onPress={handleArtistPress}>
        <MarqueeText style={styles.artist}>
          {displayArtist}
        </MarqueeText>
      </TouchableOpacity>
      {track.album && (
        <TouchableOpacity onPress={handleAlbumPress}>
          <MarqueeText style={styles.album}>
            {track.album}
          </MarqueeText>
        </TouchableOpacity>
      )}
    </View>
  );
});
TrackInfo.displayName = 'TrackInfo';

const ControlButton = memo<{ onPress: () => void; children: React.ReactNode; style?: any; styles: any }>(
  ({ onPress, children, style, styles }) => (
    <TouchableOpacity onPress={onPress} style={[styles.mainControlButton, style]}>
      {children}
    </TouchableOpacity>
  )
);
ControlButton.displayName = 'ControlButton';

const PlayerBackground: React.FC<{
  coverArtUrl?: string;
  albumColors: { primary: string; secondary: string; background: string; textColor: string };
  children: React.ReactNode;
}> = ({ coverArtUrl, albumColors, children }) => {
  const theme = useTheme();
  const backgroundStyle = useBackgroundStyle();

  const baseBackgroundColor = theme.colors.background.primary;

  if (backgroundStyle === 'solid') {
    return (
      <View style={{ flex: 1, backgroundColor: baseBackgroundColor }}>
        {children}
      </View>
    );
  }

  if (backgroundStyle === 'gradient') {
    const bgColor = albumColors.background || baseBackgroundColor;
    return (
      <View style={{ flex: 1, backgroundColor: baseBackgroundColor }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />
        {children}
      </View>
    );
  }

  if (backgroundStyle === 'blur' && coverArtUrl) {
    const isDark = theme.mode !== 'light';
    return (
      <View style={{ flex: 1, backgroundColor: baseBackgroundColor }}>
        <Image
          source={{ uri: coverArtUrl }}
          style={StyleSheet.absoluteFill}
          blurRadius={80}
          resizeMode="cover"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)' }]} />
        {children}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: baseBackgroundColor }}>
      {children}
    </View>
  );
};

export const FullPlayer: React.FC<FullPlayerProps> = ({ onClose }) => {
  const theme = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Tablet: wider screens (600px+) when in portrait
  // This captures tablets and large foldables when unfolded
  const minDimension = Math.min(screenWidth, screenHeight);
  const isTablet = minDimension >= 600;
  const isLandscape = screenWidth > screenHeight;
  const useTabletLayout = isTablet && isLandscape;
  
  const styles = useMemo(() => createStyles(theme, screenWidth, screenHeight, isTablet), [theme, screenWidth, screenHeight, isTablet]);

  const {
    currentTrack,
    isPlaying,
    playbackState,
    repeatMode,
    shuffleEnabled,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekTo,
    toggleShuffle,
    cycleRepeatMode,
  } = usePlayer();

  const progress = useProgress();
  const isBuffering = playbackState === 'buffering';
  const streamingInfo = usePlayerStore((state) => state.streamingInfo);
  const activePlayerType = useRemotePlaybackStore((state) => state.activePlayerType);
  const isCasting = activePlayerType !== 'local';
  const { setPlayerOverlay, setCloseOverlayCallback } = useNavigationStore();

  const { data: coverArtUrl } = useCoverArt(currentTrack?.coverArt, 500);
  const albumColors = useAlbumColors(coverArtUrl || undefined);
  const { isTrackStarred, toggleTrackStar } = useFavoritesStore();
  const trackMenuState = useTrackMenuState();
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMenuOpenRef = useRef(false);
  const translateY = useRef(new Animated.Value(screenHeight)).current;

  const handleShowArtistSelection = useCallback((artists: Artist[]) => {
    trackMenuState.handleGoToArtist(artists);
  }, []);

  const closeCurrentOverlay = useCallback(() => {
    if (showQueue) {
      setShowQueue(false);
    } else if (showLyrics) {
      setShowLyrics(false);
    }
  }, [showQueue, showLyrics]);

  useEffect(() => {
    if (showQueue) {
      setPlayerOverlay('queue');
    } else if (showLyrics) {
      setPlayerOverlay('lyrics');
    } else {
      setPlayerOverlay('none');
    }
  }, [showQueue, showLyrics, setPlayerOverlay]);

  useEffect(() => {
    setCloseOverlayCallback(closeCurrentOverlay);
    return () => setCloseOverlayCallback(null);
  }, [closeCurrentOverlay, setCloseOverlayCallback]);

  useEffect(() => {
    return () => {
      setPlayerOverlay('none');
      setCloseOverlayCallback(null);
    };
  }, [setPlayerOverlay, setCloseOverlayCallback]);

  useEffect(() => {
    const anyModalOpen =
      isMenuOpen ||
      trackMenuState.showSongInfo ||
      trackMenuState.showAddToPlaylist ||
      trackMenuState.showConfirm ||
      showLyrics ||
      showQueue;
    isMenuOpenRef.current = anyModalOpen;
  }, [isMenuOpen, trackMenuState, showLyrics, showQueue]);

  useEffect(() => {
    translateY.setValue(screenHeight);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, []);

  const handleClose = useCallback(() => {
    Animated.timing(translateY, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [translateY, onClose, screenHeight]);

  const handleNavigate = useCallback((action?: () => void) => {
    Animated.timing(translateY, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      action?.();
    });
  }, [translateY, onClose, screenHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isMenuOpenRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isMenuOpenRef.current) return false;
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

  const renderPhoneLayout = () => (
    <>
      <View style={styles.swipeIndicator}>
        <View style={styles.swipeHandle} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <ChevronDown size={28} color={theme.colors.text.primary} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.contentWrapper}>
        <View style={styles.artworkContainer}>
          <Artwork uri={coverArtUrl || undefined} style={styles.artwork} />
        </View>

        <View style={styles.infoRow}>
          <TrackInfo track={currentTrack} onNavigate={handleNavigate} onShowArtistSelection={handleShowArtistSelection} styles={styles} />
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.topActionButton} onPress={handleMenuOpen}>
              <MoreVertical size={24} color={albumColors.primary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topActionButton} onPress={handleToggleFavorite}>
              <Heart
                size={24}
                color={albumColors.primary}
                strokeWidth={2}
                fill={isFavorite ? albumColors.primary : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ProgressBar
          position={progress.position}
          duration={progress.duration}
          buffered={progress.buffered}
          onSeek={seekTo}
          color={albumColors.primary}
          qualityText={streamingInfo?.displayText}
          qualityTextSimple={streamingInfo?.displayTextSimple}
        />

        <View style={styles.mainControls}>
          <ControlButton onPress={toggleShuffle} styles={styles}>
            {shuffleEnabled ? (
              <Shuffle size={28} color={albumColors.primary} strokeWidth={2} />
            ) : (
              <ArrowRightLeft size={28} color={albumColors.primary} strokeWidth={2} />
            )}
          </ControlButton>

          <ControlButton onPress={skipToPrevious} styles={styles}>
            <SkipBack size={36} color={albumColors.primary} fill={albumColors.primary} />
          </ControlButton>

          <ControlButton
            onPress={togglePlayPause}
            style={[styles.playButton, { backgroundColor: albumColors.primary }]}
            styles={styles}
          >
            {isBuffering ? (
              <ActivityIndicator size="large" color={albumColors.textColor} />
            ) : isPlaying ? (
              <Pause size={40} color={albumColors.textColor} fill={albumColors.textColor} />
            ) : (
              <Play size={40} color={albumColors.textColor} fill={albumColors.textColor} />
            )}
          </ControlButton>

          <ControlButton onPress={skipToNext} styles={styles}>
            <SkipForward size={36} color={albumColors.primary} fill={albumColors.primary} />
          </ControlButton>

          <ControlButton onPress={cycleRepeatMode} styles={styles}>
            {repeatMode === 'track' ? (
              <Repeat1 size={28} color={albumColors.primary} strokeWidth={2} />
            ) : repeatMode === 'queue' ? (
              <Repeat size={28} color={albumColors.primary} strokeWidth={2} />
            ) : (
              <View style={styles.repeatOffContainer}>
                <Repeat size={28} color={albumColors.primary} strokeWidth={2} />
                <View style={styles.repeatOffSlash}>
                  <View style={[styles.repeatOffLine, { backgroundColor: albumColors.primary }]} />
                </View>
              </View>
            )}
          </ControlButton>
        </View>
      </View>

      <View style={styles.bottomControlsFixed}>
        <TouchableOpacity onPress={() => setShowLyrics(true)} style={styles.bottomButton}>
          <MicVocal size={24} color={albumColors.primary} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowCastModal(true)} style={styles.bottomButton}>
          <Cast 
            size={24} 
            color={albumColors.primary} 
            fill={isCasting ? albumColors.primary : 'transparent'}
            strokeWidth={2} 
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowQueue(true)} style={styles.bottomButton}>
          <ListMusic size={24} color={albumColors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </>
  );

  const renderTabletLayout = () => (
    <>
      <View style={styles.swipeIndicator}>
        <View style={styles.swipeHandle} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <ChevronDown size={28} color={theme.colors.text.primary} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabletLayout}>
        <View style={styles.tabletLeftSection}>
          <Artwork uri={coverArtUrl || undefined} style={styles.artwork} />
        </View>

        <View style={styles.tabletRightSection}>
          <View style={styles.tabletInfoRow}>
            <View style={styles.tabletTrackInfo}>
              <Text style={styles.title} numberOfLines={2}>
                {currentTrack.title}
              </Text>
              <TouchableOpacity onPress={() => currentTrack.artistId && handleNavigate(() => useNavigationStore.getState().navigate({ name: 'artist-detail', params: { artistId: currentTrack.artistId! } }))}>
                <Text style={styles.artist} numberOfLines={1}>
                  {currentTrack.displayArtist || currentTrack.artist || 'Unknown Artist'}
                </Text>
              </TouchableOpacity>
              {currentTrack.album && (
                <TouchableOpacity onPress={() => currentTrack.albumId && handleNavigate(() => useNavigationStore.getState().navigate({ name: 'album-detail', params: { albumId: currentTrack.albumId! } }))}>
                  <Text style={styles.album} numberOfLines={1}>
                    {currentTrack.album}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.tabletActions}>
              <TouchableOpacity style={styles.topActionButton} onPress={handleMenuOpen}>
                <MoreVertical size={24} color={albumColors.primary} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.topActionButton} onPress={handleToggleFavorite}>
                <Heart
                  size={24}
                  color={albumColors.primary}
                  strokeWidth={2}
                  fill={isFavorite ? albumColors.primary : 'transparent'}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ProgressBar
            position={progress.position}
            duration={progress.duration}
            buffered={progress.buffered}
            onSeek={seekTo}
            color={albumColors.primary}
            qualityText={streamingInfo?.displayText}
            qualityTextSimple={streamingInfo?.displayTextSimple}
          />

          <View style={styles.mainControls}>
            <ControlButton onPress={toggleShuffle} styles={styles}>
              {shuffleEnabled ? (
                <Shuffle size={28} color={albumColors.primary} strokeWidth={2} />
              ) : (
                <ArrowRightLeft size={28} color={albumColors.primary} strokeWidth={2} />
              )}
            </ControlButton>

            <ControlButton onPress={skipToPrevious} styles={styles}>
              <SkipBack size={36} color={albumColors.primary} fill={albumColors.primary} />
            </ControlButton>

            <ControlButton
              onPress={togglePlayPause}
              style={[styles.playButton, { backgroundColor: albumColors.primary }]}
              styles={styles}
            >
              {isBuffering ? (
                <ActivityIndicator size="large" color={albumColors.textColor} />
              ) : isPlaying ? (
                <Pause size={40} color={albumColors.textColor} fill={albumColors.textColor} />
              ) : (
                <Play size={40} color={albumColors.textColor} fill={albumColors.textColor} />
              )}
            </ControlButton>

            <ControlButton onPress={skipToNext} styles={styles}>
              <SkipForward size={36} color={albumColors.primary} fill={albumColors.primary} />
            </ControlButton>

            <ControlButton onPress={cycleRepeatMode} styles={styles}>
              {repeatMode === 'track' ? (
                <Repeat1 size={28} color={albumColors.primary} strokeWidth={2} />
              ) : repeatMode === 'queue' ? (
                <Repeat size={28} color={albumColors.primary} strokeWidth={2} />
              ) : (
                <View style={styles.repeatOffContainer}>
                  <Repeat size={28} color={albumColors.primary} strokeWidth={2} />
                  <View style={styles.repeatOffSlash}>
                    <View style={[styles.repeatOffLine, { backgroundColor: albumColors.primary }]} />
                  </View>
                </View>
              )}
            </ControlButton>
          </View>
        </View>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity onPress={() => setShowLyrics(true)} style={styles.bottomButton}>
          <MicVocal size={24} color={albumColors.primary} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowCastModal(true)} style={styles.bottomButton}>
          <Cast 
            size={24} 
            color={albumColors.primary} 
            fill={isCasting ? albumColors.primary : 'transparent'}
            strokeWidth={2} 
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowQueue(true)} style={styles.bottomButton}>
          <ListMusic size={24} color={albumColors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <>
      <View style={StyleSheet.absoluteFillObject}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateY }] }]}>
          <PlayerBackground coverArtUrl={coverArtUrl || undefined} albumColors={albumColors}>
            <View style={styles.container} {...panResponder.panHandlers}>
              {useTabletLayout ? renderTabletLayout() : renderPhoneLayout()}
            </View>

            <TrackMenu
              visible={trackMenuState.showTrackMenu}
              onClose={handleMenuClose}
              track={trackMenuState.selectedTrack}
              onShowInfo={trackMenuState.handleShowInfo}
              onShowAddToPlaylist={trackMenuState.handleShowAddToPlaylist}
              onShowConfirm={trackMenuState.handleShowConfirm}
              onGoToArtist={trackMenuState.handleGoToArtist}
              onCloseAll={onClose}
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

            <RemoteDevicesSheet
              visible={showCastModal}
              onClose={() => setShowCastModal(false)}
            />

            <ArtistSelectionModal
              visible={trackMenuState.showArtistSelection}
              onClose={() => trackMenuState.setShowArtistSelection(false)}
              artists={trackMenuState.artistsToSelect}
              onSelectArtist={(artistId) => {
                handleNavigate(() => useNavigationStore.getState().navigate({ name: 'artist-detail', params: { artistId } }));
              }}
            />
          </PlayerBackground>
        </Animated.View>
      </View>

      {showLyrics && <LyricsScreen onClose={() => setShowLyrics(false)} />}
      {showQueue && <QueueScreen onClose={() => setShowQueue(false)} />}
    </>
  );
};
