/**
 * Dino Music App - Artist Card
 * Compact artist card for horizontal lists (similar artists, etc.)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Artist } from '../../api/opensubsonic/types';
import { theme } from '../../config';
import { useCoverArt } from '../../hooks/api/useAlbums';

interface ArtistCardProps {
  artist: Artist;
  onPress: () => void;
  onLongPress?: () => void;
  width?: number;
}

export const ArtistCard: React.FC<ArtistCardProps> = ({
  artist,
  onPress,
  onLongPress,
  width = 120,
}) => {
  const { data: coverArtUrl } = useCoverArt(artist.coverArt, 200);
  const [scaleAnim] = useState(new Animated.Value(1));

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width }]}
      onPress={onPress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.imageContainer,
          { width, height: width, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {coverArtUrl ? (
          <Image source={{ uri: coverArtUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <User size={40} color={theme.colors.text.tertiary} />
          </View>
        )}
      </Animated.View>
      <Text style={styles.name} numberOfLines={2}>
        {artist.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  imageContainer: {
    borderRadius: 9999, // Fully round for artists
    overflow: 'hidden',
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.muted,
  },
  name: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
});
