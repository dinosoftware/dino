/**
 * Dino Music App - Mini Player
 * TIDAL and shadcn/ui-inspired mini player with dynamic theming
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePlayer } from '../../hooks/usePlayer';
import { useCoverArt } from '../../hooks/api';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { useTheme } from '../../hooks/useTheme';

interface MiniPlayerProps {
  onPress: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
  const theme = useTheme();
  const { currentTrack, isPlaying, playbackState, togglePlayPause, skipToNext, progress } = usePlayer();
  const { data: coverArtUrl } = useCoverArt(currentTrack?.coverArt, 200);
  const albumColors = useAlbumColors(coverArtUrl || undefined);
  
  const isBuffering = playbackState === 'buffering';
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
      style={[styles.container, { backgroundColor: theme.colors.background.secondary, borderTopColor: theme.colors.border }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.95}
    >
      <View style={[styles.progressIndicator, { backgroundColor: theme.colors.background.muted }]}>
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

      <View style={styles.artworkContainer}>
        {coverArtUrl ? (
          <Image source={{ uri: coverArtUrl }} style={styles.artwork} />
        ) : (
          <View style={[styles.artwork, styles.placeholderArtwork, { backgroundColor: theme.colors.background.muted }]}>
            <Text style={[styles.placeholderText, { color: theme.colors.text.muted }]}>♪</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={[styles.artist, { color: theme.colors.text.secondary }]} numberOfLines={1}>
          {currentTrack.displayArtist || currentTrack.artist || 'Unknown Artist'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handlePlayPause}
          style={[styles.controlButton, styles.playButton, { backgroundColor: albumColors.primary }]}
        >
          {isBuffering ? (
            <ActivityIndicator size="small" color={albumColors.textColor} />
          ) : isPlaying ? (
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
    height: 72,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  progressIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  progressFill: {
    height: '100%',
  },
  artworkContainer: {
    marginRight: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    alignSelf: 'center',
  },
  artwork: {
    width: 56,
    height: 56,
  },
  placeholderArtwork: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
  },
  info: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  artist: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
  },
  playButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
