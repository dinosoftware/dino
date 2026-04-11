/**
 * Dino Music App - Queue Screen
 * Optimized with drag-to-reorder and swipe-to-close
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

async function buildCoverArtUrls(
  tracks: Track[],
  downloadedAlbums: Record<string, { album: { coverArt?: string }; coverArtUri?: string }>,
  downloadedPlaylists: Record<string, { playlist: { coverArt?: string }; coverArtUri?: string }>,
  downloadedTracks: Record<string, { track: { coverArt?: string }; coverArtUri?: string }>,
  size: number
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  
  for (const track of tracks) {
    if (!track.coverArt) continue;
    
    const album = Object.values(downloadedAlbums).find(a => a.album.coverArt === track.coverArt);
    if (album?.coverArtUri) {
      urls[track.id] = album.coverArtUri;
      continue;
    }
    
    const playlist = Object.values(downloadedPlaylists).find(p => p.playlist.coverArt === track.coverArt);
    if (playlist?.coverArtUri) {
      urls[track.id] = playlist.coverArtUri;
      continue;
    }
    
    const dlTrack = Object.values(downloadedTracks).find(t => t.track.coverArt === track.coverArt);
    if (dlTrack?.coverArtUri) {
      urls[track.id] = dlTrack.coverArtUri;
      continue;
    }
    
    try {
      const url = await apiClient.buildCoverArtUrl(track.coverArt, size);
      urls[track.id] = url;
    } catch {
    }
  }
  
  return urls;
}

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
  const [coverArtUrls, setCoverArtUrls] = useState<Record<string, string>>({});
  const flatListRef = useRef<any>(null);
  const hasScrolledToCurrentRef = useRef(false);

  const { downloadedAlbums, downloadedPlaylists, downloadedTracks } = useDownloadStore();

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

  useEffect(() => {
    if (queue.length === 0) {
      setCoverArtUrls({});
      return;
    }
    
    let cancelled = false;
    buildCoverArtUrls(queue, downloadedAlbums, downloadedPlaylists, downloadedTracks, 120)
      .then(urls => {
        if (!cancelled) setCoverArtUrls(urls);
      });
    
    return () => { cancelled = true; };
  }, [queue, downloadedAlbums, downloadedPlaylists, downloadedTracks]);

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
    const isCurrentTrack = index === currentIndex;
    const artistDisplay = item.displayArtist || item.artist || 'Unknown Artist';
    const coverUrl = coverArtUrls[item.id];

    return (
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            height: ITEM_HEIGHT,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            marginBottom: ITEM_MARGIN,
            backgroundColor: isActive
              ? theme.colors.background.elevated
              : isCurrentTrack
                ? theme.colors.background.elevated
                : theme.colors.background.elevated,
            borderColor: isActive || isCurrentTrack ? theme.colors.accent : theme.colors.border,
          },
          isActive && {
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
          },
        ]}
      >
        <TouchableOpacity
          style={{
            width: 44,
            height: ITEM_HEIGHT,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            drag();
          }}
          delayLongPress={150}
          activeOpacity={0.6}
        >
          <GripVertical size={20} color={isActive ? theme.colors.accent : theme.colors.text.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={() => handlePress(index)}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.7}
        >
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={{
              width: 48,
              height: 48,
              borderRadius: theme.borderRadius.sm,
              marginRight: theme.spacing.md,
            }} />
          ) : (
            <View style={{
              width: 48,
              height: 48,
              borderRadius: theme.borderRadius.sm,
              marginRight: theme.spacing.md,
              backgroundColor: theme.colors.background.muted,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Music size={20} color={theme.colors.text.muted} />
            </View>
          )}

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontFamily: (isActive || isCurrentTrack) 
                  ? theme.typography.fontFamily.semibold 
                  : theme.typography.fontFamily.medium,
                color: (isActive || isCurrentTrack) ? theme.colors.accent : theme.colors.text.primary,
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
              {artistDisplay}
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
          style={{
            width: 44,
            height: ITEM_HEIGHT,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => handleRemove(index)}
        >
          <Trash2 size={18} color={theme.colors.text.muted} />
        </TouchableOpacity>
      </View>
    );
  }, [currentIndex, coverArtUrls, theme, handlePress, handleLongPress, handleRemove]);

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
              maxToRenderPerBatch={15}
              updateCellsBatchingPeriod={100}
              initialNumToRender={25}
              windowSize={31}
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
