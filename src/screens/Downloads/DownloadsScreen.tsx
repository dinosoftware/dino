/**
 * Dino Music App - Downloads Screen
 * Comprehensive offline downloads management
 */

import { Download, Play, Shuffle, Trash2, Music, Disc, ListMusic } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '../../config';
import { downloadService } from '../../services/DownloadService';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { useDownloadStore, DownloadedTrack, DownloadedAlbum, DownloadedPlaylist } from '../../stores/downloadStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';
import { useToastStore } from '../../stores/toastStore';

type DownloadSection = {
  title: string;
  data: any[];
  type: 'active' | 'album' | 'playlist' | 'track';
};

export const DownloadsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { downloadedTracks, downloadedAlbums, downloadedPlaylists, totalStorageUsed, activeDownloads } = useDownloadStore();
  const { storageLimit } = useSettingsStore();
  const { navigate } = useNavigationStore();
  const { setCurrentTrack } = usePlayerStore();
  const { setQueue } = useQueueStore();
  const { showToast } = useToastStore();
  
  const albums = Object.values(downloadedAlbums);
  const playlists = Object.values(downloadedPlaylists);
  const activeDownloadsList = Array.from(activeDownloads.values());
  
  // Get all track IDs that are part of albums or playlists
  const albumTrackIds = new Set(
    albums.flatMap(album => album.tracks.map(t => t.track.id))
  );
  const playlistTrackIds = new Set(
    playlists.flatMap(playlist => playlist.tracks.map(t => t.track.id))
  );
  
  // Filter out tracks that are part of albums or playlists (only show standalone downloads)
  const tracks = Object.values(downloadedTracks).filter(
    downloadedTrack => !albumTrackIds.has(downloadedTrack.track.id) && !playlistTrackIds.has(downloadedTrack.track.id)
  );

  const storageLimitBytes = storageLimit * 1024 * 1024; // Convert MB to bytes
  const storagePercentage = (totalStorageUsed / storageLimitBytes) * 100;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handlePlayAll = async () => {
    // Get ALL downloaded tracks (standalone + from albums + from playlists)
    const allTracks = Object.values(downloadedTracks).map(d => d.track);
    
    if (allTracks.length === 0) {
      showToast('No downloaded tracks to play', 'info');
      return;
    }

    setQueue(allTracks, 0);
    setCurrentTrack(allTracks[0]);
    await trackPlayerService.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Playing ${allTracks.length} downloaded tracks`);
  };

  const handleShuffleAll = async () => {
    // Get ALL downloaded tracks (standalone + from albums + from playlists)
    const allTracks = Object.values(downloadedTracks).map(d => d.track);
    
    if (allTracks.length === 0) {
      showToast('No downloaded tracks to shuffle', 'info');
      return;
    }

    // Shuffle tracks
    const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
    
    setQueue(shuffled, 0);
    setCurrentTrack(shuffled[0]);
    await trackPlayerService.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Shuffling ${shuffled.length} downloaded tracks`);
  };

  const handleClearAll = async () => {
    try {
      await downloadService.clearAllDownloads();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('All downloads cleared');
    } catch (error) {
      showToast('Failed to clear downloads', 'error');
    }
  };

  const handlePlayTrack = async (download: DownloadedTrack, index: number) => {
    const allTracks = tracks.map(d => d.track);
    setQueue(allTracks, index);
    setCurrentTrack(download.track);
    await trackPlayerService.play();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      await downloadService.deleteTrack(trackId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Track removed');
    } catch (error) {
      showToast('Failed to remove track', 'error');
    }
  };

  const handleAlbumPress = (album: DownloadedAlbum) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigate({ name: 'album-detail', params: { albumId: album.album.id } });
  };

  const handleDeleteAlbum = async (albumId: string) => {
    try {
      await downloadService.deleteAlbum(albumId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Album removed');
    } catch (error) {
      showToast('Failed to remove album', 'error');
    }
  };

  const handlePlaylistPress = (playlist: DownloadedPlaylist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigate({ name: 'playlist-detail', params: { playlistId: playlist.playlist.id } });
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      await downloadService.deletePlaylist(playlistId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Playlist removed');
    } catch (error) {
      showToast('Failed to remove playlist', 'error');
    }
  };

  const renderStorageCard = () => (
    <View style={styles.storageCard}>
      <View style={styles.storageHeader}>
        <Text style={styles.storageTitle}>Storage Used</Text>
        <Text style={styles.storageValue}>
          {formatBytes(totalStorageUsed)} / {storageLimit.toFixed(0)} MB
        </Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(storagePercentage, 100)}%` },
          ]}
        />
      </View>
      <View style={styles.storageActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { flex: 1, marginRight: theme.spacing.xs }]} 
          onPress={handlePlayAll}
          disabled={Object.keys(downloadedTracks).length === 0}
        >
          <Play size={18} color={theme.colors.text.inverse} strokeWidth={2} />
          <Text style={[styles.actionButtonText, Object.keys(downloadedTracks).length === 0 && styles.actionButtonTextDisabled]}>
            Play All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { flex: 1, marginLeft: theme.spacing.xs }]} 
          onPress={handleShuffleAll}
          disabled={Object.keys(downloadedTracks).length === 0}
        >
          <Shuffle size={18} color={theme.colors.text.inverse} strokeWidth={2} />
          <Text style={[styles.actionButtonText, Object.keys(downloadedTracks).length === 0 && styles.actionButtonTextDisabled]}>
            Shuffle
          </Text>
        </TouchableOpacity>
      </View>
      {(tracks.length > 0 || albums.length > 0 || playlists.length > 0) && (
        <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
          <Text style={styles.clearAllText}>Clear All Downloads</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderActiveDownload = ({ item }: { item: any }) => {
    const progressPercent = Math.round(item.progress * 100);
    const isComplete = item.status === 'completed';
    const isFailed = item.status === 'failed';

    const title = item.title || 'Downloading...';
    let subtitle = '';
    
    if (item.type === 'album' && item.totalTracks) {
      subtitle = `${item.artist || 'Album'} • ${item.completedTracks || 0}/${item.totalTracks} tracks`;
    } else if (item.type === 'playlist' && item.totalTracks) {
      subtitle = `${item.completedTracks || 0}/${item.totalTracks} tracks`;
    } else if (item.type === 'track') {
      subtitle = item.artist || 'Track';
    }

    return (
      <View style={styles.activeDownloadRow}>
        {item.coverArtUri ? (
          <Image source={{ uri: item.coverArtUri }} style={styles.activeDownloadCover} />
        ) : (
          <View style={[styles.activeDownloadCover, styles.activeDownloadCoverPlaceholder]}>
            <Download size={20} color={theme.colors.text.tertiary} />
          </View>
        )}
        <View style={styles.activeDownloadInfo}>
          <Text style={styles.activeDownloadTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.activeDownloadSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          {isFailed ? (
            <Text style={styles.activeDownloadError}>{item.error || 'Failed'}</Text>
          ) : (
            <>
              <Text style={styles.activeDownloadStatus}>
                {isComplete ? 'Complete' : `${progressPercent}%`}
              </Text>
              {!isComplete && (
                <View style={styles.miniProgressBar}>
                  <View style={[styles.miniProgressFill, { width: `${progressPercent}%` }]} />
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  const renderAlbum = ({ item }: { item: DownloadedAlbum }) => {
    const coverUri = item.coverArtUri;

    return (
      <TouchableOpacity 
        style={styles.itemRow} 
        onPress={() => handleAlbumPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverArt} />
          ) : (
            <View style={[styles.coverArt, styles.coverArtPlaceholder]}>
              <Disc size={24} color={theme.colors.text.tertiary} />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.album.name}
            </Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {item.album.artist || 'Unknown Artist'}
            </Text>
            <Text style={styles.itemDetails}>
              {item.tracks.length} tracks • {formatBytes(item.totalSize)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteAlbum(item.album.id);
          }}
        >
          <Trash2 size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderPlaylist = ({ item }: { item: DownloadedPlaylist }) => {
    const coverUri = item.coverArtUri;

    return (
      <TouchableOpacity 
        style={styles.itemRow} 
        onPress={() => handlePlaylistPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverArt} />
          ) : (
            <View style={[styles.coverArt, styles.coverArtPlaceholder]}>
              <ListMusic size={24} color={theme.colors.text.tertiary} />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.playlist.name}
            </Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {item.tracks.length} tracks
            </Text>
            <Text style={styles.itemDetails}>
              {formatBytes(item.totalSize)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDeletePlaylist(item.playlist.id);
          }}
        >
          <Trash2 size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderTrack = ({ item, index }: { item: DownloadedTrack; index: number }) => {
    const coverUri = item.coverArtUri;

    return (
      <TouchableOpacity 
        style={styles.itemRow} 
        onPress={() => handlePlayTrack(item, index)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverArt} />
          ) : (
            <View style={[styles.coverArt, styles.coverArtPlaceholder]}>
              <Music size={20} color={theme.colors.text.tertiary} />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.track.title}
            </Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>
              {item.track.artist || 'Unknown Artist'}
            </Text>
            <Text style={styles.itemDetails}>
              {formatBytes(item.size)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteTrack(item.track.id);
          }}
        >
          <Trash2 size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: DownloadSection }) => {
    if (section.data.length === 0) return null;

    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>{section.data.length}</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Download size={64} color={theme.colors.text.tertiary} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>No Downloads</Text>
      <Text style={styles.emptySubtitle}>
        Download tracks, albums, or playlists to listen offline
      </Text>
    </View>
  );

  const sections: DownloadSection[] = [
    {
      title: 'Active Downloads',
      data: activeDownloadsList,
      type: 'active',
    },
    {
      title: 'Albums',
      data: albums,
      type: 'album',
    },
    {
      title: 'Playlists',
      data: playlists,
      type: 'playlist',
    },
    {
      title: 'Individual Tracks',
      data: tracks,
      type: 'track',
    },
  ];

  const hasAnyContent = activeDownloadsList.length > 0 || albums.length > 0 || playlists.length > 0 || tracks.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Downloads</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => {
          if ('id' in item) return item.id;
          if ('album' in item) return item.album.id;
          if ('playlist' in item) return item.playlist.id;
          if ('track' in item) return item.track.id;
          return `item_${index}`;
        }}
        renderItem={({ item, section, index }) => {
          if (section.type === 'active') return renderActiveDownload({ item });
          if (section.type === 'album') return renderAlbum({ item });
          if (section.type === 'playlist') return renderPlaylist({ item });
          if (section.type === 'track') return renderTrack({ item, index });
          return null;
        }}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderStorageCard}
        ListEmptyComponent={!hasAnyContent ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  topBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  screenTitle: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
  },
  storageCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  storageTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  storageValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 4,
  },
  storageActions: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.inverse,
    marginLeft: theme.spacing.xs,
  },
  actionButtonTextDisabled: {
    color: theme.colors.text.disabled,
  },
  clearAllButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  clearAllText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#EF4444',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.tertiary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.primary,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.md,
  },
  coverArt: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
  },
  coverArtPlaceholder: {
    backgroundColor: theme.colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  itemSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  itemDetails: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  activeDownloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.card,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  activeDownloadCover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.md,
  },
  activeDownloadCoverPlaceholder: {
    backgroundColor: theme.colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDownloadInfo: {
    flex: 1,
  },
  activeDownloadTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  activeDownloadSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  activeDownloadStatus: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  activeDownloadError: {
    fontSize: theme.typography.fontSize.sm,
    color: '#EF4444',
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: theme.colors.background.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});
