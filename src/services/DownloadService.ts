/**
 * Dino Music App - Download Service
 * Manages track/album/playlist downloads with proper concurrent track-level processing
 */

import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import { Track, Album, Playlist, AlbumWithSongsID3 } from '../api/opensubsonic/types';
import { useDownloadStore, DownloadedTrack } from '../stores/downloadStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getDownloadUrl, getCoverArtUrl } from '../api/opensubsonic/streaming';
import { getLyricsBySongId } from '../api/opensubsonic/lyrics';
import { getAlbum, getAlbumList2 } from '../api/opensubsonic/albums';
import { getPlaylist } from '../api/opensubsonic/playlists';
import { DOWNLOAD_CONFIG } from '../config/constants';

interface TrackQueueItem {
  track: Track;
  groupId: string | null;
}

interface DownloadGroup {
  type: 'album' | 'playlist';
  downloadId: string;
  name: string;
  totalTracks: number;
  completedTracks: DownloadedTrack[];
  failedTracks: string[];
  coverArtUri?: string;
  metadataPromise: Promise<any>;
  resolve: () => void;
  reject: (error: any) => void;
}

export class DownloadService {
  private static instance: DownloadService;
  private activeDownloads = new Map<string, FileSystem.DownloadResumable>();
  private trackToGroup = new Map<string, string>();
  private trackQueue: TrackQueueItem[] = [];
  private groups = new Map<string, DownloadGroup>();
  private cancelledGroups = new Set<string>();
  private activeCount = 0;
  private processingScheduled = false;
  private lastProgressUpdate = new Map<string, { time: number; bytes: number }>();
  private readonly PROGRESS_THROTTLE_MS = 2000;

  private constructor() {}

  static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService();
    }
    return DownloadService.instance;
  }

  private getDownloadDirectory(): string {
    return `${FileSystem.documentDirectory}downloads/`;
  }

  private getMetadataDirectory(): string {
    return `${FileSystem.documentDirectory}metadata/`;
  }

  private getTrackFilePath(trackId: string): string {
    return `${this.getDownloadDirectory()}${trackId}.audio`;
  }

  private getCoverArtFilePath(id: string): string {
    return `${this.getMetadataDirectory()}cover_${id}.jpg`;
  }

  private getLyricsFilePath(trackId: string): string {
    return `${this.getMetadataDirectory()}lyrics_${trackId}.json`;
  }

  private async ensureDirectoriesExist(): Promise<void> {
    const dirs = [this.getDownloadDirectory(), this.getMetadataDirectory()];
    for (const dir of dirs) {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    }
  }

  private getStorageUsageMB(): number {
    return useDownloadStore.getState().totalStorageUsed / (1024 * 1024);
  }

  private async shouldBlockDownload(): Promise<boolean> {
    const { wifiOnlyDownloads } = useSettingsStore.getState();
    if (!wifiOnlyDownloads) return false;
    const networkState = await Network.getNetworkStateAsync();
    return networkState.type !== Network.NetworkStateType.WIFI;
  }

  private checkStorageLimit(): boolean {
    const { storageLimit } = useSettingsStore.getState();
    return this.getStorageUsageMB() >= storageLimit;
  }

  private async downloadCoverArt(coverArtId: string): Promise<string | undefined> {
    try {
      const coverArtUrl = await getCoverArtUrl(coverArtId, 500);
      const localPath = this.getCoverArtFilePath(coverArtId);
      const download = FileSystem.createDownloadResumable(coverArtUrl, localPath);
      const result = await download.downloadAsync();
      return result?.uri;
    } catch {
      return undefined;
    }
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
      const localPath = this.getLyricsFilePath(trackId);
      await FileSystem.writeAsStringAsync(localPath, JSON.stringify(lyricsData));
      return localPath;
    } catch {
      return undefined;
    }
  }

  private scheduleProcessing(): void {
    if (this.processingScheduled) return;
    this.processingScheduled = true;
    setTimeout(() => {
      this.processingScheduled = false;
      this.processQueue();
    }, 0);
  }

  private processQueue(): void {
    const maxConcurrent = useSettingsStore.getState().maxConcurrentDownloads;

    while (this.trackQueue.length > 0 && this.activeCount < maxConcurrent) {
      const item = this.trackQueue.shift()!;
      this.activeCount++;

      this.downloadQueuedTrack(item.track, item.groupId)
        .catch((error) => {
          console.error(`[DownloadService] Track ${item.track.id} failed:`, error);
        })
        .finally(() => {
          this.activeCount--;
          this.scheduleProcessing();
        });
    }
  }

  private async downloadQueuedTrack(track: Track, groupId: string | null, retryCount = 0): Promise<void> {
    if (groupId && this.cancelledGroups.has(groupId)) return;

    const store = useDownloadStore.getState();

    if (store.isTrackDownloaded(track.id)) {
      if (groupId && !this.cancelledGroups.has(groupId)) {
        const existing = store.getDownloadedTrack(track.id);
        if (existing) this.handleTrackComplete(groupId, existing);
      }
      return;
    }

    if (this.checkStorageLimit()) {
      if (groupId && !this.cancelledGroups.has(groupId)) this.handleTrackFailed(groupId, track.title);
      return;
    }

    try {
      await this.ensureDirectoriesExist();

      if (groupId && this.cancelledGroups.has(groupId)) return;

      const downloadUrl = await getDownloadUrl(track.id);
      const fileUri = this.getTrackFilePath(track.id);
      const coverArtUri = track.coverArt ? await this.downloadCoverArt(track.coverArt) : undefined;

      const dlId = useDownloadStore.getState().addDownload(track.id, 'track', 0);
      useDownloadStore.getState().updateDownloadMeta(dlId, {
        title: track.title,
        artist: track.artist,
        coverArtUri,
      });

      if (groupId) this.trackToGroup.set(dlId, groupId);

      const resumable = FileSystem.createDownloadResumable(
        downloadUrl,
        fileUri,
        {},
        (dp) => {
          const written = dp.totalBytesWritten;
          const expected = dp.totalBytesExpectedToWrite;
          if (expected > 0) {
            const now = Date.now();
            const last = this.lastProgressUpdate.get(dlId);
            if (!last || now - last.time >= this.PROGRESS_THROTTLE_MS || Math.abs(written - last.bytes) > expected * 0.1) {
              this.lastProgressUpdate.set(dlId, { time: now, bytes: written });
              useDownloadStore.getState().updateProgress(dlId, written, undefined, expected);
            }
          }
        }
      );

      this.activeDownloads.set(dlId, resumable);
      const result = await resumable.downloadAsync();

      if (groupId && this.cancelledGroups.has(groupId)) {
        this.activeDownloads.delete(dlId);
        this.lastProgressUpdate.delete(dlId);
        useDownloadStore.getState().cancelDownload(dlId);
        try { await FileSystem.deleteAsync(fileUri, { idempotent: true }); } catch {}
        return;
      }

      if (!result) throw new Error('Download failed: No result');

      const fileInfo = await FileSystem.getInfoAsync(result.uri);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
      const lyricsUri = await this.downloadLyrics(track.id);

      const downloadedTrack: DownloadedTrack = {
        track,
        localUri: result.uri,
        coverArtUri,
        lyricsUri,
        downloadedAt: Date.now(),
        size: fileSize,
      };

      useDownloadStore.getState().markTrackDownloaded(track, result.uri, fileSize, coverArtUri, lyricsUri);
      useDownloadStore.getState().completeDownload(dlId);
      this.activeDownloads.delete(dlId);
      this.lastProgressUpdate.delete(dlId);

      if (groupId && !this.cancelledGroups.has(groupId)) {
        this.handleTrackComplete(groupId, downloadedTrack);
      }
    } catch (error) {
      if (groupId && this.cancelledGroups.has(groupId)) return;

      if (retryCount < DOWNLOAD_CONFIG.RETRY_ATTEMPTS) {
        const delay = DOWNLOAD_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retryCount);
        await new Promise(r => setTimeout(r, delay));
        return this.downloadQueuedTrack(track, groupId, retryCount + 1);
      }

      const downloads = useDownloadStore.getState().activeDownloads;
      const dlId = Object.keys(downloads).find(id => downloads[id]?.itemId === track.id);
      if (dlId) {
        useDownloadStore.getState().failDownload(dlId, error instanceof Error ? error.message : 'Unknown error');
        this.activeDownloads.delete(dlId);
        this.lastProgressUpdate.delete(dlId);
      }

      if (groupId) {
        this.handleTrackFailed(groupId, track.title);
      }
    }
  }

  private handleTrackComplete(groupId: string, track: DownloadedTrack): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    group.completedTracks.push(track);
    useDownloadStore.getState().updateProgress(group.downloadId, 0, group.completedTracks.length);

    const totalProcessed = group.completedTracks.length + group.failedTracks.length;
    if (totalProcessed >= group.totalTracks) {
      this.finalizeGroup(group);
    }
  }

  private handleTrackFailed(groupId: string, trackTitle: string): void {
    const group = this.groups.get(groupId);
    if (!group) return;

    group.failedTracks.push(trackTitle);

    const totalProcessed = group.completedTracks.length + group.failedTracks.length;
    if (totalProcessed >= group.totalTracks) {
      this.finalizeGroup(group);
    }
  }

  private async finalizeGroup(group: DownloadGroup): Promise<void> {
    try {
      if (group.completedTracks.length === 0) {
        useDownloadStore.getState().failDownload(group.downloadId, 'All tracks failed to download');
        group.reject(new Error('All tracks failed'));
        return;
      }

      const metadata = await group.metadataPromise;

      if (group.type === 'album') {
        const fullAlbum = metadata?.album;
        if (fullAlbum) {
          useDownloadStore.getState().markAlbumDownloaded(fullAlbum, group.completedTracks, metadata, group.coverArtUri);
        }
      } else {
        const fullPlaylist = metadata?.playlist;
        if (fullPlaylist) {
          useDownloadStore.getState().markPlaylistDownloaded(fullPlaylist, group.completedTracks, metadata, group.coverArtUri);
        }
      }

      useDownloadStore.getState().completeDownload(group.downloadId);

      if (group.failedTracks.length > 0) {
        const { showToast } = await import('../stores/toastStore').then(m => m.useToastStore.getState());
        showToast(`${group.name}: ${group.failedTracks.length} track(s) failed`, 'error');
      }

      group.resolve();
    } catch (error) {
      useDownloadStore.getState().failDownload(group.downloadId, error instanceof Error ? error.message : 'Unknown error');
      group.reject(error);
    } finally {
      this.groups.delete(group.downloadId);
    }
  }

  async downloadTrack(track: Track): Promise<void> {
    if (useDownloadStore.getState().isTrackDownloaded(track.id)) return;
    if (await this.shouldBlockDownload()) {
      throw new Error('WiFi-only downloads is enabled. Connect to WiFi to download.');
    }
    if (this.checkStorageLimit()) {
      throw new Error('Storage limit reached. Delete some downloads or increase limit in settings.');
    }

    this.trackQueue.push({ track, groupId: null });
    this.scheduleProcessing();
  }

  async downloadAlbum(album: Album): Promise<void> {
    if (await this.shouldBlockDownload()) {
      throw new Error('WiFi-only downloads is enabled. Connect to WiFi to download.');
    }
    if (this.checkStorageLimit()) {
      throw new Error('Storage limit reached. Delete some downloads or increase limit in settings.');
    }

    const store = useDownloadStore.getState();
    const existingAlbum = store.getDownloadedAlbum(album.id);

    let tracks: Track[];
    let fullAlbum: AlbumWithSongsID3;
    let metadataPromise: Promise<any>;

    if (existingAlbum) {
      const response = await getAlbum(album.id);
      fullAlbum = response.album;
      metadataPromise = Promise.resolve(response);
      tracks = fullAlbum.song || [];

      const existingTrackIds = new Set(existingAlbum.tracks.map(t => t.track.id));
      const newTracks = tracks.filter(t => !existingTrackIds.has(t.id));

      if (newTracks.length === 0) return;
    } else {
      const response = await getAlbum(album.id);
      fullAlbum = response.album;
      metadataPromise = Promise.resolve(response);
      tracks = fullAlbum.song || [];
    }

    const coverArtUri = album.coverArt ? await this.downloadCoverArt(album.coverArt) : undefined;
    const downloadId = useDownloadStore.getState().addDownload(album.id, 'album', 0, tracks.length);
    useDownloadStore.getState().updateDownloadMeta(downloadId, {
      title: album.name || fullAlbum.name,
      artist: album.artist || fullAlbum.artist,
      coverArtUri,
    });

    const groupId = downloadId;

    let groupResolve!: () => void;
    let groupReject!: (e: any) => void;
    const groupPromise = new Promise<void>((resolve, reject) => {
      groupResolve = resolve;
      groupReject = reject;
    });

    this.groups.set(groupId, {
      type: 'album',
      downloadId,
      name: album.name || fullAlbum.name,
      totalTracks: tracks.length,
      completedTracks: [],
      failedTracks: [],
      coverArtUri,
      metadataPromise,
      resolve: groupResolve,
      reject: groupReject,
    });

    for (const track of tracks) {
      if (useDownloadStore.getState().isTrackDownloaded(track.id)) {
        const existing = useDownloadStore.getState().getDownloadedTrack(track.id);
        if (existing) this.handleTrackComplete(groupId, existing);
      } else {
        this.trackQueue.push({ track, groupId });
      }
    }

    this.scheduleProcessing();
    return groupPromise;
  }

  async downloadPlaylist(playlist: Playlist): Promise<void> {
    if (useDownloadStore.getState().isPlaylistDownloaded(playlist.id)) return;
    if (await this.shouldBlockDownload()) {
      throw new Error('WiFi-only downloads is enabled. Connect to WiFi to download.');
    }
    if (this.checkStorageLimit()) {
      throw new Error('Storage limit reached. Delete some downloads or increase limit in settings.');
    }

    const response = await getPlaylist(playlist.id);
    const fullPlaylist = response.playlist;
    const tracks = fullPlaylist.entry || [];

    const coverArtId = playlist.coverArt || tracks[0]?.coverArt;
    const coverArtUri = coverArtId ? await this.downloadCoverArt(coverArtId) : undefined;

    const downloadId = useDownloadStore.getState().addDownload(playlist.id, 'playlist', 0, tracks.length);
    useDownloadStore.getState().updateDownloadMeta(downloadId, {
      title: playlist.name,
      artist: `${tracks.length} tracks`,
      coverArtUri,
    });

    const groupId = downloadId;

    let groupResolve!: () => void;
    let groupReject!: (e: any) => void;
    const groupPromise = new Promise<void>((resolve, reject) => {
      groupResolve = resolve;
      groupReject = reject;
    });

    this.groups.set(groupId, {
      type: 'playlist',
      downloadId,
      name: playlist.name,
      totalTracks: tracks.length,
      completedTracks: [],
      failedTracks: [],
      coverArtUri,
      metadataPromise: Promise.resolve(response),
      resolve: groupResolve,
      reject: groupReject,
    });

    for (const track of tracks) {
      if (useDownloadStore.getState().isTrackDownloaded(track.id)) {
        const existing = useDownloadStore.getState().getDownloadedTrack(track.id);
        if (existing) this.handleTrackComplete(groupId, existing);
      } else {
        this.trackQueue.push({ track, groupId });
      }
    }

    this.scheduleProcessing();
    return groupPromise;
  }

  async cancelDownload(itemId: string): Promise<void> {
    const downloads = useDownloadStore.getState().activeDownloads;
    const downloadId = Object.keys(downloads).find(id => downloads[id]?.itemId === itemId);
    if (!downloadId) return;

    const isGroup = this.groups.has(downloadId);

    if (isGroup) {
      this.cancelledGroups.add(downloadId);
      this.trackQueue = this.trackQueue.filter(item => item.groupId !== downloadId);
    }

    const trackDownloadIds: string[] = [];
    for (const [dlId, gid] of this.trackToGroup.entries()) {
      if (gid === downloadId) trackDownloadIds.push(dlId);
    }
    if (!isGroup && downloadId) trackDownloadIds.push(downloadId);

    for (const dlId of trackDownloadIds) {
      const resumable = this.activeDownloads.get(dlId);
      if (resumable) {
        try { await resumable.cancelAsync(); } catch {}
        this.activeDownloads.delete(dlId);
        this.lastProgressUpdate.delete(dlId);
      }
      this.trackToGroup.delete(dlId);
      useDownloadStore.getState().cancelDownload(dlId);
    }

    if (isGroup) {
      this.groups.delete(downloadId);
      useDownloadStore.getState().cancelDownload(downloadId);
    } else {
      useDownloadStore.getState().cancelDownload(downloadId);
    }

    this.scheduleProcessing();
  }

  async deleteTrack(trackId: string): Promise<void> {
    await useDownloadStore.getState().removeTrackDownload(trackId);
  }

  async deleteAlbum(albumId: string): Promise<void> {
    await useDownloadStore.getState().removeAlbumDownload(albumId);
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await useDownloadStore.getState().removePlaylistDownload(playlistId);
  }

  getTotalStorageUsed(): number {
    return useDownloadStore.getState().totalStorageUsed;
  }

  getActiveDownloadCount(): number {
    return this.activeCount + this.trackQueue.length;
  }

  async clearAllDownloads(): Promise<void> {
    this.trackQueue = [];
    this.groups.clear();
    this.cancelledGroups.clear();
    this.trackToGroup.clear();

    const downloadIds = Object.keys(useDownloadStore.getState().activeDownloads);
    await Promise.all(downloadIds.map(id => {
      const download = useDownloadStore.getState().activeDownloads[id];
      return download ? this.cancelDownload(download.itemId) : Promise.resolve();
    }));

    const { getAllTracks, getAllAlbums, getAllPlaylists } = useDownloadStore.getState();
    await Promise.all([
      ...getAllAlbums().map(a => this.deleteAlbum(a.album.id)),
      ...getAllPlaylists().map(p => this.deletePlaylist(p.playlist.id)),
      ...getAllTracks().map(t => this.deleteTrack(t.track.id)),
    ]);
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
    return { queued, skipped, updated };
  }
}

export const downloadService = DownloadService.getInstance();
