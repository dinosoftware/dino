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
  PlaySquare,
  Radio,
  Share2,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
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
import { Track } from '../../api/opensubsonic/types';
import { theme } from '../../config';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { useQueueStore } from '../../stores';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';

interface TrackMenuProps {
  visible: boolean;
  onClose: () => void;
  track: Track | null;
  onShowInfo: () => void;
  onShowAddToPlaylist: () => void;
  onShowConfirm: (title: string, message: string) => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress }) => {
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

export const TrackMenu: React.FC<TrackMenuProps> = ({ visible, onClose, track, onShowInfo, onShowAddToPlaylist, onShowConfirm }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const { addToQueue, setQueue } = useQueueStore();
  const { isTrackStarred, toggleTrackStar } = useFavoritesStore();
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const { navigate } = useNavigationStore();

  // Haptic feedback when menu opens
  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward swipes
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // Swipe down threshold exceeded, close menu
          Animated.timing(translateY, {
            toValue: 500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          // Snap back
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
      // Fetch similar songs
      const response = await getSimilarSongs2(track.id, 50);
      const similarSongs = response.similarSongs2?.song || [];

      if (similarSongs.length === 0) {
        setTimeout(() => {
          onShowConfirm('No Similar Songs', `Could not find similar songs for "${track.title}".`);
        }, 100);
        return;
      }

      // Create queue with current track + similar songs
      const mixQueue = [track, ...similarSongs];
      setQueue(mixQueue, 0);
      setCurrentTrack(track);
      await trackPlayerService.play();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        onShowConfirm('Instant Mix Started', `Playing ${mixQueue.length} songs similar to "${track.title}"`);
      }, 100);
    } catch (error) {
      setTimeout(() => {
        onShowConfirm('Error', `Failed to start instant mix: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }, 100);
    }
  };

  const handlePlayNext = () => {
    addToQueue(track, 'next');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleAddToQueue = () => {
    addToQueue(track, 'end');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleAddToFavorites = async () => {
    const isStarred = isTrackStarred(track.id);

    try {
      await toggleTrackStar(track.id, isStarred);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();

      setTimeout(() => {
        onShowConfirm(
          isStarred ? 'Removed from Favorites' : 'Added to Favorites',
          `"${track.title}" has been ${isStarred ? 'removed from' : 'added to'} your favorites.`
        );
      }, 100);
    } catch (error) {
      onClose();
      setTimeout(() => {
        onShowConfirm(
          'Error',
          `Failed to ${isStarred ? 'remove from' : 'add to'} favorites: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }, 100);
    }
  };

  const handleDownload = () => {
    onClose();
    setTimeout(() => {
      onShowConfirm('Download', 'Download functionality coming soon!');
    }, 100);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${track.title}" by ${track.artist || 'Unknown Artist'}`,
        title: track.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
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

  const handleShowInfo = () => {
    onClose();
    setTimeout(() => onShowInfo(), 100);
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
            {/* Swipe Indicator */}
            <View style={styles.swipeIndicator}>
              <View style={styles.swipeHandle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
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

            {/* Menu Items */}
            <View style={styles.menuItems}>
              <MenuItem
                icon={<Radio size={22} color={theme.colors.accent} strokeWidth={2} />}
                label="Start Instant Mix"
                onPress={handleStartRadio}
              />
              <MenuItem
                icon={<PlaySquare size={22} color={theme.colors.text.primary} strokeWidth={2} />}
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
                icon={<Download size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Download"
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

const styles = StyleSheet.create({
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
});
