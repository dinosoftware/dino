/**
 * Dino Music App - Lyrics Screen
 * Full screen synchronized lyrics display with dynamic backgrounds
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { Lock, Unlock } from 'lucide-react-native';
import { useLyrics } from '../../hooks/useLyrics';
import { usePlayer } from '../../hooks/usePlayer';
import { EmptyState } from '../../components/common';
import { LYRICS_FONT_SIZES } from '../../config';
import { useTheme, useBackgroundStyle } from '../../hooks/useTheme';
import { useSettingsStore, usePlayerStore } from '../../stores';
import { useCoverArt } from '../../hooks/api';
import { useAlbumColors } from '../../hooks/useAlbumColors';

interface LyricsScreenProps {
  onClose: () => void;
}

export const LyricsScreen: React.FC<LyricsScreenProps> = ({ onClose }) => {
  const theme = useTheme();
  const backgroundStyle = useBackgroundStyle();
  const { height: screenHeight } = useWindowDimensions();
  
  const { lyrics, seekToLine, toggleScrollLock } = useLyrics();
  const { currentTrack } = usePlayer();
  const { lyricsFontSize, showLyricsTimestamps } = useSettingsStore();
  const { lyricsLoading } = usePlayerStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const lineHeightsRef = useRef<Map<number, number>>(new Map());
  const { data: coverArtUrl } = useCoverArt(currentTrack?.coverArt, 500);
  const albumColors = useAlbumColors(coverArtUrl || undefined);
  const translateY = useRef(new Animated.Value(screenHeight)).current;

  const fontSizes = LYRICS_FONT_SIZES[lyricsFontSize];

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    },
    container: {
      flex: 1,
    },
    swipeIndicator: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingTop: theme.spacing.xxl,
    },
    swipeHandle: {
      width: 48,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.text.tertiary,
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
      marginTop: -2,
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
    placeholder: {
      width: 40,
    },
    scrollView: {
      flex: 1,
    },
    lyricsContainer: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: 80,
      paddingBottom: screenHeight,
    },
    lineContainer: {
      minHeight: 60,
      justifyContent: 'center',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.xs,
    },
    lyricLine: {
      textAlign: 'left',
      lineHeight: undefined,
      color: theme.colors.text.secondary,
      flexWrap: 'wrap',
      width: '100%',
    },
    activeLine: {
      color: theme.colors.text.primary,
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
  }), [theme, screenHeight]);

  const renderBackground = () => {
    const baseBackgroundColor = theme.colors.background.primary;

    if (backgroundStyle === 'solid') {
      return <View style={[StyleSheet.absoluteFill, { backgroundColor: baseBackgroundColor }]} />;
    }

    if (backgroundStyle === 'gradient') {
      const bgColor = albumColors.background || baseBackgroundColor;
      return (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: baseBackgroundColor }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />
        </>
      );
    }

    if (backgroundStyle === 'blur' && coverArtUrl) {
      const isDark = theme.mode !== 'light';
      return (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: baseBackgroundColor }]} />
          <Image
            source={{ uri: coverArtUrl }}
            style={StyleSheet.absoluteFill}
            blurRadius={80}
            resizeMode="cover"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)' }]} />
        </>
      );
    }

    return <View style={[StyleSheet.absoluteFill, { backgroundColor: baseBackgroundColor }]} />;
  };

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, [translateY]);

  const handleClose = useCallback(() => {
    Animated.timing(translateY, {
      toValue: screenHeight,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(screenHeight);
      onClose();
    });
  }, [translateY, onClose, screenHeight]);

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
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(screenHeight);
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

  useEffect(() => {
    if (lyrics?.isScrollLocked && lyrics.type === 'synced' && scrollViewRef.current && lyrics.lines && lyrics.currentLineIndex >= 0) {
      const paddingTop = 80;
      const lineSpacing = theme.spacing.xs;
      const targetOffset = 150;

      let currentLineY = paddingTop;
      for (let i = 0; i < lyrics.currentLineIndex; i++) {
        currentLineY += (lineHeightsRef.current.get(i) || 70) + lineSpacing;
      }

      const scrollY = currentLineY - targetOffset;

      scrollViewRef.current.scrollTo({
        y: Math.max(0, scrollY),
        animated: true,
      });
    }
  }, [lyrics?.currentLineIndex, lyrics?.isScrollLocked, lyrics?.lines, lyrics?.type, screenHeight, theme.spacing.xs]);

  interface LyricLineProps {
    line: { value: string; start: number };
    index: number;
    isActive: boolean;
    fontSizes: { current: number; inactive: number };
    onPress: () => void;
    showTimestamp: boolean;
    onLayout: (index: number, height: number) => void;
  }

  const LyricLineComponent: React.FC<LyricLineProps> = ({ line, index, isActive, fontSizes, onPress, showTimestamp, onLayout }) => {
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

  const renderContent = () => {
    if (lyricsLoading.isLoading) {
      return (
        <>
          <View style={styles.swipeIndicator}>
            <View style={styles.swipeHandle} />
          </View>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Lyrics</Text>
            <View style={styles.placeholder} />
          </View>
          <EmptyState icon="⏳" title="Loading lyrics..." message="Please wait" />
        </>
      );
    }

    if (!lyrics) {
      return (
        <>
          <View style={styles.swipeIndicator}>
            <View style={styles.swipeHandle} />
          </View>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Lyrics</Text>
            <View style={styles.placeholder} />
          </View>
          <EmptyState icon="🎵" title="No lyrics found" message="Lyrics are not available for this song" />
        </>
      );
    }

    if (lyrics.type === 'unsynced' && lyrics.plainText) {
      return (
        <>
          <View style={styles.swipeIndicator}>
            <View style={styles.swipeHandle} />
          </View>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
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
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.plainTextContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.plainText}>{lyrics.plainText}</Text>
            <View style={styles.syncInfo}>
              <Text style={styles.syncInfoText}>Synchronized lyrics not available</Text>
            </View>
          </ScrollView>
        </>
      );
    }

    if (lyrics.type === 'synced' && lyrics.lines) {
      return (
        <>
          <View style={styles.swipeIndicator}>
            <View style={styles.swipeHandle} />
          </View>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
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
            <TouchableOpacity onPress={toggleScrollLock} style={styles.lockButton}>
              {lyrics.isScrollLocked ? (
                <Lock size={20} color={theme.colors.text.primary} strokeWidth={2} />
              ) : (
                <Unlock size={20} color={theme.colors.text.secondary} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.lyricsContainer}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => {
              if (lyrics.isScrollLocked) {
                toggleScrollLock();
              }
            }}
          >
            {lyrics.lines.map((line, index) => (
              <LyricLineComponent
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
        </>
      );
    }

    return null;
  };

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY }] }]}>
      <View style={styles.container} {...panResponder.panHandlers}>
        {renderBackground()}
        {renderContent()}
      </View>
    </Animated.View>
  );
};
