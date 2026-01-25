/**
 * Dino Music App - Progress Bar
 * Seek bar with time indicators and buffer display
 * HEAVILY OPTIMIZED - Re-renders only when needed
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { theme } from '../../config';

interface ProgressBarProps {
  position: number; // in seconds
  duration: number; // in seconds
  buffered: number; // in seconds
  onSeek: (position: number) => void;
  color?: string; // Optional color override
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ProgressBar = memo<ProgressBarProps>(({
  position,
  duration,
  buffered,
  onSeek,
  color,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

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
        <Text style={styles.timeText}>{currentTimeText}</Text>
        <Text style={styles.timeText}>{durationText}</Text>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if values changed significantly (reduce re-renders)
  const positionChanged = Math.abs(prevProps.position - nextProps.position) > 0.5;
  const durationChanged = prevProps.duration !== nextProps.duration;
  const bufferedChanged = Math.abs(prevProps.buffered - nextProps.buffered) > 1;
  
  return !positionChanged && !durationChanged && !bufferedChanged;
});

const styles = StyleSheet.create({
  container: {
    marginTop: 4, // Reduced from 12 to push progress bar up closer to track info
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8, // Negative margin to bring time very close to progress bar
    paddingHorizontal: 16, // Match slider padding
  },
  timeText: {
    fontSize: theme.typography.fontSize.sm, // Bigger text
    color: theme.colors.text.secondary, // More visible
    fontFamily: theme.typography.fontFamily.medium,
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
