/**
 * Dino Music App - Track Row
 * shadcn/ui-inspired track list item with clean design
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MoreVertical } from 'lucide-react-native';
import { Track } from '../../api/opensubsonic/types';
import { theme } from '../../config';
import { useNavigationStore } from '../../stores/navigationStore';

interface TrackRowProps {
  track: Track;
  onPress: () => void;
  onLongPress?: () => void;
  onMenuPress?: () => void;
  coverArtUrl?: string;
  showArtwork?: boolean;
  showMenu?: boolean;
  isPlaying?: boolean;
  enableNavigation?: boolean; // Allow clicking artist/album
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  onPress,
  onLongPress,
  onMenuPress,
  coverArtUrl,
  showArtwork = true,
  showMenu = false,
  isPlaying = false,
  enableNavigation = false,
}) => {
  const { navigate } = useNavigationStore();
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleArtistPress = (e: any) => {
    if (!enableNavigation || !track.artistId) return;
    e.stopPropagation();
    navigate({ name: 'artist-detail', params: { artistId: track.artistId } });
  };

  return (
    <TouchableOpacity
      style={[styles.container, isPlaying && styles.containerActive]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {showArtwork && (
        <View style={styles.artworkContainer}>
          {coverArtUrl ? (
            <Image source={{ uri: coverArtUrl }} style={styles.artwork} />
          ) : (
            <View style={[styles.artwork, styles.placeholderArtwork]}>
              <Text style={styles.placeholderText}>♪</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.info}>
        <Text
          style={[styles.title, isPlaying && styles.titleActive]}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        {enableNavigation && track.artistId ? (
          <TouchableOpacity onPress={handleArtistPress}>
            <Text style={styles.artist} numberOfLines={1}>
              {track.artist || 'Unknown Artist'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist || 'Unknown Artist'}
          </Text>
        )}
      </View>

      <Text style={styles.duration}>{formatDuration(track.duration)}</Text>

      {showMenu && onMenuPress && (
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={(e) => {
            e.stopPropagation();
            onMenuPress();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MoreVertical size={20} color={theme.colors.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.md,
  },
  containerActive: {
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  artworkContainer: {
    marginRight: theme.spacing.md,
  },
  artwork: {
    width: theme.dimensions.thumbnail.small,
    height: theme.dimensions.thumbnail.small,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  placeholderArtwork: {
    backgroundColor: theme.colors.background.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.muted,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  titleActive: {
    color: theme.colors.accent,
    fontFamily: theme.typography.fontFamily.semibold,
  },
  artist: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
  duration: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.muted,
    marginLeft: theme.spacing.md,
    minWidth: 40,
    textAlign: 'right',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
});
