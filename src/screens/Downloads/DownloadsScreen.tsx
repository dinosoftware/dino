/**
 * Dino Music App - Downloads Screen
 * Comprehensive offline downloads management using nitro DownloadManager
 */

import { Download, Play, Shuffle, Trash2, X } from 'lucide-react-native';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Image,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { DownloadManager } from 'react-native-nitro-player';
import type { DownloadTask } from 'react-native-nitro-player';
import { useTheme } from '../../hooks/useTheme';
import { downloadService } from '../../services/DownloadService';
import type { PendingGroupInfo, QueuedTrackInfo } from '../../services/DownloadService';
import { nitroPlayerService } from '../../services/player/NitroPlayerService';
import { useDownloadStore, CachedDownloadedTrack, CachedDownloadedAlbum, CachedDownloadedPlaylist } from '../../stores/downloadStore';
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
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const downloadedTracks = useDownloadStore((state) => state.downloadedTracks);
  const downloadedAlbums = useDownloadStore((state) => state.downloadedAlbums);
  const downloadedPlaylists = useDownloadStore((state) => state.downloadedPlaylists);
  const totalStorageUsed = useDownloadStore((state) => state.totalStorageUsed);
  const { storageLimit } = useSettingsStore();
  const { navigate } = useNavigationStore();
  const { setCurrentTrack } = usePlayerStore();
  const { setQueue } = useQueueStore();
  const { showToast } = useToastStore();

  const [activeTasks, setActiveTasks] = useState<DownloadTask[]>([]);
  const [pendingGroups, setPendingGroups] = useState<PendingGroupInfo[]>([]);
  const [queuedTracks, setQueuedTracks] = useState<QueuedTrackInfo[]>([]);

  useEffect(() => {
    let mounted = true;
    let pollCount = 0;
    const poll = () => {
      if (!mounted) return;
      pollCount++;
      try {
        const tasks = DownloadManager.getActiveDownloads();
        if (mounted) {
          setActiveTasks(prev => {
            if (prev.length === tasks.length && prev.every((t, i) => t.downloadId === tasks[i].downloadId && t.state === tasks[i].state && t.progress.progress === tasks[i].progress.progress)) return prev;
            return tasks;
          });
        }
        if (pollCount % 5 === 0 && tasks.length > 0) {
          const qs = DownloadManager.getQueueStatus();
          console.log('[DownloadsScreen] POLL — active:', qs.activeCount, 'pending:', qs.pendingCount, 'completed:', qs.completedCount, 'failed:', qs.failedCount);
        }
      } catch {}
      try {
        const groups = downloadService.getPendingGroups();
        if (mounted) {
          setPendingGroups(prev => {
            if (prev.length === groups.length && prev.every((g, i) => g.completedTracks === groups[i].completedTracks && g.failedTracks === groups[i].failedTracks)) return prev;
            return groups;
          });
        }
      } catch {}
      try {
        const queued = downloadService.getQueuedDownloads();
        if (mounted) {
          setQueuedTracks(prev => {
            if (prev.length === queued.length) return prev;
            return queued;
          });
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const albums = Object.values(downloadedAlbums);
  const playlists = Object.values(downloadedPlaylists);

  const albumTrackIds = new Set(
    albums.flatMap(album => album.tracks.map(t => t.track.id))
  );
  const playlistTrackIds = new Set(
    playlists.flatMap(playlist => playlist.tracks.map(t => t.track.id))
  );

  const standaloneTracks = Object.values(downloadedTracks).filter(
    t => !albumTrackIds.has(t.track.id) && !playlistTrackIds.has(t.track.id)
  );

  const storageLimitBytes = storageLimit * 1024 * 1024;
  const storagePercentage = storageLimitBytes > 0 ? (totalStorageUsed / storageLimitBytes) * 100 : 0;

  const styles = useMemo(() => StyleSheet.create({
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
    clearCompletedButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      marginRight: theme.spacing.sm,
    },
    clearCompletedText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: '#EF4444',
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
  }), [theme]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handlePlayAll = async () => {
    const allTracks = Object.values(downloadedTracks).map(d => d.track);
    if (allTracks.length === 0) {
      showToast('No downloaded tracks to play', 'info');
      return;
    }
    setQueue(allTracks, 0);
    setCurrentTrack(allTracks[0]);
    try {
      await nitroPlayerService.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Playing ${allTracks.length} downloaded tracks`);
    } catch {
      showToast('Failed to start playback', 'error');
    }
  };

  const handleShuffleAll = async () => {
    const allTracks = Object.values(downloadedTracks).map(d => d.track);
    if (allTracks.length === 0) {
      showToast('No downloaded tracks to shuffle', 'info');
      return;
    }
    const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
    setQueue(shuffled, 0);
    setCurrentTrack(shuffled[0]);
    try {
      await nitroPlayerService.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Shuffling ${shuffled.length} downloaded tracks`);
    } catch {
      showToast('Failed to start playback', 'error');
    }
  };

  const handleClearAll = async () => {
    try {
      await downloadService.clearAllDownloads();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('All downloads cleared');
    } catch {
      showToast('Failed to clear downloads', 'error');
    }
  };

  const handlePlayTrack = async (download: CachedDownloadedTrack, index: number) => {
    const allTracks = standaloneTracks.map(d => d.track);
    setQueue(allTracks, index);
    setCurrentTrack(download.track);
    await nitroPlayerService.play();
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

  const handleAlbumPress = (album: CachedDownloadedAlbum) => {
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

  const handlePlaylistPress = (playlist: CachedDownloadedPlaylist) => {
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

  const handleCancelTask = async (taskId: string) => {
    try {
      await downloadService.cancelDownload(taskId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Download cancelled');
    } catch (error) {
      showToast('Failed to cancel download', 'error');
    }
  };

  const handleCancelAllActive = async () => {
    try {
      await downloadService.cancelAllQueuedDownloads();
      setActiveTasks([]);
      setPendingGroups([]);
      setQueuedTracks([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('All downloads cancelled');
    } catch {
      showToast('Failed to cancel downloads', 'error');
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
      {(standaloneTracks.length > 0 || albums.length > 0 || playlists.length > 0) && (
        <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
          <Text style={styles.clearAllText}>Clear All Downloads</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderActiveDownload = ({ item }: { item: DownloadTask }) => {
    const progressPercent = Math.round(item.progress.progress * 100);
    const isCancellable = item.state === 'downloading' || item.state === 'pending';
    const meta = downloadService.getTrackDownloadMeta(item.trackId);
    const groupInfo = meta?.groupId ? downloadService.getGroupInfo(meta.groupId) : undefined;

    let subtitle = '';
    if (item.state === 'failed' && item.error?.message) {
      subtitle = item.error.message;
    } else if (meta?.artist) {
      subtitle = meta.artist;
    }

    const coverUri = meta?.coverArtUri || groupInfo?.coverArtUri;

    return (
      <View style={styles.activeDownloadRow}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.activeDownloadCover} />
        ) : (
          <View style={[styles.activeDownloadCover, styles.activeDownloadCoverPlaceholder]}>
            <Download size={20} color={theme.colors.text.tertiary} />
          </View>
        )}
        <View style={styles.activeDownloadInfo}>
          <Text style={styles.activeDownloadTitle} numberOfLines={1}>
            {meta?.title || item.trackId}
          </Text>
          <Text style={styles.activeDownloadSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          <Text style={styles.activeDownloadStatus}>
            {item.state === 'pending' ? 'Pending' : item.state === 'paused' ? 'Paused' : `${progressPercent}%`}
          </Text>
          {item.state === 'downloading' && (
            <View style={styles.miniProgressBar}>
              <View style={[styles.miniProgressFill, { width: `${progressPercent}%` }]} />
            </View>
          )}
        </View>
        {isCancellable && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleCancelTask(item.downloadId)}
          >
            <X size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderPendingGroup = ({ item }: { item: PendingGroupInfo }) => {
    const progressPercent = item.totalTracks > 0
      ? Math.round(((item.completedTracks + item.failedTracks) / item.totalTracks) * 100)
      : 0;

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
            {item.name}
          </Text>
          <Text style={styles.activeDownloadSubtitle} numberOfLines={1}>
            {item.type === 'album' ? 'Album' : 'Playlist'}
          </Text>
          <Text style={styles.activeDownloadStatus}>
            {item.completedTracks}/{item.totalTracks} tracks
            {item.failedTracks > 0 ? ` (${item.failedTracks} failed)` : ''}
          </Text>
          <View style={styles.miniProgressBar}>
            <View style={[styles.miniProgressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>
      </View>
    );
  };

  const renderQueuedTrack = ({ item, index }: { item: QueuedTrackInfo; index: number }) => {
    return (
      <View style={styles.activeDownloadRow}>
        <View style={[styles.activeDownloadCover, styles.activeDownloadCoverPlaceholder]}>
          <Download size={20} color={theme.colors.text.tertiary} />
        </View>
        <View style={styles.activeDownloadInfo}>
          <Text style={styles.activeDownloadTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.activeDownloadSubtitle} numberOfLines={1}>
            {item.artist}
          </Text>
          <Text style={styles.activeDownloadStatus}>
            Queued #{index + 1}
          </Text>
        </View>
      </View>
    );
  };

  const renderAlbum = ({ item }: { item: CachedDownloadedAlbum }) => {
    const coverUri = item.coverArtUri;
    return (
      <TouchableOpacity
        style={styles.itemRow}
        onPress={() => handleAlbumPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <Image
            source={coverUri ? { uri: coverUri } : require('../../../assets/images/album_art_placeholder.png')}
            style={styles.coverArt}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.album.name}</Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>{item.album.artist || 'Unknown Artist'}</Text>
            <Text style={styles.itemDetails}>{item.tracks.length} tracks • {formatBytes(item.totalSize)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => { e.stopPropagation(); handleDeleteAlbum(item.album.id); }}
        >
          <Trash2 size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderPlaylist = ({ item }: { item: CachedDownloadedPlaylist }) => {
    const coverUri = item.coverArtUri;
    return (
      <TouchableOpacity
        style={styles.itemRow}
        onPress={() => handlePlaylistPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <Image
            source={coverUri ? { uri: coverUri } : require('../../../assets/images/album_art_placeholder.png')}
            style={styles.coverArt}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.playlist.name}</Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>{item.tracks.length} tracks</Text>
            <Text style={styles.itemDetails}>{formatBytes(item.totalSize)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => { e.stopPropagation(); handleDeletePlaylist(item.playlist.id); }}
        >
          <Trash2 size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderTrack = ({ item, index }: { item: CachedDownloadedTrack; index: number }) => {
    const coverUri = item.coverArtUri;
    return (
      <TouchableOpacity
        style={styles.itemRow}
        onPress={() => handlePlayTrack(item, index)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <Image
            source={coverUri ? { uri: coverUri } : require('../../../assets/images/album_art_placeholder.png')}
            style={styles.coverArt}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.track.title}</Text>
            <Text style={styles.itemSubtitle} numberOfLines={1}>{item.track.artist || 'Unknown Artist'}</Text>
            <Text style={styles.itemDetails}>{formatBytes(item.size)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => { e.stopPropagation(); handleDeleteTrack(item.track.id); }}
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {section.type === 'active' && (
            <TouchableOpacity
              style={styles.clearCompletedButton}
              onPress={handleCancelAllActive}
            >
              <Text style={styles.clearCompletedText}>Cancel All</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.sectionCount}>{section.data.length}</Text>
        </View>
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

  const hasActiveDownloads = pendingGroups.length > 0 || activeTasks.length > 0 || queuedTracks.length > 0;

  const activeData = [
    ...pendingGroups as any[],
    ...activeTasks as any[],
    ...queuedTracks as any[],
  ];

  const sections: DownloadSection[] = [
    { title: 'Active Downloads', data: activeData, type: 'active' },
    { title: 'Albums', data: albums, type: 'album' },
    { title: 'Playlists', data: playlists, type: 'playlist' },
    { title: 'Individual Tracks', data: standaloneTracks, type: 'track' },
  ];

  const hasAnyContent = hasActiveDownloads || albums.length > 0 || playlists.length > 0 || standaloneTracks.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Downloads</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => {
          if ('downloadId' in item) return item.downloadId;
          if ('totalTracks' in item) return (item as PendingGroupInfo).id;
          if ('album' in item) return item.album.id;
          if ('playlist' in item) return item.playlist.id;
          if ('track' in item) return item.track.id;
          return `queued_${index}`;
        }}
        renderItem={({ item, section, index }) => {
          if (section.type === 'active') {
            if ('totalTracks' in item) return renderPendingGroup({ item: item as PendingGroupInfo });
            if ('downloadId' in item) return renderActiveDownload({ item: item as DownloadTask });
            if ('groupId' in item) return renderQueuedTrack({ item: item as QueuedTrackInfo, index });
            return null;
          }
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
