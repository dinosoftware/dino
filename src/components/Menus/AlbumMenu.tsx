/**
 * Dino Music App - Album Menu (QAM)
 * Quick Action Menu for album options
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  PanResponder,
  Animated,
  Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { 
  Heart, 
  Download, 
  Share2, 
  PlayCircle, 
  Shuffle,
  Info,
  ListPlus,
  User,
  X 
} from 'lucide-react-native';
import { theme } from '../../config';
import { Album } from '../../api/opensubsonic/types';
import { createShare } from '../../api/opensubsonic/share';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useDownloadStore } from '../../stores/downloadStore';
import { useToastStore } from '../../stores/toastStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { downloadService } from '../../services/DownloadService';

interface AlbumMenuProps {
  visible: boolean;
  onClose: () => void;
  album: Album | null;
  coverArtUrl?: string;
  onShowInfo: () => void;
  onAddToPlaylist: () => void;
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

export const AlbumMenu: React.FC<AlbumMenuProps> = ({ visible, onClose, album, coverArtUrl, onShowInfo, onAddToPlaylist }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const { isAlbumStarred, toggleAlbumStar } = useFavoritesStore();
  const { isAlbumDownloaded } = useDownloadStore();
  const { showToast } = useToastStore();
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

  if (!album) return null;

  const handleAddToFavorites = async () => {
    const isStarred = isAlbumStarred(album.id);
    
    try {
      await toggleAlbumStar(album.id, isStarred);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(isStarred ? 'Removed from favorites' : 'Added to favorites');
      onClose();
    } catch (error) {
      console.error('Failed to toggle album favorite:', error);
      showToast('Failed to update favorites', 'error');
      onClose();
    }
  };

  const handleDownload = async () => {
    if (!album) return;
    
    const albumIsDownloaded = isAlbumDownloaded(album.id);
    
    if (albumIsDownloaded) {
      // Album is already downloaded - delete it
      try {
        await downloadService.deleteAlbum(album.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Album download removed');
        onClose();
      } catch (error) {
        showToast('Failed to remove download', 'error');
        onClose();
      }
      return;
    }
    
    try {
      await downloadService.downloadAlbum(album);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Downloading ${album.songCount} tracks`);
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to download album',
        'error'
      );
      onClose();
    }
  };

  const handleShare = async () => {
    if (!album) return;
    
    const includeShareMessage = useSettingsStore.getState().includeShareMessage;
    
    try {
      // Create OpenSubsonic share
      const description = album.artist ? `${album.name} by ${album.artist}` : album.name;
      const share = await createShare([album.id], description);

      // Build message based on setting
      let message: string;
      if (includeShareMessage) {
        message = `Check out "${album.name}"`;
        if (album.artist) {
          message += ` by ${album.artist}`;
        }
        if (album.year) {
          message += ` (${album.year})`;
        }
        message += `\n\n${share.url}`;
      } else {
        message = share.url;
      }

      await Share.share({
        message: message,
        url: share.url,
        title: `Share Album: ${album.name}`,
      });
      
      showToast('Share link created');
    } catch (error) {
      console.error('Error sharing album:', error);
      showToast('Failed to create share link', 'error');
    }
    onClose();
  };

  const handlePlayAll = () => {
    console.log('Play all:', album.name);
    onClose();
  };

  const handleShuffle = () => {
    console.log('Shuffle album:', album.name);
    onClose();
  };

  const handleShowInfo = () => {
    onClose();
    setTimeout(() => onShowInfo(), 100);
  };

  const handleAddToPlaylist = () => {
    onClose();
    setTimeout(() => onAddToPlaylist?.(), 100);
  };

  const handleGoToArtist = () => {
    if (album?.artistId) {
      onClose();
      setTimeout(() => {
        navigate({ name: 'artist-detail', params: { artistId: album.artistId! } });
      }, 100);
    }
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
            {coverArtUrl && (
              <Image source={{ uri: coverArtUrl }} style={styles.coverArt} />
            )}
            <View style={styles.albumInfo}>
              <Text style={styles.albumTitle} numberOfLines={1}>
                {album.name}
              </Text>
              <Text style={styles.albumArtist} numberOfLines={1}>
                {album.artist || 'Unknown Artist'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            <MenuItem
              icon={<PlayCircle size={22} color={theme.colors.text.primary} strokeWidth={2} />}
              label="Play All"
              onPress={handlePlayAll}
            />
            <MenuItem
              icon={<Shuffle size={22} color={theme.colors.text.primary} strokeWidth={2} />}
              label="Shuffle"
              onPress={handleShuffle}
            />
            {album.artistId && (
              <MenuItem
                icon={<User size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Go to Artist"
                onPress={handleGoToArtist}
              />
            )}
            <MenuItem
              icon={
                <Heart 
                  size={22} 
                  color={theme.colors.text.primary} 
                  strokeWidth={2}
                  fill={isAlbumStarred(album.id) ? theme.colors.text.primary : 'transparent'}
                />
              }
              label={isAlbumStarred(album.id) ? "Remove from Favorites" : "Add to Favorites"}
              onPress={handleAddToFavorites}
            />
            <MenuItem
              icon={<ListPlus size={22} color={theme.colors.text.primary} strokeWidth={2} />}
              label="Add to Playlist"
              onPress={handleAddToPlaylist}
            />
            <MenuItem
              icon={<Download size={22} color={theme.colors.text.primary} strokeWidth={2} />}
              label={isAlbumDownloaded(album.id) ? "Remove Download" : "Download Album"}
              onPress={handleDownload}
            />
            <MenuItem
              icon={<Share2 size={22} color={theme.colors.text.primary} strokeWidth={2} />}
              label="Share"
              onPress={handleShare}
            />
            <MenuItem
              icon={<Info size={22} color={theme.colors.text.primary} strokeWidth={2} />}
              label="Album Info"
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
  coverArt: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
  },
  albumInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  albumTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  albumArtist: {
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
