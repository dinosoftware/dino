/**
 * Dino Music App - Mini Player
 * shadcn/ui-inspired mini player with clean, modern design
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePlayer } from '../../hooks/usePlayer';
import { useCoverArt } from '../../hooks/api';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { theme } from '../../config';

interface MiniPlayerProps {
  onPress: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
  const { currentTrack, isPlaying, togglePlayPause, skipToNext, progress } = usePlayer();
  const { data: coverArtUrl } = useCoverArt(currentTrack?.coverArt, 200);
  const albumColors = useAlbumColors(coverArtUrl || undefined);
  
  const progressPercentage = progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;

  if (!currentTrack) {
    return null;
  }

  const handlePlayPause = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePlayPause();
  };

  const handleSkip = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    skipToNext();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.95}
    >
      {/* Progress indicator bar at top */}
      <View style={styles.progressIndicator}>
        <View 
          style={[
            styles.progressFill, 
            { 
              backgroundColor: albumColors.primary,
              width: `${Math.min(progressPercentage, 100)}%`
            }
          ]} 
        />
      </View>

      {/* Album Art */}
      <View style={styles.artworkContainer}>
        {coverArtUrl ? (
          <Image source={{ uri: coverArtUrl }} style={styles.artwork} />
        ) : (
          <View style={[styles.artwork, styles.placeholderArtwork]}>
            <Text style={styles.placeholderText}>♪</Text>
          </View>
        )}
      </View>

      {/* Track Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentTrack.displayArtist || currentTrack.artist || 'Unknown Artist'}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handlePlayPause}
          style={[styles.controlButton, styles.playButton, { backgroundColor: albumColors.primary }]}
        >
          {isPlaying ? (
            <Pause size={18} color={albumColors.textColor} fill={albumColors.textColor} />
          ) : (
            <Play size={18} color={albumColors.textColor} fill={albumColors.textColor} strokeWidth={2} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          style={styles.controlButton}
        >
          <SkipForward size={20} color={theme.colors.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: theme.dimensions.miniPlayer.height,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  progressIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: theme.colors.background.muted,
  },
  progressFill: {
    height: '100%',
  },
  artworkContainer: {
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'center',
  },
  artwork: {
    width: theme.dimensions.miniPlayer.thumbnailSize,
    height: theme.dimensions.miniPlayer.thumbnailSize,
  },
  placeholderArtwork: {
    backgroundColor: theme.colors.background.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.muted,
  },
  info: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  artist: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  controlButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.round,
  },
  playButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
