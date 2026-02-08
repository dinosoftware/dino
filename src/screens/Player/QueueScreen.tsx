/**
 * Dino Music App - Queue Screen
 * Optimized with FlashList, memoization, and drag-to-reorder
 */

import React, { useRef, useState, useCallback, memo, useEffect } from 'react';
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
import { X, Trash2, GripVertical, Eraser, ListPlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQueueStore, usePlayerStore } from '../../stores';
import { useCoverArt } from '../../hooks/api/useAlbums';

import { BlurredBackground } from '../../components/common';
import { TrackMenu } from '../../components/Player/TrackMenu';
import { SongInfoModal } from '../../components/Modals/SongInfoModal';
import { AddToPlaylistModal } from '../../components/Modals/AddToPlaylistModal';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { useTrackMenuState } from '../../hooks/useTrackMenuState';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { theme } from '../../config';
import { Track } from '../../api/opensubsonic/types';
import {
  GestureHandlerRootView,
  Swipeable,
} from 'react-native-gesture-handler';

interface QueueScreenProps {
  onClose: () => void;
}

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

// Memoized queue item component
const QueueItem = memo<QueueItemProps>(({ track, index, isPlaying, onRemove, onLongPress, onPress, drag, isActive }) => {
  const { data: coverArtUrl } = useCoverArt(track.coverArt, 200);
  const swipeableRef = useRef<Swipeable>(null);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handlePress = useCallback(() => {
    onPress(index);
  }, [index, onPress]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress(track);
  }, [track, onLongPress]);

  const handleRemove = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemove(index);
  }, [index, onRemove]);

  const handleDragStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    drag();
  }, [drag]);

  const renderRightActions = useCallback(() => (
    <View style={styles.deleteAction}>
      <TouchableOpacity onPress={handleRemove} style={styles.deleteButton}>
        <Trash2 size={20} color="#FFFFFF" />
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  ), [handleRemove]);
  
  const handleSwipeableWillOpen = useCallback(() => {
    // Auto-delete when swipe reaches threshold (>50%)
    handleRemove();
    // Close the swipeable after deletion
    swipeableRef.current?.close();
  }, [handleRemove]);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      onSwipeableWillOpen={handleSwipeableWillOpen}
    >
      <View style={[styles.queueItem, isPlaying && styles.queueItemActive, isActive && styles.queueItemDragging]}>
        {/* Drag Handle - touchable to trigger drag */}
        <TouchableOpacity 
          style={styles.dragHandle}
          onLongPress={handleDragStart}
          delayLongPress={150}
          activeOpacity={0.6}
        >
          <GripVertical size={16} color={theme.colors.text.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.itemContentTouchable}
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
        >
          {/* Thumbnail */}
          {coverArtUrl ? (
            <Image source={{ uri: coverArtUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
              <Text style={styles.placeholderText}>♪</Text>
            </View>
          )}

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text
              style={[styles.trackTitle, isPlaying && styles.trackTitleActive]}
              numberOfLines={1}
            >
              {track.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {track.displayArtist || track.artist || 'Unknown Artist'}
            </Text>
          </View>

          {/* Duration */}
          <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these props change
  // Return true to SKIP re-render, false to RE-RENDER
  const shouldSkip = (
    prevProps.track.id === nextProps.track.id &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.index === nextProps.index &&
    prevProps.isActive === nextProps.isActive
  );
  return shouldSkip;
});

QueueItem.displayName = 'QueueItem';

export const QueueScreen: React.FC<QueueScreenProps> = ({ onClose }) => {
  const { queue, currentIndex, removeFromQueue, reorderQueue, clearQueue } = useQueueStore();
  const { currentTrack } = usePlayerStore();
  const { data: coverArtUrl } = useCoverArt(currentTrack?.coverArt, 500);
  const trackMenuState = useTrackMenuState();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSaveToPlaylist, setShowSaveToPlaylist] = useState(false);
  const flatListRef = useRef<any>(null);
  const scrollOffsetRef = useRef(0);
  const hasScrolledToCurrentRef = useRef(false);

  console.log('[QueueScreen] Current index:', currentIndex, 'Queue length:', queue.length);

  // Auto-scroll to current track when opening queue (only once)
  useEffect(() => {
    // Delay scroll to happen after slide-up animation
    if (!hasScrolledToCurrentRef.current && currentIndex >= 0 && queue.length > 0 && flatListRef.current) {
      // Delay to ensure slide-up animation completes and list is rendered
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex?.({
            index: currentIndex,
            animated: true,
            viewPosition: 0.3, // Show current track near top
          });
          hasScrolledToCurrentRef.current = true;
        } catch (error) {
          console.log('[QueueScreen] Could not scroll to current track:', error);
        }
      }, 400); // Increased from 300ms to let slide-up finish
    }
  }, []); // Only run on mount

  const handleRemove = useCallback((index: number) => {
    removeFromQueue(index);
  }, [removeFromQueue]);

  const handleLongPress = useCallback((track: Track) => {
    trackMenuState.openTrackMenu(track);
  }, [trackMenuState]);

  const handlePress = useCallback(async (index: number) => {
    // Don't scroll when selecting a track - user is already at the right position
    await trackPlayerService.playTrack(index);
  }, []);

  const handleDragEnd = useCallback(({ data, from, to }: { data: Track[]; from: number; to: number }) => {
    if (from !== to) {
      reorderQueue(from, to);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [reorderQueue]);

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<Track>) => {
    const index = getIndex();
    // Don't use currentIndex directly here - causes re-render and scroll reset
    // Instead, QueueItem will get isPlaying from extraData update
    const isPlaying = index === currentIndex;
    return (
      <QueueItem
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
  }, [handleRemove, handleLongPress, handlePress]);

  const keyExtractor = useCallback((item: Track, index: number) => `${item.id}-${index}`, []);

  // Fixed item height for scroll position calculation
  const ITEM_HEIGHT = 72 + 8; // 72px item + 8px margin
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const translateY = useRef(new Animated.Value(1000)).current;

  // Slide up animation on mount
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
            translateY.setValue(1000);
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

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY }] }]}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <BlurredBackground imageUri={coverArtUrl || undefined}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View 
            style={styles.container}
          >
          {/* Swipe Handle - ONLY AREA WITH GESTURE */}
          <View 
            style={styles.swipeIndicator}
            {...panResponder.panHandlers}
          >
            <View style={styles.swipeHandle} />
          </View>

          {/* Header with darker background for readability - ALSO HAS GESTURE */}
          <View 
            style={styles.headerContainer}
            {...panResponder.panHandlers}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={20} color={theme.colors.text.primary} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Queue</Text>
              <TouchableOpacity 
                onPress={() => setShowClearConfirm(true)} 
                style={styles.closeButton}
              >
                <Eraser size={20} color={theme.colors.text.primary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Queue Info and Actions */}
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
                >
                  <ListPlus size={18} color={theme.colors.accent} strokeWidth={2} />
                  <Text style={styles.saveButtonText}>Save as Playlist</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Queue List - NO GESTURE AT ALL */}
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
            windowSize={31}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            onScrollToIndexFailed={(info) => {
              // Fallback if scrollToIndex fails
              setTimeout(() => {
                flatListRef.current?.scrollToIndex?.({
                  index: info.index,
                  animated: false,
                  viewPosition: 0.3,
                });
              }, 100);
            }}
          />
        </View>

        {/* Track Menu */}
        <TrackMenu
          visible={trackMenuState.showTrackMenu}
          onClose={trackMenuState.closeTrackMenu}
          track={trackMenuState.selectedTrack}
          onShowInfo={trackMenuState.handleShowInfo}
          onShowAddToPlaylist={trackMenuState.handleShowAddToPlaylist}
          onShowConfirm={trackMenuState.handleShowConfirm}
        />

        {/* Song Info Modal */}
        <SongInfoModal
          visible={trackMenuState.showSongInfo}
          onClose={() => trackMenuState.setShowSongInfo(false)}
          track={trackMenuState.selectedTrack}
        />
        
        {/* Add to Playlist Modal */}
        <AddToPlaylistModal
          visible={trackMenuState.showAddToPlaylist}
          onClose={() => trackMenuState.setShowAddToPlaylist(false)}
          songIds={trackMenuState.selectedTrack ? [trackMenuState.selectedTrack.id] : []}
          songTitle={trackMenuState.selectedTrack?.title}
        />
        
        {/* Confirm Modal */}
        <ConfirmModal
          visible={trackMenuState.showConfirm}
          title={trackMenuState.confirmMessage.title}
          message={trackMenuState.confirmMessage.message}
          onClose={() => trackMenuState.setShowConfirm(false)}
        />
        
        {/* Clear Queue Confirm */}
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
        
        {/* Save Queue to Playlist */}
        <AddToPlaylistModal
          visible={showSaveToPlaylist}
          onClose={() => setShowSaveToPlaylist(false)}
          songIds={queue.map(track => track.id)}
          songTitle="Queue"
        />
        </GestureHandlerRootView>
      </BlurredBackground>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // More visible
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
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
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
    height: 72, // Fixed height for consistent spacing
    backgroundColor: 'rgba(30, 30, 30, 0.85)', // Darker, semi-transparent for better contrast
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  queueItemActive: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
  },
  queueItemDragging: {
    backgroundColor: 'rgba(50, 50, 50, 0.98)',
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
    height: 72, // Match item height
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
  duration: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.medium,
    color: 'rgba(255, 255, 255, 0.6)', // More visible
    marginLeft: theme.spacing.sm,
    minWidth: 40,
    textAlign: 'right',
  },
  deleteAction: {
    backgroundColor: theme.colors.error,
    height: 72, // Match item height
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: theme.spacing.md, // Add left padding to flow into rounded item
    paddingRight: theme.spacing.lg,
    borderRadius: theme.borderRadius.md, // Full border radius to match item
    marginBottom: theme.spacing.sm, // Match item margin
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.semibold,
  },
});
