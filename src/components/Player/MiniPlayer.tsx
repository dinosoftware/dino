import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Play, Pause, SkipForward, Cast } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePlayer } from '../../hooks/usePlayer';
import { useProgress } from '../../hooks/useProgress';
import { useCoverArt } from '../../hooks/api';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { useTheme } from '../../hooks/useTheme';
import { useRemotePlaybackStore } from '../../stores/remotePlaybackStore';
import { RemoteDevicesSheet } from '../Modals/RemoteDevicesSheet';
import { FEATURE_FLAGS } from '../../config/constants';
import { MarqueeText } from '../common/MarqueeText';

interface MiniPlayerProps {
  onPress: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const { currentTrack, isPlaying, playbackState, togglePlayPause, skipToNext } = usePlayer();
  const progress = useProgress();
  const { data: coverArtUrl } = useCoverArt(currentTrack?.coverArt, 200);
  const albumColors = useAlbumColors(coverArtUrl || undefined);
  const activePlayerType = useRemotePlaybackStore((state) => state.activePlayerType);
  const [showDevicesSheet, setShowDevicesSheet] = useState(false);

  const isLargeScreen = height > 800;
  const artworkSize = isLargeScreen ? 64 : 56;
  const containerHeight = isLargeScreen ? 80 : 72;
  const containerPadding = isLargeScreen ? 12 : 8;

  const isBuffering = playbackState === 'buffering';
  const progressPercentage = progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;
  const isCasting = activePlayerType !== 'local';

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

  const handleCastPress = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDevicesSheet(true);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background.secondary,
            borderTopColor: theme.colors.border,
            height: containerHeight,
            paddingTop: containerPadding,
            paddingBottom: containerPadding,
          },
        ]}
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
                width: `${Math.min(progressPercentage, 100)}%`,
              },
            ]}
          />
        </View>

        <View style={[styles.artworkContainer, { width: artworkSize, height: artworkSize }]}>
          {coverArtUrl ? (
            <Image
              source={{ uri: coverArtUrl }}
              style={{ width: artworkSize, height: artworkSize, borderRadius: 8 }}
            />
          ) : (
            <View
              style={[
                styles.placeholderArtwork,
                {
                  width: artworkSize,
                  height: artworkSize,
                  backgroundColor: theme.colors.background.muted,
                  borderRadius: 8,
                },
              ]}
            >
              <Text style={[styles.placeholderText, { color: theme.colors.text.muted }]}>♪</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <MarqueeText
            style={{
              fontSize: 14,
              fontFamily: 'Inter_600SemiBold',
              color: theme.colors.text.primary,
            }}
          >
            {currentTrack.title}
          </MarqueeText>
          <MarqueeText
            style={{
              fontSize: 12,
              fontFamily: 'Inter_400Regular',
              color: theme.colors.text.secondary,
            }}
          >
            {currentTrack.displayArtist || currentTrack.artist || 'Unknown Artist'}
          </MarqueeText>
        </View>

        {(FEATURE_FLAGS.ENABLE_CHROMECAST || FEATURE_FLAGS.ENABLE_UPNP) && (
          <TouchableOpacity style={styles.castButton} onPress={handleCastPress}>
            <Cast
              size={20}
              color={isCasting ? albumColors.primary : theme.colors.text.secondary}
              fill={isCasting ? albumColors.primary : 'transparent'}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlButton, styles.playButton, { backgroundColor: albumColors.primary }]}
          onPress={handlePlayPause}
        >
          {isBuffering ? (
            <ActivityIndicator size="small" color={albumColors.textColor} />
          ) : isPlaying ? (
            <Pause size={18} color={albumColors.textColor} fill={albumColors.textColor} />
          ) : (
            <Play size={18} color={albumColors.textColor} fill={albumColors.textColor} strokeWidth={2} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={handleSkip}>
          <SkipForward size={20} color={theme.colors.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
      </TouchableOpacity>

      <RemoteDevicesSheet
        visible={showDevicesSheet}
        onClose={() => setShowDevicesSheet(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    borderColor: 'rgba(255,255,255,0.1)',
  },
  placeholderArtwork: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 20,
    fontFamily: 'Inter_500Medium',
  },
  info: {
    flex: 1,
    marginRight: 16,
    justifyContent: 'center',
  },
  castButton: {
    padding: 8,
    marginRight: 4,
    alignSelf: 'center',
  },
  controlButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    alignSelf: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
