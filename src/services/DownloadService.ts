/**
 * Dino Music App - Download Service
 * Uses react-native-nitro-player DownloadManager for native downloads
 */

import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import { DownloadManager } from 'react-native-nitro-player';
import type { TrackItem } from 'react-native-nitro-player';
import { Track, Album, Playlist } from '../api/opensubsonic/types';
import { useDownloadStore, CachedDownloadedTrack, CachedDownloadedAlbum, CachedDownloadedPlaylist } from '../stores/downloadStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getDownloadUrl, getCoverArtUrl } from '../api/opensubsonic/streaming';
import { getLyricsBySongId } from '../api/opensubsonic/lyrics';
import { getAlbum, getAlbumList2 } from '../api/opensubsonic/albums';
import { getPlaylist } from '../api/opensubsonic/playlists';
import { getArtist } from '../api/opensubsonic/artists';
import { getTrackArtistString } from '../utils/artistUtils';

interface PendingGroup {
  type: 'album' | 'playlist';
  name: string;
  totalTracks: number;
  completedTracks: number;
  failedTracks: number;
  coverArtUri?: string;
  metadata?: any;
  albumOrPlaylist: Album | Playlist;
}

export interface PendingGroupInfo {
  id: string;
  type: 'album' | 'playlist';
  name: string;
  completedTracks: number;
  totalTracks: number;
  failedTracks: number;
  coverArtUri?: string;
}

export interface QueuedTrackInfo {
  title: string;
  artist: string;
  groupId: string;
}

interface QueuedDownload {
  track: Track;
  groupId: string;
}

export class DownloadService {
  private static instance: DownloadService;
  private configured = false;
  private callbacksSetup = false;
  private pendingGroups = new Map<string, PendingGroup>();
  private trackMetaMap = new Map<string, Track>();
  private lyricsMap = new Map<string, string>();
  private trackGroupMap = new Map<string, Set<string>>();
  private trackCoverArtMap = new Map<string, string>();
  private downloadQueue: QueuedDownload[] = [];
  private activeCount = 0;
  private processingQueue = false;
  private readonly GROUPS_FILE = `${FileSystem.documentDirectory}metadata/download_groups.json`;

  private constructor() {}

  static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService();
    }
    return DownloadService.instance;
  }

  configure() {
    const settings = useSettingsStore.getState();
    const maxConcurrent = settings.maxConcurrentDownloads || 3;
    const wifiOnly = settings.wifiOnlyDownloads ?? false;

    console.log('[DownloadService] CONFIGURE CALLED — maxConcurrent:', maxConcurrent, 'wifiOnly:', wifiOnly, 'wasConfigured:', this.configured);

    try {
      DownloadManager.configure({
        maxConcurrentDownloads: maxConcurrent,
        wifiOnlyDownloads: wifiOnly,
        autoRetry: true,
        maxRetryAttempts: 3,
        backgroundDownloadsEnabled: true,
        downloadArtwork: true,
      });
      this.configured = true;

      try {
        const verified = DownloadManager.getConfig();
        console.log('[DownloadService] CONFIG VERIFIED — maxConcurrent:', verified.maxConcurrentDownloads, 'wifiOnly:', verified.wifiOnlyDownloads);
      } catch (ve) {
        console.error('[DownloadService] Failed to read back config:', ve);
      }

      try {
        const status = DownloadManager.getQueueStatus();
        console.log('[DownloadService] QUEUE STATUS after configure — active:', status.activeCount, 'pending:', status.pendingCount, 'completed:', status.completedCount, 'failed:', status.failedCount);
      } catch {}
    } catch (e) {
      console.error('[DownloadService] Failed to configure DownloadManager:', e);
    }
  }

  setupCallbacks() {
    if (this.callbacksSetup) return;
    this.callbacksSetup = true;

    try {
      DownloadManager.onDownloadComplete((downloaded) => {
        const trackId = downloaded.trackId;
        const localPath = downloaded.localPath;
        const fileSize = downloaded.fileSize;
        const artworkPath = downloaded.localArtworkPath || undefined;

        this.activeCount = Math.max(0, this.activeCount - 1);

        let qStatus: any;
        try { qStatus = DownloadManager.getQueueStatus(); } catch {}
        console.log('[DownloadService] DOWNLOAD COMPLETE —', trackId, fileSize, 'bytes, active:', this.activeCount, 'queueRemaining:', this.downloadQueue.length, 'nitro active:', qStatus?.activeCount, 'pending:', qStatus?.pendingCount);

        const originalTrack = this.trackMetaMap.get(trackId);
        const lyricsUri = this.lyricsMap.get(trackId);

        let coverArtUri = artworkPath;
        if (!coverArtUri && originalTrack?.coverArt) {
          getCoverArtUrl(originalTrack.coverArt, 500).then((url) => {
            this.upsertCachedTrack(trackId, originalTrack, localPath, fileSize, url, lyricsUri);
          }).catch(() => {
            this.upsertCachedTrack(trackId, originalTrack, localPath, fileSize, undefined, lyricsUri);
          });
        } else {
          this.upsertCachedTrack(trackId, originalTrack, localPath, fileSize, coverArtUri, lyricsUri);
        }

        this.processQueue();
      });

      DownloadManager.onDownloadStateChange((_downloadId, trackId, state, error) => {
        console.log('[DownloadService] STATE CHANGE —', trackId, '→', state, 'active:', this.activeCount, 'queueRemaining:', this.downloadQueue.length);

        if (state === 'failed') {
          this.activeCount = Math.max(0, this.activeCount - 1);
          console.error('[DownloadService] Download failed:', trackId, error?.message);
          const groupIds = this.trackGroupMap.get(trackId);
          if (groupIds) {
            for (const gid of groupIds) {
              const group = this.pendingGroups.get(gid);
              if (group) {
                group.failedTracks++;
                this.checkGroupComplete(gid);
              }
            }
          }
          this.trackMetaMap.delete(trackId);
          this.lyricsMap.delete(trackId);
          this.trackGroupMap.delete(trackId);
          this.trackCoverArtMap.delete(trackId);
          this.processQueue();
        }
        if (state === 'cancelled') {
          this.activeCount = Math.max(0, this.activeCount - 1);
          const groupIds = this.trackGroupMap.get(trackId);
          if (groupIds) {
            for (const gid of groupIds) {
              const group = this.pendingGroups.get(gid);
              if (group) {
                group.failedTracks++;
              }
            }
          }
          this.trackMetaMap.delete(trackId);
          this.lyricsMap.delete(trackId);
          this.trackGroupMap.delete(trackId);
          this.trackCoverArtMap.delete(trackId);
          this.processQueue();
        }
      });

      console.log('[DownloadService] Nitro download callbacks registered');
    } catch (e) {
      console.error('[DownloadService] Failed to setup callbacks:', e);
    }
  }

  private upsertCachedTrack(
    trackId: string,
    originalTrack: Track | undefined,
    localPath: string,
    fileSize: number,
    coverArtUri?: string,
    lyricsUri?: string,
  ) {
    const store = useDownloadStore.getState();
    if (store.isTrackDownloaded(trackId)) return;

    const track: Track = originalTrack || {
      id: trackId,
      title: trackId,
      duration: 0,
    } as Track;

    const cached: CachedDownloadedTrack = {
      track,
      localUri: localPath,
      coverArtUri,
      lyricsUri,
      downloadedAt: Date.now(),
      size: fileSize,
      bitRate: track.bitRate,
      suffix: track.suffix,
    };

    store.upsertTrack(cached);

    const groupIds = this.trackGroupMap.get(trackId);
    if (groupIds) {
      for (const gid of groupIds) {
        const group = this.pendingGroups.get(gid);
        if (group) {
          group.completedTracks++;
          this.checkGroupComplete(gid);
        }
      }
    }
  }

  private async buildDownloadTrackItem(track: Track): Promise<TrackItem> {
    const url = await getDownloadUrl(track.id);
    console.log('[DownloadService] Built TrackItem for', track.title, '- URL length:', url?.length ?? 0);
    let artwork: string | undefined;
    if (track.coverArt) {
      try { artwork = await getCoverArtUrl(track.coverArt, 500); } catch {}
    }
    return {
      id: track.id,
      title: track.title,
      artist: getTrackArtistString(track),
      album: track.album || 'Unknown Album',
      duration: track.duration,
      url,
      artwork,
      extraPayload: {
        bitRate: track.bitRate ?? 0,
        suffix: track.suffix ?? '',
        _trackData: JSON.stringify(track),
      },
    };
  }

  private processQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;

    const maxConcurrent = useSettingsStore.getState().maxConcurrentDownloads || 3;

    const startNext = () => {
      while (this.activeCount < maxConcurrent && this.downloadQueue.length > 0) {
        if (this.checkStorageLimit()) {
          console.log('[DownloadService] Storage limit hit — dropping', this.downloadQueue.length, 'queued tracks');
          for (const dropped of this.downloadQueue) {
            const groupIds = this.trackGroupMap.get(dropped.track.id);
            if (groupIds) {
              for (const gid of groupIds) {
                const group = this.pendingGroups.get(gid);
                if (group) {
                  group.failedTracks++;
                  this.checkGroupComplete(gid);
                }
              }
            }
          }
          this.downloadQueue = [];
          break;
        }

        const item = this.downloadQueue.shift()!;
        this.activeCount++;
        console.log('[DownloadService] STARTING —', item.track.title, 'active:', this.activeCount, '/', maxConcurrent, 'remaining:', this.downloadQueue.length);

        this.buildDownloadTrackItem(item.track).then((trackItem) => {
          DownloadManager.downloadTrack(trackItem).then((downloadId) => {
            console.log('[DownloadService] downloadTrack resolved —', item.track.title, 'downloadId:', downloadId);
          }).catch((e) => {
            console.error('[DownloadService] downloadTrack REJECTED —', item.track.title, e);
            this.activeCount = Math.max(0, this.activeCount - 1);
            const groupIds = this.trackGroupMap.get(item.track.id);
            if (groupIds) {
              for (const gid of groupIds) {
                const group = this.pendingGroups.get(gid);
                if (group) {
                  group.failedTracks++;
                  this.checkGroupComplete(gid);
                }
              }
            }
            startNext();
          });
        }).catch((e) => {
          console.error('[DownloadService] buildTrackItem FAILED —', item.track.title, e);
          this.activeCount = Math.max(0, this.activeCount - 1);
          const groupIds = this.trackGroupMap.get(item.track.id);
          if (groupIds) {
            for (const gid of groupIds) {
              const group = this.pendingGroups.get(gid);
              if (group) {
                group.failedTracks++;
                this.checkGroupComplete(gid);
              }
            }
          }
          startNext();
        });
      }
    };

    startNext();

    console.log('[DownloadService] processQueue done — active:', this.activeCount, '/', maxConcurrent, 'remaining:', this.downloadQueue.length);
    this.processingQueue = false;
  }

  private async downloadLyrics(trackId: string): Promise<string | undefined> {
    try {
      const response = await getLyricsBySongId(trackId);
      let lyricsData = null;
      if (response.lyricsList?.structuredLyrics?.length) {
        lyricsData = response.lyricsList.structuredLyrics[0];
      } else if (response.lyrics) {
        lyricsData = response.lyrics;
      }
      if (!lyricsData) return undefined;
      const dir = `${FileSystem.documentDirectory}metadata/`;
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const localPath = `${dir}lyrics_${trackId}.json`;
      await FileSystem.writeAsStringAsync(localPath, JSON.stringify(lyricsData));
      return localPath;
    } catch {
      return undefined;
    }
  }

  private async shouldBlockDownload(): Promise<boolean> {
    const { wifiOnlyDownloads } = useSettingsStore.getState();
    if (!wifiOnlyDownloads) return false;
    const networkState = await Network.getNetworkStateAsync();
    return networkState.type !== Network.NetworkStateType.WIFI;
  }

  private checkStorageLimit(): boolean {
    const { storageLimit } = useSettingsStore.getState();
    const usedMB = useDownloadStore.getState().totalStorageUsed / (1024 * 1024);
    return usedMB >= storageLimit;
  }

  async downloadTrack(track: Track): Promise<void> {
    if (useDownloadStore.getState().isTrackDownloaded(track.id)) return;
    if (await this.shouldBlockDownload()) {
      throw new Error('WiFi-only downloads is enabled. Connect to WiFi to download.');
    }

    this.configure();
    this.setupCallbacks();

    this.trackMetaMap.set(track.id, track);

    this.downloadLyrics(track.id).then((lyricsUri) => {
      if (lyricsUri) this.lyricsMap.set(track.id, lyricsUri);
    }).catch(() => {});

    console.log('[DownloadService] Enqueuing single track:', track.title, 'active:', this.activeCount, 'queued:', this.downloadQueue.length);
    this.downloadQueue.push({ track, groupId: '' });
    this.processQueue();
  }

  async downloadAlbum(album: Album): Promise<void> {
    if (await this.shouldBlockDownload()) {
      throw new Error('WiFi-only downloads is enabled. Connect to WiFi to download.');
    }

    this.configure();
    this.setupCallbacks();

    const response = await getAlbum(album.id);
    const fullAlbum = response.album;
    const tracks = fullAlbum.song || [];
    if (tracks.length === 0) return;

    const store = useDownloadStore.getState();
    const newTracks = tracks.filter(t => !store.isTrackDownloaded(t.id));
    if (newTracks.length === 0) return;

    if (this.checkStorageLimit()) {
      console.log('[DownloadService] Storage limit hit, skipping album:', album.name);
      return;
    }

    let coverArtUri: string | undefined;
    if (album.coverArt) {
      try { coverArtUri = await getCoverArtUrl(album.coverArt, 500); } catch {}
    }

    const groupId = `album_${album.id}`;

    this.pendingGroups.set(groupId, {
      type: 'album',
      name: album.name || fullAlbum.name,
      totalTracks: newTracks.length,
      completedTracks: 0,
      failedTracks: 0,
      coverArtUri,
      metadata: response,
      albumOrPlaylist: album,
    });

    for (const track of newTracks) {
      this.trackMetaMap.set(track.id, track);
      const existing = this.trackGroupMap.get(track.id);
      if (existing) { existing.add(groupId); } else { this.trackGroupMap.set(track.id, new Set([groupId])); }
      if (coverArtUri) this.trackCoverArtMap.set(track.id, coverArtUri);
      this.downloadLyrics(track.id).then((lyricsUri) => {
        if (lyricsUri) this.lyricsMap.set(track.id, lyricsUri);
      }).catch(() => {});
    }

    console.log('[DownloadService] Enqueuing album —', album.name, 'tracks:', newTracks.length, 'active:', this.activeCount, 'queued:', this.downloadQueue.length);
    for (const track of newTracks) {
      this.downloadQueue.push({ track, groupId });
    }
    this.processQueue();
  }

  async downloadPlaylist(playlist: Playlist): Promise<void> {
    if (useDownloadStore.getState().isPlaylistDownloaded(playlist.id)) return;
    if (await this.shouldBlockDownload()) {
      throw new Error('WiFi-only downloads is enabled. Connect to WiFi to download.');
    }

    this.configure();
    this.setupCallbacks();

    const response = await getPlaylist(playlist.id);
    const fullPlaylist = response.playlist;
    const tracks = fullPlaylist.entry || [];
    if (tracks.length === 0) return;

    let coverArtUri: string | undefined;
    const coverArtId = playlist.coverArt || tracks[0]?.coverArt;
    if (coverArtId) {
      try { coverArtUri = await getCoverArtUrl(coverArtId, 500); } catch {}
    }

    const groupId = `playlist_${playlist.id}`;
    const store = useDownloadStore.getState();
    const newTracks = tracks.filter(t => !store.isTrackDownloaded(t.id));
    if (newTracks.length === 0) return;

    this.pendingGroups.set(groupId, {
      type: 'playlist',
      name: playlist.name,
      totalTracks: newTracks.length,
      completedTracks: 0,
      failedTracks: 0,
      coverArtUri,
      metadata: response,
      albumOrPlaylist: playlist,
    });

    for (const track of newTracks) {
      this.trackMetaMap.set(track.id, track);
      const existing = this.trackGroupMap.get(track.id);
      if (existing) { existing.add(groupId); } else { this.trackGroupMap.set(track.id, new Set([groupId])); }
      if (coverArtUri) this.trackCoverArtMap.set(track.id, coverArtUri);
      this.downloadLyrics(track.id).then((lyricsUri) => {
        if (lyricsUri) this.lyricsMap.set(track.id, lyricsUri);
      }).catch(() => {});
    }

    console.log('[DownloadService] Enqueuing playlist —', playlist.name, 'tracks:', newTracks.length, 'active:', this.activeCount, 'queued:', this.downloadQueue.length);
    for (const track of newTracks) {
      this.downloadQueue.push({ track, groupId });
    }
    this.processQueue();
  }

  private checkGroupComplete(groupId: string) {
    const group = this.pendingGroups.get(groupId);
    if (!group) return;
    if (group.completedTracks + group.failedTracks >= group.totalTracks) {
      this.finalizeGroup(groupId, group);
    }
  }

  private finalizeGroup(groupId: string, group: PendingGroup) {
    this.pendingGroups.delete(groupId);
    if (group.completedTracks === 0) return;

    const store = useDownloadStore.getState();
    const cachedTracks: CachedDownloadedTrack[] = [];

    const songs = group.type === 'album'
      ? group.metadata?.album?.song || []
      : group.metadata?.playlist?.entry || [];

    for (const song of songs) {
      const cached = store.getDownloadedTrack(song.id);
      if (cached) cachedTracks.push(cached);
    }

    const totalSize = cachedTracks.reduce((sum, t) => sum + t.size, 0);

    if (group.type === 'album') {
      const albumObj: Album = group.albumOrPlaylist as Album;
      const albumData: CachedDownloadedAlbum = {
        album: albumObj,
        tracks: cachedTracks,
        coverArtUri: group.coverArtUri,
        downloadedAt: Date.now(),
        totalSize,
        metadata: group.metadata,
      };
      store.upsertAlbum(albumData);
    } else {
      const playlistObj: Playlist = group.albumOrPlaylist as Playlist;
      const playlistData: CachedDownloadedPlaylist = {
        playlist: playlistObj,
        tracks: cachedTracks,
        coverArtUri: group.coverArtUri,
        downloadedAt: Date.now(),
        totalSize,
        metadata: group.metadata,
      };
      store.upsertPlaylist(playlistData);
    }

    console.log('[DownloadService] Group complete:', group.name, `${group.completedTracks}/${group.totalTracks} tracks`);
    this.saveGroupMetadata();
  }

  private async saveGroupMetadata() {
    try {
      const store = useDownloadStore.getState();
      const data = {
        albums: store.downloadedAlbums,
        playlists: store.downloadedPlaylists,
      };
      const dir = `${FileSystem.documentDirectory}metadata/`;
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      await FileSystem.writeAsStringAsync(this.GROUPS_FILE, JSON.stringify(data));
    } catch (e) {
      console.error('[DownloadService] Failed to save group metadata:', e);
    }
  }

  private async loadGroupMetadata(): Promise<{
    albums: Record<string, CachedDownloadedAlbum>;
    playlists: Record<string, CachedDownloadedPlaylist>;
  } | null> {
    try {
      const info = await FileSystem.getInfoAsync(this.GROUPS_FILE);
      if (!info.exists) return null;
      const content = await FileSystem.readAsStringAsync(this.GROUPS_FILE);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async cancelDownload(downloadId: string): Promise<void> {
    try {
      await DownloadManager.cancelDownload(downloadId);
    } catch (e) {
      console.error('[DownloadService] Failed to cancel download:', e);
    }
  }

  async deleteTrack(trackId: string): Promise<void> {
    const store = useDownloadStore.getState();
    const cached = store.getDownloadedTrack(trackId);

    try { await DownloadManager.deleteDownloadedTrack(trackId); } catch (e) {
      console.error('[DownloadService] Failed to delete track from nitro:', e);
    }

    if (cached?.lyricsUri) {
      try { await FileSystem.deleteAsync(cached.lyricsUri, { idempotent: true }); } catch {}
    }

    store.removeTrack(trackId);
  }

  async deleteAlbum(albumId: string): Promise<void> {
    const store = useDownloadStore.getState();
    const album = store.getDownloadedAlbum(albumId);
    if (!album) return;

    const albumTrackIds = new Set(album.tracks.map(t => t.track.id));
    const sharedTrackIds = this.findSharedTrackIds(albumTrackIds, albumId, undefined);

    for (const t of album.tracks) {
      if (!sharedTrackIds.has(t.track.id)) {
        try { await DownloadManager.deleteDownloadedTrack(t.track.id); } catch {}
      }
      if (t.lyricsUri) {
        try { await FileSystem.deleteAsync(t.lyricsUri, { idempotent: true }); } catch {}
      }
    }

    try { await DownloadManager.deleteDownloadedPlaylist(`album_${albumId}`); } catch {}

    store.removeAlbum(albumId);
    this.saveGroupMetadata();
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    const store = useDownloadStore.getState();
    const playlist = store.getDownloadedPlaylist(playlistId);
    if (!playlist) return;

    const playlistTrackIds = new Set(playlist.tracks.map(t => t.track.id));
    const sharedTrackIds = this.findSharedTrackIds(playlistTrackIds, undefined, playlistId);

    for (const t of playlist.tracks) {
      if (!sharedTrackIds.has(t.track.id)) {
        try { await DownloadManager.deleteDownloadedTrack(t.track.id); } catch {}
      }
      if (t.lyricsUri) {
        try { await FileSystem.deleteAsync(t.lyricsUri, { idempotent: true }); } catch {}
      }
    }

    try { await DownloadManager.deleteDownloadedPlaylist(`playlist_${playlistId}`); } catch {}

    store.removePlaylist(playlistId);
    this.saveGroupMetadata();
  }

  private findSharedTrackIds(
    trackIds: Set<string>,
    excludeAlbumId?: string,
    excludePlaylistId?: string,
  ): Set<string> {
    const store = useDownloadStore.getState();
    const shared = new Set<string>();

    for (const [id, album] of Object.entries(store.downloadedAlbums)) {
      if (excludeAlbumId && id === excludeAlbumId) continue;
      for (const t of album.tracks) {
        if (trackIds.has(t.track.id)) shared.add(t.track.id);
      }
    }

    for (const [id, playlist] of Object.entries(store.downloadedPlaylists)) {
      if (excludePlaylistId && id === excludePlaylistId) continue;
      for (const t of playlist.tracks) {
        if (trackIds.has(t.track.id)) shared.add(t.track.id);
      }
    }

    return shared;
  }

  getTotalStorageUsed(): number {
    return useDownloadStore.getState().totalStorageUsed;
  }

  getActiveDownloadCount(): number {
    return this.activeCount + this.downloadQueue.length;
  }

  getTrackDownloadMeta(trackId: string): { title: string; artist?: string; coverArtUri?: string; groupId?: string } | undefined {
    const track = this.trackMetaMap.get(trackId);
    if (!track) return undefined;
    return {
      title: track.title,
      artist: track.artist || undefined,
      coverArtUri: this.trackCoverArtMap.get(trackId) || undefined,
      groupId: this.trackGroupMap.get(trackId)?.values().next().value || undefined,
    };
  }

  getGroupInfo(groupId: string): PendingGroupInfo | undefined {
    const group = this.pendingGroups.get(groupId);
    if (!group) return undefined;
    return {
      id: groupId,
      type: group.type,
      name: group.name,
      completedTracks: group.completedTracks,
      totalTracks: group.totalTracks,
      failedTracks: group.failedTracks,
      coverArtUri: group.coverArtUri,
    };
  }

  getPendingGroups(): PendingGroupInfo[] {
    const result: PendingGroupInfo[] = [];
    for (const [id, group] of this.pendingGroups.entries()) {
      result.push({
        id,
        type: group.type,
        name: group.name,
        completedTracks: group.completedTracks,
        totalTracks: group.totalTracks,
        failedTracks: group.failedTracks,
        coverArtUri: group.coverArtUri,
      });
    }
    return result;
  }

  getQueuedDownloads(): QueuedTrackInfo[] {
    return this.downloadQueue.map(q => ({
      title: q.track.title,
      artist: q.track.artist || '',
      groupId: q.groupId,
    }));
  }

  async cancelAllQueuedDownloads(): Promise<void> {
    console.log('[DownloadService] Cancel ALL — clearing JS queue:', this.downloadQueue.length, 'active:', this.activeCount);

    this.downloadQueue = [];
    this.activeCount = 0;

    for (const [, group] of this.pendingGroups.entries()) {
      const remaining = group.totalTracks - group.completedTracks - group.failedTracks;
      group.failedTracks += remaining;
    }

    try {
      await DownloadManager.cancelAllDownloads();
    } catch {}

    this.pendingGroups.clear();
    this.trackMetaMap.clear();
    this.lyricsMap.clear();
    this.trackGroupMap.clear();
    this.trackCoverArtMap.clear();

    console.log('[DownloadService] Cancel ALL complete');
  }

  async downloadArtistDiscography(artistId: string): Promise<void> {
    if (await this.shouldBlockDownload()) {
      throw new Error('WiFi-only downloads is enabled. Connect to WiFi to download.');
    }

    this.configure();
    this.setupCallbacks();

    const response = await getArtist(artistId);
    const albums = response.artist.album || [];
    if (albums.length === 0) return;

    console.log('[DownloadService] Downloading artist discography:', response.artist.name, albums.length, 'albums');

    for (const album of albums) {
      this.downloadAlbum(album).catch(err => {
        console.error(`[DownloadService] Artist discography failed for ${album.name}:`, err);
      });
    }
  }

  async clearAllDownloads(): Promise<void> {
    try {
      await DownloadManager.cancelAllDownloads();
    } catch {}
    try {
      await DownloadManager.deleteAllDownloads();
    } catch (e) {
      console.error('[DownloadService] Failed to clear all downloads from nitro:', e);
    }

    const metadataDir = `${FileSystem.documentDirectory}metadata/`;
    try {
      const dirInfo = await FileSystem.getInfoAsync(metadataDir);
      if (dirInfo.exists) await FileSystem.deleteAsync(metadataDir);
    } catch {}

    this.downloadQueue = [];
    this.activeCount = 0;
    this.pendingGroups.clear();
    this.trackMetaMap.clear();
    this.lyricsMap.clear();
    useDownloadStore.getState().clearAll();
  }

  async downloadLibrary(): Promise<{ queued: number; skipped: number; updated: number }> {
    if (await this.shouldBlockDownload()) {
      throw new Error('WiFi-only downloads is enabled. Connect to WiFi to download.');
    }

    let allServerAlbums: Album[] = [];
    let offset = 0;
    const batchSize = 500;

    while (true) {
      const response = await getAlbumList2('alphabeticalByName', batchSize, offset);
      const albums = response.albumList2.album;
      if (albums.length === 0) break;
      allServerAlbums = allServerAlbums.concat(albums);
      if (albums.length < batchSize) break;
      offset += batchSize;
    }

    const store = useDownloadStore.getState();
    let queued = 0;
    let updated = 0;

    for (const album of allServerAlbums) {
      const existing = store.getDownloadedAlbum(album.id);
      if (!existing) {
        queued++;
        this.downloadAlbum(album).catch(err => {
          console.error(`[DownloadService] Library download failed for ${album.name}:`, err);
        });
      } else if (album.songCount !== existing.tracks.length) {
        updated++;
        this.downloadAlbum(album).catch(err => {
          console.error(`[DownloadService] Library update failed for ${album.name}:`, err);
        });
      }
    }

    const skipped = allServerAlbums.length - queued - updated;
    console.log('[DownloadService] downloadLibrary — queued:', queued, 'updated:', updated, 'skipped:', skipped, 'total albums:', allServerAlbums.length);
    return { queued, skipped, updated };
  }

  async hydrateFromNitro(): Promise<void> {
    try {
      this.configure();

      const nitroTracks = await DownloadManager.getAllDownloadedTracks();
      const nitroTrackIds = new Set(nitroTracks.map(nt => nt.trackId));

      const cachedTracks: Record<string, CachedDownloadedTrack> = {};

      for (const nt of nitroTracks) {
        const trackDataStr = nt.originalTrack.extraPayload?._trackData as string | undefined;
        let track: Track;
        if (trackDataStr) {
          try { track = JSON.parse(trackDataStr); } catch { track = nitroTrackToTrack(nt); }
        } else {
          track = nitroTrackToTrack(nt);
        }

        let coverArtUri: string | undefined = nt.localArtworkPath || undefined;
        if (!coverArtUri && track.coverArt) {
          try { coverArtUri = await getCoverArtUrl(track.coverArt, 500); } catch {}
        }

        cachedTracks[nt.trackId] = {
          track,
          localUri: nt.localPath,
          coverArtUri,
          downloadedAt: nt.downloadedAt,
          size: nt.fileSize,
          bitRate: track.bitRate || (nt.originalTrack.extraPayload?.bitRate as number | undefined),
          suffix: track.suffix || (nt.originalTrack.extraPayload?.suffix as string | undefined),
        };
      }

      let cachedAlbums: Record<string, CachedDownloadedAlbum> = {};
      let cachedPlaylists: Record<string, CachedDownloadedPlaylist> = {};

      const savedGroups = await this.loadGroupMetadata();
      if (savedGroups) {
        for (const [albumId, album] of Object.entries(savedGroups.albums)) {
          const validTracks = album.tracks.filter(t => nitroTrackIds.has(t.track.id));
          if (validTracks.length > 0) {
            let coverArtUri = album.coverArtUri;
            if (!coverArtUri && album.album.coverArt) {
              try { coverArtUri = await getCoverArtUrl(album.album.coverArt, 500); } catch {}
            }
            cachedAlbums[albumId] = {
              ...album,
              tracks: validTracks.map(t => cachedTracks[t.track.id] || t),
              coverArtUri,
              totalSize: validTracks.reduce((sum, t) => sum + (cachedTracks[t.track.id]?.size || t.size), 0),
            };
          }
        }

        for (const [playlistId, playlist] of Object.entries(savedGroups.playlists)) {
          const validTracks = playlist.tracks.filter(t => nitroTrackIds.has(t.track.id));
          if (validTracks.length > 0) {
            let coverArtUri = playlist.coverArtUri;
            if (!coverArtUri && playlist.playlist.coverArt) {
              try { coverArtUri = await getCoverArtUrl(playlist.playlist.coverArt, 500); } catch {}
            }
            cachedPlaylists[playlistId] = {
              ...playlist,
              tracks: validTracks.map(t => cachedTracks[t.track.id] || t),
              coverArtUri,
              totalSize: validTracks.reduce((sum, t) => sum + (cachedTracks[t.track.id]?.size || t.size), 0),
            };
          }
        }
      }

      let totalStorageUsed = 0;
      const countedIds = new Set<string>();
      for (const t of Object.values(cachedTracks)) {
        if (!countedIds.has(t.track.id)) {
          countedIds.add(t.track.id);
          totalStorageUsed += t.size;
        }
      }

      useDownloadStore.setState({
        downloadedTracks: cachedTracks,
        downloadedAlbums: cachedAlbums,
        downloadedPlaylists: cachedPlaylists,
        totalStorageUsed,
        isHydrated: true,
      });

      console.log('[DownloadService] Hydrated from nitro:',
        Object.keys(cachedTracks).length, 'tracks,',
        Object.keys(cachedAlbums).length, 'albums,',
        Object.keys(cachedPlaylists).length, 'playlists');
    } catch (e) {
      console.error('[DownloadService] Failed to hydrate from nitro:', e);
      useDownloadStore.getState().setHydrated(true);
    }
  }
}

function nitroTrackToTrack(nt: { trackId: string; originalTrack: TrackItem; fileSize: number }): Track {
  const ot = nt.originalTrack;
  return {
    id: nt.trackId,
    title: ot.title,
    album: ot.album !== 'Unknown Album' ? ot.album : undefined,
    artist: ot.artist || undefined,
    duration: ot.duration,
    bitRate: ot.extraPayload?.bitRate as number | undefined,
    suffix: ot.extraPayload?.suffix as string | undefined,
  } as Track;
}

export const downloadService = DownloadService.getInstance();
