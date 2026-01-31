/**
 * Dino Music App - Lyrics Screen
 * Full screen synchronized lyrics display (MVP FEATURE)
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Animated,
  Image,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Lock, Unlock } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { useLyrics } from '../../hooks/useLyrics';
import { usePlayer } from '../../hooks/usePlayer';
import { BlurredBackground, EmptyState } from '../../components/common';
import { theme, LYRICS_FONT_SIZES } from '../../config';
import { useSettingsStore, usePlayerStore } from '../../stores';
import { useCoverArt } from '../../hooks/api';

interface LyricsScreenProps {
  onClose: () => void;
}

interface LyricLineProps {
  line: any;
  index: number;
  isActive: boolean;
  fontSizes: { current: number; inactive: number };
  onPress: () => void;
  showTimestamp: boolean;
  onLayout: (index: number, height: number) => void;
}

const LyricLine: React.FC<LyricLineProps> = ({ line, index, isActive, fontSizes, onPress, showTimestamp, onLayout }) => {
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Pressable 
      onPress={onPress} 
      style={styles.lineContainer}
      onLayout={(e) => onLayout(index, e.nativeEvent.layout.height)}
    >
      <Text
        style={[
          styles.lyricLine,
          isActive && styles.activeLine,
          {
            fontSize: fontSizes.current,
            fontFamily: theme.typography.fontFamily.bold,
          },
        ]}
      >
        {line.value}
      </Text>
      {showTimestamp && (
        <Text style={styles.timestamp}>
          {formatTime(line.start)}
        </Text>
      )}
    </Pressable>
  );
};

export const LyricsScreen: React.FC<LyricsScreenProps> = ({ onClose }) => {
  const { lyrics, isSynced, seekToLine, toggleScrollLock } = useLyrics();
  const { currentTrack } = usePlayer();
  const { lyricsFontSize, showLyricsTimestamps } = useSettingsStore();
  const { lyricsLoading } = usePlayerStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const { data: coverArtUrl } = useCoverArt(currentTrack?.coverArt, 500);
  const translateY = useRef(new Animated.Value(0)).current;
  const lineHeightsRef = useRef<Map<number, number>>(new Map());

  const fontSizes = LYRICS_FONT_SIZES[lyricsFontSize];

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
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

  // SCROLL TO TOP - Keep active line at top of screen
  useEffect(() => {
    if (lyrics?.isScrollLocked && lyrics.type === 'synced' && scrollViewRef.current && lyrics.lines) {
      // Calculate actual scroll position from measured heights
      let scrollY = 0;
      for (let i = 0; i < lyrics.currentLineIndex; i++) {
        const measuredHeight = lineHeightsRef.current.get(i);
        scrollY += measuredHeight || 90; // Use measured height or fallback to 90
      }
      
      scrollViewRef.current.scrollTo({
        y: scrollY,
        animated: true,
      });
    }
  }, [lyrics?.currentLineIndex, lyrics?.isScrollLocked]);

  // Show loading state
  if (lyricsLoading.isLoading) {
    return (
      <BlurredBackground imageUri={coverArtUrl || undefined}>
        <Animated.View 
          style={[styles.container, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {/* Swipe Indicator */}
          <View style={styles.swipeIndicator}>
            <View style={styles.swipeHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Lyrics</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Loading State */}
          <EmptyState
            icon="⏳"
            title="Loading lyrics..."
            message="Please wait"
          />
        </Animated.View>
      </BlurredBackground>
    );
  }

  // Show empty state
  if (!lyrics) {
    return (
      <BlurredBackground imageUri={coverArtUrl || undefined}>
        <Animated.View 
          style={[styles.container, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {/* Swipe Indicator */}
          <View style={styles.swipeIndicator}>
            <View style={styles.swipeHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Lyrics</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Empty State */}
          <EmptyState
            icon="🎵"
            title="No lyrics found"
            message="Lyrics are not available for this song"
          />
        </Animated.View>
      </BlurredBackground>
    );
  }

  // Render unsynchronized lyrics
  if (lyrics.type === 'unsynced' && lyrics.plainText) {
    return (
      <BlurredBackground imageUri={coverArtUrl || undefined}>
        <Animated.View 
          style={[styles.container, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {/* Swipe Indicator */}
          <View style={styles.swipeIndicator}>
            <View style={styles.swipeHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              {coverArtUrl && (
                <Image source={{ uri: coverArtUrl }} style={styles.headerArtwork} />
              )}
              <View style={styles.headerText}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {currentTrack?.title}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {currentTrack?.artist}
                </Text>
              </View>
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Plain Text Lyrics */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.plainTextContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.plainText}>{lyrics.plainText}</Text>
            <View style={styles.syncInfo}>
              <Text style={styles.syncInfoText}>
                Synchronized lyrics not available
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </BlurredBackground>
    );
  }

  // Render synchronized lyrics
  if (lyrics.type === 'synced' && lyrics.lines) {
    return (
      <BlurredBackground imageUri={coverArtUrl || undefined}>
        <Animated.View 
          style={[styles.container, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          {/* Swipe Indicator */}
          <View style={styles.swipeIndicator}>
            <View style={styles.swipeHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              {coverArtUrl && (
                <Image source={{ uri: coverArtUrl }} style={styles.headerArtwork} />
              )}
              <View style={styles.headerText}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {currentTrack?.title}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {currentTrack?.artist}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={toggleScrollLock}
              style={styles.lockButton}
            >
              {lyrics.isScrollLocked ? (
                <Lock size={20} color={theme.colors.text.primary} strokeWidth={2} />
              ) : (
                <Unlock size={20} color={theme.colors.text.secondary} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          {/* Synchronized Lyrics */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.lyricsContainer}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => {
              // Unlock scroll when user manually scrolls
              if (lyrics.isScrollLocked) {
                toggleScrollLock();
              }
            }}
          >
            {lyrics.lines.map((line, index) => (
              <LyricLine
                key={index}
                line={line}
                index={index}
                isActive={index === lyrics.currentLineIndex}
                fontSizes={fontSizes}
                onPress={() => seekToLine(line)}
                showTimestamp={showLyricsTimestamps}
                onLayout={(idx, height) => lineHeightsRef.current.set(idx, height)}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </BlurredBackground>
    );
  }

  return null;
};

// Helper to format timestamp
const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  swipeIndicator: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
  },
  swipeHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.text.tertiary,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  headerArtwork: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    textAlign: 'left',
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'left',
    marginTop: theme.spacing.xs,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeButtonText: {
    fontSize: 18,
    color: theme.colors.text.primary,
    lineHeight: 18,
    marginTop: -2, // Fine-tune vertical centering
  },
  lockButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lockButtonText: {
    fontSize: 18,
    lineHeight: 18,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  lyricsContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 50, // Start near top
    paddingBottom: SCREEN_HEIGHT, // Large bottom for last lines
  },
  lineContainer: {
    minHeight: 90, // MIN HEIGHT - allows wrapping for long text
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.sm,
  },
  lyricLine: {
    textAlign: 'left',
    lineHeight: 38,
    color: 'rgba(255, 255, 255, 0.4)',
    flexWrap: 'wrap',
    width: '100%',
  },
  activeLine: {
    color: '#FFFFFF', // Active lyric - bright white
  },
  timestamp: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  plainTextContainer: {
    padding: theme.spacing.lg,
  },
  plainText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.relaxed,
  },
  syncInfo: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.overlay,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  syncInfoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
});
