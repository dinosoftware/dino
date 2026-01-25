/**
 * Dino Music App - Artist Menu (QAM)
 * Quick Action Menu for artist options
 */

import React, { useRef, useEffect } from 'react';
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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { 
  Heart, 
  Share2, 
  PlayCircle, 
  Shuffle,
  Radio,
  Info,
  X,
  User 
} from 'lucide-react-native';
import { theme } from '../../config';
import { Artist } from '../../api/opensubsonic/types';
import { useFavoritesStore } from '../../stores/favoritesStore';

interface ArtistMenuProps {
  visible: boolean;
  onClose: () => void;
  artist: Artist | null;
  coverArtUrl?: string;
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

export const ArtistMenu: React.FC<ArtistMenuProps> = ({ visible, onClose, artist, coverArtUrl }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const { isArtistStarred, toggleArtistStar } = useFavoritesStore();

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
            toValue: 1000,
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

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handlePlayAll = () => {
    console.log('Play all tracks by artist:', artist?.name);
    // TODO: Implement play all functionality
    onClose();
  };

  const handleShuffle = () => {
    console.log('Shuffle artist:', artist?.name);
    // TODO: Implement shuffle functionality
    onClose();
  };

  const handleRadio = () => {
    console.log('Start artist radio:', artist?.name);
    // TODO: Implement artist radio functionality
    onClose();
  };

  const handleFavorite = async () => {
    if (!artist) return;
    
    const isStarred = isArtistStarred(artist.id);
    
    try {
      await toggleArtistStar(artist.id, isStarred);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Failed to toggle artist favorite:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onClose();
    }
  };

  const handleShare = () => {
    console.log('Share artist:', artist?.name);
    // TODO: Implement share functionality
    onClose();
  };

  const handleInfo = () => {
    console.log('Show artist info:', artist?.name);
    // TODO: Implement artist info functionality
    onClose();
  };

  if (!artist) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Animated.View
          style={[styles.menu, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <Pressable>
            {/* Swipe Handle */}
            <View style={styles.swipeHandle} />

            {/* Artist Header */}
            <View style={styles.header}>
              <View style={styles.artistImageContainer}>
                {coverArtUrl ? (
                  <Image source={{ uri: coverArtUrl }} style={styles.artistImage} />
                ) : (
                  <View style={[styles.artistImage, styles.placeholderImage]}>
                    <User size={32} color={theme.colors.text.tertiary} />
                  </View>
                )}
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.artistName} numberOfLines={2}>
                  {artist.name}
                </Text>
                {artist.albumCount !== undefined && (
                  <Text style={styles.artistDetails}>
                    {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              <MenuItem
                icon={<PlayCircle size={24} color={theme.colors.text.primary} />}
                label="Play All"
                onPress={handlePlayAll}
              />
              <MenuItem
                icon={<Shuffle size={24} color={theme.colors.text.primary} />}
                label="Shuffle"
                onPress={handleShuffle}
              />
              <MenuItem
                icon={<Radio size={24} color={theme.colors.text.primary} />}
                label="Artist Radio"
                onPress={handleRadio}
              />
              <MenuItem
                icon={
                  <Heart 
                    size={24} 
                    color={theme.colors.text.primary}
                    fill={artist && isArtistStarred(artist.id) ? theme.colors.text.primary : 'transparent'}
                  />
                }
                label={artist && isArtistStarred(artist.id) ? "Remove from Favorites" : "Add to Favorites"}
                onPress={handleFavorite}
              />
              <MenuItem
                icon={<Share2 size={24} color={theme.colors.text.primary} />}
                label="Share"
                onPress={handleShare}
              />
              <MenuItem
                icon={<Info size={24} color={theme.colors.text.primary} />}
                label="Artist Info"
                onPress={handleInfo}
              />
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.xl,
  },
  swipeHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.text.tertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  artistImageContainer: {
    marginRight: theme.spacing.md,
  },
  artistImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  placeholderImage: {
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  artistDetails: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  menuItems: {
    paddingTop: theme.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  menuIcon: {
    marginRight: theme.spacing.md,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
});
