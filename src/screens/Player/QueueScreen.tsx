/**
 * Dino Music App - Queue Screen
 * Optimized with drag-to-reorder, per-item cover art, and memoized rendering
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
  useWindowDimensions,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { X, Trash2, GripVertical, Eraser, ListPlus, Music, Upload, Download } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQueueStore, usePlayerStore } from '../../stores';
import { useCoverArt } from '../../hooks/api/useAlbums';
import { useDownloadStore } from '../../stores/downloadStore';
import { apiClient } from '../../api/client';

import { TrackMenu } from '../../components/Player/TrackMenu';
import { SongInfoModal } from '../../components/Modals/SongInfoModal';
import { AddToPlaylistModal } from '../../components/Modals/AddToPlaylistModal';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { useTrackMenuState } from '../../hooks/useTrackMenuState';
import { playerRouter } from '../../services/player/PlayerRouter';
import { useTheme, useBackgroundStyle } from '../../hooks/useTheme';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { Track } from '../../api/opensubsonic/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queueSyncManager } from '../../services/player/QueueSyncManager';
import { useToastStore } from '../../stores/toastStore';

interface QueueScreenProps {
  onClose: () => void;
}

const ITEM_HEIGHT = 72;
const ITEM_MARGIN = 8;

const serverCoverArtCache = new Map<string, string>();

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    marginBottom: ITEM_MARGIN,
  },
  activeShadow: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  dragHandle: {
    width: 44,
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverArt: {
    width: 48,
    height: 48,
  },
  coverPlaceholder: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  duration: {
    minWidth: 40,
    textAlign: 'right',
  },
  removeBtn: {
    width: 44,
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

interface QueueItemProps {
  item: Track;
  index: number;
  isCurrentTrack: boolean;
  isActive: boolean;
  coverArtDownloadUri: string | undefined;
  onDrag: () => void;
  onPress: (index: number) => void;
  onLongPress: (track: Track) => void;
  onRemove: (index: number) => void;
}

const QueueItem = memo(
  function QueueItem({ item, index, isCurrentTrack, isActive, coverArtDownloadUri, onDrag, onPress, onLongPress, onRemove }: QueueItemProps) {
    const theme = useTheme();
    const [coverUrl, setCoverUrl] = useState<string | undefined>(coverArtDownloadUri);

    useEffect(() => {
      if (coverArtDownloadUri) {
        setCoverUrl(coverArtDownloadUri);
        return;
      }
      if (!item.coverArt) {
        setCoverUrl(undefined);
        return;
      }
      const cached = serverCoverArtCache.get(item.coverArt);
      if (cached) {
        setCoverUrl(cached);
        return;
      }
      let cancelled = false;
      apiClient.buildCoverArtUrl(item.coverArt, 120).then((url) => {
        if (!cancelled) {
          serverCoverArtCache.set(item.coverArt, url);
          setCoverUrl(url);
        }
      }).catch(() => {});
      return () => { cancelled = true; };
    }, [coverArtDownloadUri, item.coverArt]);

    const highlight = isActive || isCurrentTrack;

    return (
      <View
        style={[
          itemStyles.container,
          {
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            backgroundColor: theme.colors.background.elevated,
            borderColor: highlight ? theme.colors.accent : theme.colors.border,
          },
          isActive && itemStyles.activeShadow,
        ]}
      >
        <TouchableOpacity
          style={itemStyles.dragHandle}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onDrag();
          }}
          delayLongPress={150}
          activeOpacity={0.6}
        >
          <GripVertical size={20} color={highlight ? theme.colors.accent : theme.colors.text.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={itemStyles.content}
          onPress={() => onPress(index)}
          onLongPress={() => onLongPress(item)}
          activeOpacity={0.7}
        >
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={[itemStyles.coverArt, { borderRadius: theme.borderRadius.sm, marginRight: theme.spacing.md }]} />
          ) : (
            <View style={[itemStyles.coverPlaceholder, { borderRadius: theme.borderRadius.sm, marginRight: theme.spacing.md, backgroundColor: theme.colors.background.muted }]}>
              <Music size={20} color={theme.colors.text.muted} />
            </View>
          )}

          <View style={itemStyles.textContainer}>
            <Text
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontFamily: highlight
                  ? theme.typography.fontFamily.semibold
                  : theme.typography.fontFamily.medium,
                color: highlight ? theme.colors.accent : theme.colors.text.primary,
              }}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: theme.typography.fontSize.xs,
                fontFamily: theme.typography.fontFamily.regular,
                color: theme.colors.text.secondary,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {item.displayArtist || item.artist || 'Unknown Artist'}
            </Text>
          </View>

          <Text style={{
            fontSize: theme.typography.fontSize.xs,
            fontFamily: theme.typography.fontFamily.medium,
            color: theme.colors.text.muted,
            marginLeft: theme.spacing.sm,
            minWidth: 40,
            textAlign: 'right',
            marginRight: theme.spacing.sm,
          }}>
            {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={itemStyles.removeBtn}
          onPress={() => onRemove(index)}
        >
          <Trash2 size={18} color={theme.colors.text.muted} />
        </TouchableOpacity>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.index === next.index &&
      prev.isCurrentTrack === next.isCurrentTrack &&
      prev.isActive === next.isActive &&
      prev.coverArtDownloadUri === next.coverArtDownloadUri
    );
  },
);

export const QueueScreen: React.FC<QueueScreenProps> = ({ onClose }) => {
  const theme = useTheme();
  const backgroundStyle = useBackgroundStyle();
  const { height: screenHeight } = useWindowDimensions();

  const { queue, currentIndex, removeFromQueue, reorderQueue, clearQueue } = useQueueStore();
  const { currentTrack, setCurrentTrack } = usePlayerStore();
  const { data: coverArtUrl } = useCoverArt(currentTrack?.coverArt, 500);
  const albumColors = useAlbumColors(currentTrack?.coverArt);
  const { showToast } = useToastStore();
  const trackMenuState = useTrackMenuState();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSaveToPlaylist, setShowSaveToPlaylist] = useState(false);
  const flatListRef = useRef<any>(null);
  const hasScrolledToCurrentRef = useRef(false);

  const { downloadedAlbums, downloadedPlaylists, downloadedTracks } = useDownloadStore();

  const downloadCoverArtMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of Object.values(downloadedAlbums) as any[]) {
      if (a?.album?.coverArt && a?.coverArtUri) map.set(a.album.coverArt, a.coverArtUri);
    }
    for (const p of Object.values(downloadedPlaylists) as any[]) {
      if (p?.playlist?.coverArt && p?.coverArtUri) map.set(p.playlist.coverArt, p.coverArtUri);
    }
    for (const t of Object.values(downloadedTracks) as any[]) {
      if (t?.track?.coverArt && t?.coverArtUri) map.set(t.track.coverArt, t.coverArtUri);
    }
    return map;
  }, [downloadedAlbums, downloadedPlaylists, downloadedTracks]);

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

  const translateY = useRef(new Animated.Value(screenHeight)).current;

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
      toValue: screenHeight,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(screenHeight);
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

  const handleRemove = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeFromQueue(index);
  }, [removeFromQueue]);

  const handleLongPress = useCallback((track: Track) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackMenuState.openTrackMenu(track);
  }, [trackMenuState]);

  const handlePress = useCallback(async (index: number) => {
    await playerRouter.playTrack(index);
  }, []);

  const handleDragEnd = useCallback(({ from, to }: { data: Track[]; from: number; to: number }) => {
    if (from !== to) {
      reorderQueue(from, to);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [reorderQueue]);

  const handleSaveToServer = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await queueSyncManager.syncToServer(undefined, true);
      showToast('Queue saved to server');
    } catch (error) {
      showToast('Failed to save queue', 'error');
    }
  }, [showToast]);

  const handleLoadFromServer = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const loaded = await queueSyncManager.loadFromServer(true, true);
      if (loaded) {
        const { queue: newQueue, currentIndex: newIndex } = useQueueStore.getState();
        if (newQueue.length > 0 && newIndex >= 0 && newIndex < newQueue.length) {
          setCurrentTrack(newQueue[newIndex]);
        }
        showToast('Queue loaded from server');
      } else {
        showToast('No queue found on server');
      }
    } catch (error) {
      showToast('Failed to load queue', 'error');
    }
  }, [showToast, setCurrentTrack]);

  const renderBackground = () => {
    const base = theme.colors.background.primary;
    if (backgroundStyle === 'solid') {
      return <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} />;
    }
    if (backgroundStyle === 'gradient') {
      return (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: albumColors.background || base }]} />
        </>
      );
    }
    if (backgroundStyle === 'blur' && coverArtUrl) {
      const isDark = theme.mode !== 'light';
      return (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} />
          <Image source={{ uri: coverArtUrl }} style={StyleSheet.absoluteFill} blurRadius={80} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }]} />
        </>
      );
    }
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} />;
  };

  const renderItem = useCallback(({ item, getIndex, drag, isActive }: RenderItemParams<Track>) => {
    const index = getIndex() ?? 0;
    return (
      <QueueItem
        item={item}
        index={index}
        isCurrentTrack={index === currentIndex}
        isActive={isActive}
        coverArtDownloadUri={item.coverArt ? downloadCoverArtMap.get(item.coverArt) : undefined}
        onDrag={drag}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onRemove={handleRemove}
      />
    );
  }, [currentIndex, downloadCoverArtMap, handlePress, handleLongPress, handleRemove]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT + ITEM_MARGIN,
    offset: (ITEM_HEIGHT + ITEM_MARGIN) * index,
    index,
  }), []);

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
      backgroundColor: theme.colors.text.muted,
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
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text.primary,
      zIndex: -1,
    },
    closeButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.background.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      zIndex: 1,
    },
    queueInfo: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    queueInfoText: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.primary,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.background.elevated,
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
    gestureRoot: {
      flex: 1,
    },
  }), [theme]);

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY }] }]}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {renderBackground()}
        <GestureHandlerRootView style={styles.gestureRoot}>
          <View style={styles.container}>
            <View
              style={styles.swipeIndicator}
              {...panResponder.panHandlers}
            >
              <View style={styles.swipeHandle} />
            </View>

            <View
              style={styles.headerContainer}
              {...panResponder.panHandlers}
            >
<View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <X size={20} color={theme.colors.text.primary} strokeWidth={2} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Queue</Text>
                <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
                  <TouchableOpacity onPress={handleSaveToServer} style={styles.closeButton}>
                    <Upload size={18} color={theme.colors.accent} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleLoadFromServer} style={styles.closeButton}>
                    <Download size={18} color={theme.colors.accent} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowClearConfirm(true)} style={styles.closeButton}>
                    <Eraser size={18} color={theme.colors.text.primary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
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
                  >
                    <ListPlus size={18} color={theme.colors.accent} strokeWidth={2} />
                    <Text style={styles.saveButtonText}>Save as Playlist</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <DraggableFlatList
              ref={flatListRef}
              data={queue}
              renderItem={renderItem}
              keyExtractor={(item: Track, index: number) => `${item.id}-${index}`}
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
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={15}
              windowSize={10}
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
          </View>

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
        </GestureHandlerRootView>
      </View>
    </Animated.View>
  );
};
