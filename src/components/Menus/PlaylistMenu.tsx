/**
 * Dino Music App - Playlist Menu (QAM)
 * Quick Action Menu for playlist options
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  PanResponder,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { 
  Play,
  Shuffle,
  Trash2,
  Edit3,
  Share2,
  Download,
  X,
} from 'lucide-react-native';
import { AlbumArtImage } from '../common';
import { theme } from '../../config';
import { Playlist } from '../../api/opensubsonic/types';
import { useDownloadStore } from '../../stores/downloadStore';
import { useToastStore } from '../../stores/toastStore';
import { downloadService } from '../../services/DownloadService';

interface PlaylistMenuProps {
  visible: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  coverArtUrl?: string;
  onPlay?: () => void;
  onShuffle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress, destructive }) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity style={styles.menuItem} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.menuIcon}>{icon}</View>
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
    </TouchableOpacity>
  );
};

export const PlaylistMenu: React.FC<PlaylistMenuProps> = ({ 
  visible, 
  onClose, 
  playlist, 
  coverArtUrl,
  onPlay,
  onShuffle,
  onEdit,
  onDelete,
  onShare,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const { isPlaylistDownloaded } = useDownloadStore();
  const { showToast } = useToastStore();

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

  if (!playlist) return null;

  const handleDownload = async () => {
    if (!playlist) return;
    
    const playlistIsDownloaded = isPlaylistDownloaded(playlist.id);
    
    if (playlistIsDownloaded) {
      // Playlist is already downloaded - delete it
      try {
        await downloadService.deletePlaylist(playlist.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Playlist download removed');
        onClose();
      } catch (error) {
        showToast('Failed to remove download', 'error');
        onClose();
      }
      return;
    }
    
    try {
      await downloadService.downloadPlaylist(playlist);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Downloading ${playlist.songCount} tracks`);
      onClose();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to download playlist',
        'error'
      );
      onClose();
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
            <AlbumArtImage
              uri={coverArtUrl}
              style={styles.coverArt}
            />
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistTitle} numberOfLines={1}>
                {playlist.name}
              </Text>
              <Text style={styles.playlistDetails} numberOfLines={1}>
                {playlist.songCount || 0} songs
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {onPlay && (
              <MenuItem
                icon={<Play size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Play All"
                onPress={onPlay}
              />
            )}
            {onShuffle && (
              <MenuItem
                icon={<Shuffle size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Shuffle"
                onPress={onShuffle}
              />
            )}
            {onEdit && (
              <MenuItem
                icon={<Edit3 size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Edit Playlist"
                onPress={onEdit}
              />
            )}
            <MenuItem
              icon={<Download size={22} color={theme.colors.text.primary} strokeWidth={2} />}
              label={isPlaylistDownloaded(playlist.id) ? "Remove Download" : "Download Playlist"}
              onPress={handleDownload}
            />
            {onShare && (
              <MenuItem
                icon={<Share2 size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Share"
                onPress={onShare}
              />
            )}
            {onDelete && (
              <MenuItem
                icon={<Trash2 size={22} color={theme.colors.error} strokeWidth={2} />}
                label="Delete Playlist"
                onPress={onDelete}
                destructive
              />
            )}
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
  playlistInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  playlistTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  playlistDetails: {
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
  menuLabelDestructive: {
    color: theme.colors.error,
  },
});
