/**
 * Dino Music App - Track Menu (QAM)
 * Quick Action Menu for track options
 */

import * as Haptics from 'expo-haptics';
import {
  Album,
  Download,
  Heart,
  Info,
  ListEnd,
  ListPlus,
  ListStart,
  Radio,
  Share2,
  User,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getSimilarSongs2 } from '../../api/opensubsonic/radio';
import { createShare } from '../../api/opensubsonic/share';
import { Artist, Track } from '../../api/opensubsonic/types';
import { useCoverArt } from '../../hooks/api';
import { useTheme } from '../../hooks/useTheme';
import { downloadService } from '../../services/DownloadService';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { useQueueStore } from '../../stores';
import { useDownloadStore } from '../../stores/downloadStore';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToastStore } from '../../stores/toastStore';

interface TrackMenuProps {
  visible: boolean;
  onClose: () => void;
  track: Track | null;
  onShowInfo: () => void;
  onShowAddToPlaylist: () => void;
  onShowConfirm: (title: string, message: string) => void;
  onGoToArtist?: (artists: Artist[]) => void;
  onCloseAll?: () => void;
}

export const TrackMenu: React.FC<TrackMenuProps> = ({ visible, onClose, track, onShowInfo, onShowAddToPlaylist, onShowConfirm, onGoToArtist, onCloseAll }) => {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(0)).current;
  const { data: coverArtUrl } = useCoverArt(track?.coverArt, 200);
  const { addToQueue, setQueue } = useQueueStore();
  const { isTrackStarred, toggleTrackStar } = useFavoritesStore();
  const { isTrackDownloaded } = useDownloadStore();
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const { navigate } = useNavigationStore();
  const { showToast } = useToastStore();

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'flex-end',
    },
    menu: {
      backgroundColor: theme.colors.background.card,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingBottom: theme.spacing.lg,
    },
    swipeIndicator: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
    },
    swipeHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.text.tertiary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    coverArt: {
      width: 56,
      height: 56,
      borderRadius: theme.borderRadius.md,
      marginRight: theme.spacing.md,
    },
    trackInfo: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    trackTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    trackArtist: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
    closeButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuItems: {
      paddingVertical: theme.spacing.xs,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      minHeight: 48,
    },
    menuIcon: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    menuLabel: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
  }), [theme]);

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          Animated.timing(translateY, {
            toValue: 500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!track) return null;

  const handleStartRadio = async () => {
    if (!track) return;

    onClose();

    try {
      const response = await getSimilarSongs2(track.id);
      const similarSongs = response.similarSongs2?.song || [];

      if (similarSongs.length === 0) {
        showToast(`Could not find similar songs for "${track.title}"`, 'error');
        return;
      }

      const mixQueue = [track, ...similarSongs];
      setQueue(mixQueue, 0);
      setCurrentTrack(track);
      await trackPlayerService.play();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Instant Mix started • ${mixQueue.length} songs`);
    } catch (error) {
      showToast(`Failed to start instant mix: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const handlePlayNext = () => {
    addToQueue(track, 'next');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Added to play next');
    onClose();
  };

  const handleAddToQueue = () => {
    addToQueue(track, 'end');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Added to queue');
    onClose();
  };

  const handleAddToFavorites = async () => {
    const isStarred = isTrackStarred(track.id);

    try {
      await toggleTrackStar(track.id, isStarred);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(isStarred ? 'Removed from favorites' : 'Added to favorites');
      onClose();
    } catch (error) {
      showToast(
        `Failed to ${isStarred ? 'remove from' : 'add to'} favorites`,
        'error'
      );
      onClose();
    }
  };

  const handleDownload = async () => {
    if (!track) return;

    const trackIsDownloaded = isTrackDownloaded(track.id);

    if (trackIsDownloaded) {
      try {
        await downloadService.deleteTrack(track.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Download removed');
        onClose();
      } catch (error) {
        showToast('Failed to remove download', 'error');
        onClose();
      }
      return;
    }

    try {
      await downloadService.downloadTrack(track);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Download started');
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to download',
        'error'
      );
      onClose();
    }
  };

  const handleShare = async () => {
    if (!track) return;

    const includeShareMessage = useSettingsStore.getState().includeShareMessage;

    try {
      const share = await createShare(
        [track.id],
        `${track.title} by ${track.artist || 'Unknown Artist'}`
      );

      const message = includeShareMessage
        ? `Check out "${track.title}" by ${track.artist || 'Unknown Artist'}\n\n${share.url}`
        : share.url;

      await Share.share({
        message,
        url: share.url,
        title: `Share: ${track.title}`,
      });

      showToast('Share link created');
    } catch (error) {
      console.error('Error sharing track:', error);
      showToast('Failed to create share link', 'error');
    }
    onClose();
  };

  const handleAddToPlaylist = () => {
    onClose();
    setTimeout(() => {
      onShowAddToPlaylist();
    }, 100);
  };

  const handleGoToAlbum = () => {
    if (track?.albumId) {
      onClose();
      if (onCloseAll) {
        onCloseAll();
      }
      setTimeout(() => {
        navigate({ name: 'album-detail', params: { albumId: track.albumId! } });
      }, 100);
    } else {
      onClose();
      setTimeout(() => {
        onShowConfirm('No Album Information', `No album information available for "${track?.title}".`);
      }, 100);
    }
  };

  const handleGoToArtist = () => {
    if (!track) {
      onClose();
      return;
    }

    if (track.artists && track.artists.length > 1) {
      onClose();
      setTimeout(() => {
        if (onGoToArtist) {
          onGoToArtist(track.artists!);
        }
      }, 100);
    } else if (track.artistId) {
      onClose();
      if (onCloseAll) {
        onCloseAll();
      }
      setTimeout(() => {
        navigate({ name: 'artist-detail', params: { artistId: track.artistId! } });
      }, 100);
    } else if (track.artists && track.artists.length === 1) {
      onClose();
      setTimeout(() => {
        navigate({ name: 'artist-detail', params: { artistId: track.artists![0].id } });
      }, 100);
    } else {
      onClose();
      setTimeout(() => {
        onShowConfirm('No Artist Information', `No artist information available for "${track?.title}".`);
      }, 100);
    }
  };

  const handleShowInfo = () => {
    onClose();
    setTimeout(() => onShowInfo(), 100);
  };

  const MenuItem: React.FC<{ icon: React.ReactNode; label: string; onPress: () => void }> = ({ icon, label, onPress }) => {
    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    };

    return (
      <TouchableOpacity style={styles.menuItem} onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.menuIcon}>{icon}</View>
        <Text style={styles.menuLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={[styles.menu, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.swipeIndicator}>
              <View style={styles.swipeHandle} />
            </View>

            <View style={styles.header}>
              <Image
                source={
                  coverArtUrl
                    ? { uri: coverArtUrl }
                    : require('../../../assets/images/album_art_placeholder.png')
                }
                style={styles.coverArt}
              />
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {track.artist || 'Unknown Artist'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.menuItems}>
              <MenuItem
                icon={<Radio size={22} color={theme.colors.accent} strokeWidth={2} />}
                label="Start Instant Mix"
                onPress={handleStartRadio}
              />
              <MenuItem
                icon={<ListStart size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Play Next"
                onPress={handlePlayNext}
              />
              <MenuItem
                icon={<ListEnd size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Add to Queue"
                onPress={handleAddToQueue}
              />
              <MenuItem
                icon={
                  <Heart
                    size={22}
                    color={theme.colors.text.primary}
                    strokeWidth={2}
                    fill={isTrackStarred(track.id) ? theme.colors.text.primary : 'transparent'}
                  />
                }
                label={isTrackStarred(track.id) ? "Remove from Favorites" : "Add to Favorites"}
                onPress={handleAddToFavorites}
              />
              <MenuItem
                icon={<ListPlus size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Add to Playlist"
                onPress={handleAddToPlaylist}
              />
              <MenuItem
                icon={<Album size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Go to Album"
                onPress={handleGoToAlbum}
              />
              <MenuItem
                icon={<User size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Go to Artist"
                onPress={handleGoToArtist}
              />
              <MenuItem
                icon={<Download size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label={isTrackDownloaded(track.id) ? "Remove Download" : "Download"}
                onPress={handleDownload}
              />
              <MenuItem
                icon={<Share2 size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Share"
                onPress={handleShare}
              />
              <MenuItem
                icon={<Info size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Song Info"
                onPress={handleShowInfo}
              />
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>

    </Modal>
  );
};
