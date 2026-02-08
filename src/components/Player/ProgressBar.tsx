/**
 * Dino Music App - Progress Bar
 * Seek bar with time indicators and buffer display
 * HEAVILY OPTIMIZED - Re-renders only when needed
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { theme } from '../../config';
import { useSettingsStore } from '../../stores/settingsStore';

interface ProgressBarProps {
  position: number; // in seconds
  duration: number; // in seconds
  buffered: number; // in seconds
  onSeek: (position: number) => void;
  color?: string; // Optional color override
  qualityText?: string; // Detailed quality text (e.g., "320 kbps MP3")
  qualityTextSimple?: string; // Simple quality text (e.g., "HIGH")
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  position,
  duration,
  buffered,
  onSeek,
  color,
  qualityText,
  qualityTextSimple,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  
  const qualityBadgeDetailed = useSettingsStore((state) => state.qualityBadgeDetailed);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  
  const toggleQualityMode = useCallback(() => {
    updateSettings({ qualityBadgeDetailed: !qualityBadgeDetailed });
  }, [qualityBadgeDetailed, updateSettings]);
  
  // Show detailed or simple based on setting
  const displayText = qualityBadgeDetailed ? qualityText : (qualityTextSimple || qualityText);

  const currentPosition = isSeeking ? seekPosition : position;
  const bufferedProgress = useMemo(() => 
    duration > 0 ? Math.min(buffered / duration, 1) : 0,
    [buffered, duration]
  );

  const handleValueChange = useCallback((value: number) => {
    setIsSeeking(true);
    setSeekPosition(value);
  }, []);

  const handleSlidingComplete = useCallback((value: number) => {
    setIsSeeking(false);
    onSeek(value);
  }, [onSeek]);

  const currentTimeText = useMemo(() => formatTime(currentPosition), [currentPosition]);
  const durationText = useMemo(() => formatTime(duration), [duration]);

  return (
    <View style={styles.container}>
      {/* Progress Track with Buffer Indicator */}
      <View style={styles.trackContainer}>
        {/* Background and buffered track */}
        <View style={[
          styles.bufferedTrackContainer,
          { backgroundColor: color ? `${color}40` : theme.colors.player.progressBackground }
        ]}>
          {/* Buffered portion */}
          <View 
            style={[
              styles.bufferedTrack,
              { 
                width: `${Math.min(bufferedProgress * 100, 100)}%`,
                backgroundColor: color ? `${color}60` : theme.colors.player.progressBuffered
              }
            ]} 
          />
          {/* Current progress overlay */}
          <View 
            style={[
              styles.progressTrack,
              { 
                width: `${duration > 0 ? Math.min((currentPosition / duration) * 100, 100) : 0}%`,
                backgroundColor: color || theme.colors.player.progressFilled
              }
            ]} 
          />
        </View>

        {/* Slider - the actual interactive element (invisible track, just for thumb) */}
        <Slider
          style={styles.slider}
          value={currentPosition}
          minimumValue={0}
          maximumValue={duration || 1}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor={color || "#FFFFFF"}
          tapToSeek={true}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
        />
      </View>

      {/* Time Labels - BELOW the progress bar, inline */}
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, styles.timeTextLeft]}>{currentTimeText}</Text>
        <View style={styles.centerBadgeContainer}>
          {displayText && (
            <TouchableOpacity onPress={toggleQualityMode} activeOpacity={0.7}>
              <View style={[styles.qualityBadge, { borderColor: color || theme.colors.accent }]}>
                <Text style={[styles.qualityText, { color: color || theme.colors.accent }]}>
                  {displayText}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.timeText, styles.timeTextRight]}>{durationText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4, // Reduced from 12 to push progress bar up closer to track info
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8, // Negative margin to bring time very close to progress bar
    paddingHorizontal: 16, // Match slider padding
  },
  timeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.medium,
    minWidth: 40, // Fixed width to prevent shifting
  },
  timeTextLeft: {
    textAlign: 'left',
  },
  timeTextRight: {
    textAlign: 'right',
  },
  centerBadgeContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none', // Allow touches on children but not on container itself
  },
  qualityBadge: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },
  qualityText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.semibold,
    letterSpacing: 0.5,
  },
  trackContainer: {
    position: 'relative',
    height: 48, // Bigger overall height
    justifyContent: 'center',
  },
  bufferedTrackContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 6, // Thicker track
    top: '50%',
    marginTop: -3,
    zIndex: 0,
    overflow: 'hidden',
    borderRadius: 3,
    // backgroundColor is now dynamic (passed inline with opacity)
  },
  bufferedTrack: {
    position: 'absolute',
    height: '100%',
    // backgroundColor is now dynamic (passed inline with opacity)
    borderRadius: 3,
    zIndex: 1,
  },
  progressTrack: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
    zIndex: 2, // Above buffered track
  },
  slider: {
    width: '100%',
    height: 48, // Match container height
    zIndex: 3, // Above all tracks
  },
});
