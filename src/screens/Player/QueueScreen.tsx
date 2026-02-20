/**
 * Dino Music App - Queue Screen
 * Optimized with FlashList, memoization, and drag-to-reorder
 */

import React, { useRef, useState, useCallback, memo, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { X, GripVertical, Eraser, ListPlus, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQueueStore, usePlayerStore } from '../../stores';
import { useCoverArt } from '../../hooks/api/useAlbums';

import { TrackMenu } from '../../components/Player/TrackMenu';
import { SongInfoModal } from '../../components/Modals/SongInfoModal';
import { AddToPlaylistModal } from '../../components/Modals/AddToPlaylistModal';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { useTrackMenuState } from '../../hooks/useTrackMenuState';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { useTheme, useBackgroundStyle } from '../../hooks/useTheme';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { Track } from '../../api/opensubsonic/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface QueueScreenProps {
  onClose: () => void;
}

export const QueueScreen: React.FC<QueueScreenProps> = ({ onClose }) => {
  const theme = useTheme();
  const backgroundStyle = useBackgroundStyle();
  const { queue, currentIndex, removeFromQueue, reorderQueue, clearQueue } = useQueueStore();
  const { currentTrack } = usePlayerStore();
  const { data: coverArtUrl } = useCoverArt(currentTrack?.coverArt, 500);
  const albumColors = useAlbumColors(coverArtUrl || undefined);
  const trackMenuState = useTrackMenuState();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSaveToPlaylist, setShowSaveToPlaylist] = useState(false);
  const flatListRef = useRef<any>(null);
  const scrollOffsetRef = useRef(0);
  const hasScrolledToCurrentRef = useRef(false);

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
      paddingTop: theme.spacing.xl,
    },
    swipeIndicator: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingTop: theme.spacing.md,
    },
    swipeHandle: {
      width: 48,
      height: 5,
      borderRadius: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    headerContainer: {
      paddingBottom: theme.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    headerTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text.primary,
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
    placeholder: {
      width: 40,
    },
    queueInfo: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    queueInfoText: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.secondary,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.background.card,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.accent + '40',
    },
    saveButtonText: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.accent,
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xxl,
    },
    queueItem: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 72,
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
      overflow: 'hidden',
    },
    queueItemActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.background.elevated,
    },
    queueItemDragging: {
      backgroundColor: theme.colors.background.elevated,
      borderColor: theme.colors.accent,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    itemContentTouchable: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingRight: theme.spacing.md,
    },
    dragHandle: {
      width: 32,
      height: 72,
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: theme.spacing.sm,
      opacity: 0.7,
    },
    thumbnail: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.sm,
      marginRight: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    placeholderThumbnail: {
      backgroundColor: theme.colors.background.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.muted,
    },
    trackInfo: {
      flex: 1,
      justifyContent: 'center',
      gap: 2,
    },
    trackTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text.primary,
    },
    trackTitleActive: {
      color: theme.colors.accent,
      fontFamily: theme.typography.fontFamily.semibold,
    },
    trackArtist: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.secondary,
    },
    artistsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    artistSeparator: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.secondary,
    },
    duration: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text.tertiary,
      marginLeft: theme.spacing.sm,
      minWidth: 40,
      textAlign: 'right',
    },
    deleteIconButton: {
      width: 40,
      height: 72,
      justifyContent: 'center',
      alignItems: 'center',
      paddingRight: theme.spacing.sm,
    },
  }), [theme]);

  console.log('[QueueScreen] Current index:', currentIndex, 'Queue length:', queue.length);

  useEffect(() => {
    if (!hasScrolledToCurrentRef.current && currentIndex >= 0 && queue.length > 0 && flatListRef.current) {
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex?.({
            index: currentIndex,
            animated: true,
            viewPosition: 0.3,
          });
          hasScrolledToCurrentRef.current = true;
        } catch (error) {
          console.log('[QueueScreen] Could not scroll to current track:', error);
        }
      }, 400);
    }
  }, []);

  const handleRemove = useCallback((index: number) => {
    removeFromQueue(index);
  }, [removeFromQueue]);

  const handleLongPress = useCallback((track: Track) => {
    trackMenuState.openTrackMenu(track);
  }, [trackMenuState]);

  const handlePress = useCallback(async (index: number) => {
    await trackPlayerService.playTrack(index);
  }, []);

  const handleDragEnd = useCallback(({ data, from, to }: { data: Track[]; from: number; to: number }) => {
    if (from !== to) {
      reorderQueue(from, to);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [reorderQueue]);

  const ITEM_HEIGHT = 72 + 8;
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const translateY = useRef(new Animated.Value(1000)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, []);

  const handleClose = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 1000,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(1000);
      onClose();
    });
  }, [translateY, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(1000);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 30,
          }).start();
        }
      },
    })
  ).current;

  interface QueueItemProps {
    track: Track;
    index: number;
    isPlaying: boolean;
    onRemove: (index: number) => void;
    onLongPress: (track: Track) => void;
    onPress: (index: number) => void;
    drag: () => void;
    isActive: boolean;
  }

  const QueueItemComponent = memo<QueueItemProps>(({ track, index, isPlaying, onRemove, onLongPress, onPress, drag, isActive }) => {
    const { data: coverArtUrl } = useCoverArt(track.coverArt, 200);

    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const hasMultipleArtists = track.artists && track.artists.length > 1;
    const displayArtist = track.displayArtist || track.artist || 'Unknown Artist';

    const handleDrag = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      drag();
    };

    const handleRemove = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRemove(index);
    };

    const handlePress = () => {
      onPress(index);
    };

    const handleLongPress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress(track);
    };

    return (
      <View style={[styles.queueItem, isPlaying && styles.queueItemActive, isActive && styles.queueItemDragging]}>
        <TouchableOpacity 
          style={styles.dragHandle}
          onLongPress={handleDrag}
          delayLongPress={150}
          activeOpacity={0.7}
        >
          <GripVertical size={16} color={theme.colors.text.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.itemContentTouchable}
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={400}
          activeOpacity={0.7}
        >
          {coverArtUrl ? (
            <Image source={{ uri: coverArtUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
              <Text style={styles.placeholderText}>♪</Text>
            </View>
          )}

          <View style={styles.trackInfo}>
            <Text
              style={[styles.trackTitle, isPlaying && styles.trackTitleActive]}
              numberOfLines={1}
            >
              {track.title}
            </Text>
            {hasMultipleArtists && track.artists ? (
              <View style={styles.artistsContainer}>
                {track.artists.map((artist, artistIndex) => {
                  const isLast = artistIndex === track.artists!.length - 1;
                  const isSecondToLast = artistIndex === track.artists!.length - 2;
                  return (
                    <React.Fragment key={artist.id}>
                      <Text style={styles.trackArtist} numberOfLines={1}>
                        {artist.name}
                      </Text>
                      {!isLast && (
                        <Text style={styles.artistSeparator}>
                          {isSecondToLast ? ' & ' : ', '}
                        </Text>
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.trackArtist} numberOfLines={1}>
                {displayArtist}
              </Text>
            )}
          </View>

          <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteIconButton}
          onPress={handleRemove}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color={theme.colors.text.muted} />
        </TouchableOpacity>
      </View>
    );
  }, (prevProps, nextProps) => {
    return (
      prevProps.track.id === nextProps.track.id &&
      prevProps.isPlaying === nextProps.isPlaying &&
      prevProps.index === nextProps.index &&
      prevProps.isActive === nextProps.isActive
    );
  });

  QueueItemComponent.displayName = 'QueueItem';

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<Track>) => {
    const index = getIndex();
    const isPlaying = index === currentIndex;
    return (
      <QueueItemComponent
        track={item}
        index={index ?? 0}
        isPlaying={isPlaying}
        onRemove={handleRemove}
        onLongPress={handleLongPress}
        onPress={handlePress}
        drag={drag}
        isActive={isActive}
      />
    );
  }, [handleRemove, handleLongPress, handlePress, currentIndex, theme]);

  const keyExtractor = useCallback((item: Track, index: number) => `${item.id}-${index}`, []);

  const renderBackground = () => {
    if (backgroundStyle === 'solid') {
      return <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background.primary }]} />;
    }

    if (backgroundStyle === 'gradient') {
      return <View style={[StyleSheet.absoluteFill, { backgroundColor: albumColors.background }]} />;
    }

    if (backgroundStyle === 'blur' && coverArtUrl) {
      const isDark = theme.mode !== 'light';
      return (
        <>
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

    return <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background.primary }]} />;
  };

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY }] }]}>
      <View style={styles.container}>
        {renderBackground()}
        <View style={styles.swipeIndicator} {...panResponder.panHandlers}>
          <View style={styles.swipeHandle} />
        </View>

        <View style={styles.headerContainer} {...panResponder.panHandlers}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.7}>
              <X size={20} color={theme.colors.text.primary} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Queue</Text>
            <TouchableOpacity 
              onPress={() => setShowClearConfirm(true)} 
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Eraser size={20} color={theme.colors.text.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.queueInfo}>
            <Text style={styles.queueInfoText}>
              {queue.length} {queue.length === 1 ? 'song' : 'songs'}
            </Text>
            {queue.length > 0 && (
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSaveToPlaylist(true);
                }}
                activeOpacity={0.7}
              >
                <ListPlus size={18} color={theme.colors.accent} strokeWidth={2} />
                <Text style={styles.saveButtonText}>Save as Playlist</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <GestureHandlerRootView style={{ flex: 1 }}>
          <DraggableFlatList
            ref={flatListRef}
            data={queue}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            onDragEnd={handleDragEnd}
            extraData={currentIndex}
            getItemLayout={getItemLayout}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            activationDistance={10}
            autoscrollThreshold={50}
            autoscrollSpeed={100}
            removeClippedSubviews={false}
            maxToRenderPerBatch={15}
            updateCellsBatchingPeriod={100}
            initialNumToRender={25}
            windowSize={21}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex?.({
                  index: info.index,
                  animated: false,
                  viewPosition: 0.3,
                });
              }, 100);
            }}
          />
        </GestureHandlerRootView>

        <TrackMenu
          visible={trackMenuState.showTrackMenu}
          onClose={trackMenuState.closeTrackMenu}
          track={trackMenuState.selectedTrack}
          onShowInfo={trackMenuState.handleShowInfo}
          onShowAddToPlaylist={trackMenuState.handleShowAddToPlaylist}
          onShowConfirm={trackMenuState.handleShowConfirm}
        />

        <SongInfoModal
          visible={trackMenuState.showSongInfo}
          onClose={() => trackMenuState.setShowSongInfo(false)}
          track={trackMenuState.selectedTrack}
        />
        
        <AddToPlaylistModal
          visible={trackMenuState.showAddToPlaylist}
          onClose={() => trackMenuState.setShowAddToPlaylist(false)}
          songIds={trackMenuState.selectedTrack ? [trackMenuState.selectedTrack.id] : []}
          songTitle={trackMenuState.selectedTrack?.title}
        />
        
        <ConfirmModal
          visible={trackMenuState.showConfirm}
          title={trackMenuState.confirmMessage.title}
          message={trackMenuState.confirmMessage.message}
          onClose={() => trackMenuState.setShowConfirm(false)}
        />
        
        <ConfirmModal
          visible={showClearConfirm}
          title="Clear Queue"
          message="Are you sure you want to clear the entire queue? This cannot be undone."
          confirmText="Clear"
          cancelText="Cancel"
          onConfirm={() => {
            clearQueue();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowClearConfirm(false);
            onClose();
          }}
          onClose={() => setShowClearConfirm(false)}
          destructive={true}
        />
        
        <AddToPlaylistModal
          visible={showSaveToPlaylist}
          onClose={() => setShowSaveToPlaylist(false)}
          songIds={queue.map(track => track.id)}
          songTitle="Queue"
        />
      </View>
    </Animated.View>
  );
};
