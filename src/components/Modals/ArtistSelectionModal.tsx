/**
 * Dino Music App - Artist Selection Modal
 * Modal to select which artist to navigate to when a track has multiple artists
 */

import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  Pressable,
  PanResponder,
  Animated,
} from 'react-native';
import { X, User, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Artist } from '../../api/opensubsonic/types';
import { useTheme } from '../../hooks/useTheme';
import { useArtist, useCoverArt } from '../../hooks/api';

interface ArtistSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  artists: Artist[];
  onSelectArtist: (artistId: string) => void;
}

const ArtistItem: React.FC<{
  artist: Artist;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}> = ({ artist, onPress, theme }) => {
  const { data: fullArtist } = useArtist(artist.id);
  const { data: coverArtUrl } = useCoverArt(fullArtist?.coverArt, 100);

  const styles = useMemo(() => StyleSheet.create({
    artistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    artistImageContainer: {
      marginRight: theme.spacing.md,
    },
    artistImage: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.background.primary,
    },
    placeholderImage: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    artistInfo: {
      flex: 1,
    },
    artistName: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    artistDetails: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.secondary,
    },
  }), [theme]);

  return (
    <TouchableOpacity style={styles.artistItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.artistImageContainer}>
        {coverArtUrl ? (
          <Image source={{ uri: coverArtUrl }} style={styles.artistImage} />
        ) : (
          <View style={[styles.artistImage, styles.placeholderImage]}>
            <User size={24} color={theme.colors.text.tertiary} />
          </View>
        )}
      </View>
      <View style={styles.artistInfo}>
        <Text style={styles.artistName} numberOfLines={1}>
          {artist.name}
        </Text>
        {artist.albumCount !== undefined && (
          <Text style={styles.artistDetails}>
            {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
          </Text>
        )}
      </View>
      <ChevronRight size={20} color={theme.colors.text.tertiary} />
    </TouchableOpacity>
  );
};

export const ArtistSelectionModal: React.FC<ArtistSelectionModalProps> = ({
  visible,
  onClose,
  artists,
  onSelectArtist,
}) => {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: theme.colors.background.card,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      maxHeight: '60%',
      paddingBottom: theme.spacing.xl,
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
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text.primary,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    list: {
      maxHeight: 400,
    },
  }), [theme]);

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

  const handleBackdropPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleArtistSelect = (artistId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectArtist(artistId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={handleBackdropPress}>
        <Animated.View
          style={[styles.modal, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.swipeIndicator}>
            <View style={styles.swipeHandle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Select Artist</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={artists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <ArtistItem
                  artist={item}
                  onPress={() => handleArtistSelect(item.id)}
                  theme={theme}
                />
              )}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        </Pressable>
      </Modal>
    );
  };
