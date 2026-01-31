/**
 * Dino Music App - Download Service
 * Manages track/album/playlist downloads with expo-file-system
 * Uses /download endpoint for original quality files
 */

import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import { Track, Album, Playlist, AlbumWithSongsID3, PlaylistWithSongs } from '../api/opensubsonic/types';
import { useDownloadStore, DownloadedTrack, DownloadType } from '../stores/downloadStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getDownloadUrl, getCoverArtUrl } from '../api/opensubsonic/streaming';
import { getLyricsBySongId } from '../api/opensubsonic/lyrics';
import { getAlbum } from '../api/opensubsonic/albums';
import { getPlaylist } from '../api/opensubsonic/playlists';
import { DOWNLOAD_CONFIG } from '../config/constants';

export class DownloadService {
  private static instance: DownloadService;
  private activeDownloads = new Map<string, FileSystem.DownloadResumable>();
  private downloadQueue: Array<{ type: DownloadType; item: Track | AlbumWithSongsID3 | PlaylistWithSongs }> = [];
  private isProcessing = false;

  private constructor() {}

  static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService();
    }
    return DownloadService.instance;
  }

  /**
   * Get download directory path
   */
  private getDownloadDirectory(): string {
    return `${FileSystem.documentDirectory}downloads/`;
  }

  /**
   * Get metadata directory path
   */
  private getMetadataDirectory(): string {
    return `${FileSystem.documentDirectory}metadata/`;
  }

  /**
   * Get file path for a track
   */
  private getTrackFilePath(trackId: string, extension: string = 'audio'): string {
    return `${this.getDownloadDirectory()}${trackId}.${extension}`;
  }

  /**
   * Get file path for cover art
   */
  private getCoverArtFilePath(id: string): string {
    return `${this.getMetadataDirectory()}cover_${id}.jpg`;
  }

  /**
   * Get file path for lyrics
   */
  private getLyricsFilePath(trackId: string): string {
    return `${this.getMetadataDirectory()}lyrics_${trackId}.json`;
  }

  /**
   * Ensure directories exist
   */
  private async ensureDirectoriesExist(): Promise<void> {
    const dirs = [this.getDownloadDirectory(), this.getMetadataDirectory()];
    
    for (const dir of dirs) {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    }
  }

  /**
   * Check if WiFi-only downloads setting is enabled and we're not on WiFi
   */
  private async shouldBlockDownload(): Promise<boolean> {
    const { wifiOnlyDownloads } = useSettingsStore.getState();
    
    if (!wifiOnlyDownloads) {
      return false;
    }
    
    const networkState = await Network.getNetworkStateAsync();
    return networkState.type !== Network.NetworkStateType.WIFI;
  }

  /**
   * Download cover art
   */
  private async downloadCoverArt(coverArtId: string): Promise<string | undefined> {
    try {
      const coverArtUrl = await getCoverArtUrl(coverArtId, 500);
      const localPath = this.getCoverArtFilePath(coverArtId);
      
      const download = FileSystem.createDownloadResumable(coverArtUrl, localPath);
      const result = await download.downloadAsync();
      
      return result?.uri;
    } catch (error) {
      console.error('Failed to download cover art:', error);
      return undefined;
    }
  }

  /**
   * Download lyrics
   */
  private async downloadLyrics(trackId: string): Promise<string | undefined> {
    try {
      const response = await getLyricsBySongId(trackId);
      const lyrics = response.lyrics;
      
      if (!lyrics) {
        return undefined;
      }
      
      const localPath = this.getLyricsFilePath(trackId);
      await FileSystem.writeAsStringAsync(localPath, JSON.stringify(lyrics));
      
      return localPath;
    } catch (error) {
      console.error('Failed to download lyrics:', error);
      return undefined;
    }
  }

  /**
   * Download a single track
   */
  async downloadTrack(track: Track): Promise<void> {
    // Check if already downloaded
    if (useDownloadStore.getState().isTrackDownloaded(track.id)) {
      console.log(`Track ${track.id} already downloaded`);
      return;
    }

    // Check WiFi-only setting
    if (await this.shouldBlockDownload()) {
      throw new Error('WiFi-only downloads is enabled. Connect to WiFi to download.');
    }

    // Add to queue
    this.downloadQueue.push({ type: 'track', item: track });
    this.processQueue();
  }

  /**
   * Download an entire album
   */
  async downloadAlbum(album: Album): Promise<void> {
    // Check if already downloaded
    if (useDownloadStore.getState().isAlbumDownloaded(album.id)) {
      console.log(`Album ${album.id} already downloaded`);
      return;
    }

    // Check WiFi-only setting
    if (await this.shouldBlockDownload()) {
      throw new Error('WiFi-only downloads is enabled. Connect to WiFi to download.');
    }

    // Fetch full album details to get all tracks
    const response = await getAlbum(album.id);
    const fullAlbum = response.album;
    
    // Add to queue
    this.downloadQueue.push({ type: 'album', item: fullAlbum });
    this.processQueue();
  }

  /**
   * Download an entire playlist
   */
  async downloadPlaylist(playlist: Playlist): Promise<void> {
    // Check if already downloaded
    if (useDownloadStore.getState().isPlaylistDownloaded(playlist.id)) {
      console.log(`Playlist ${playlist.id} already downloaded`);
      return;
    }

    // Check WiFi-only setting
    if (await this.shouldBlockDownload()) {
      throw new Error('WiFi-only downloads is enabled. Connect to WiFi to download.');
    }

    // Fetch full playlist details to get all tracks
    const response = await getPlaylist(playlist.id);
    const fullPlaylist = response.playlist;
    
    // Add to queue
    this.downloadQueue.push({ type: 'playlist', item: fullPlaylist });
    this.processQueue();
  }

  /**
   * Process download queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.downloadQueue.length > 0) {
      // Respect max concurrent downloads
      const { maxConcurrentDownloads } = useSettingsStore.getState();
      
      while (this.activeDownloads.size < maxConcurrentDownloads && this.downloadQueue.length > 0) {
        const queueItem = this.downloadQueue.shift();
        if (queueItem) {
          if (queueItem.type === 'track') {
            this.startTrackDownload(queueItem.item as Track).catch((error) => {
              console.error(`Failed to download track:`, error);
            });
          } else if (queueItem.type === 'album') {
            this.startAlbumDownload(queueItem.item as AlbumWithSongsID3).catch((error) => {
              console.error(`Failed to download album:`, error);
            });
          } else if (queueItem.type === 'playlist') {
            this.startPlaylistDownload(queueItem.item as PlaylistWithSongs).catch((error) => {
              console.error(`Failed to download playlist:`, error);
            });
          }
        }
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;
  }

  /**
   * Start downloading a track with metadata
   */
  private async startTrackDownload(track: Track, retryCount = 0): Promise<DownloadedTrack> {
    try {
      await this.ensureDirectoriesExist();

      // Get download URL (original file, no transcoding)
      const downloadUrl = await getDownloadUrl(track.id);

      const fileUri = this.getTrackFilePath(track.id);

      // Download cover art first for display
      const coverArtUri = track.coverArt ? await this.downloadCoverArt(track.coverArt) : undefined;
      
      // Create download ID
      const downloadId = useDownloadStore.getState().addDownload(track.id, 'track', 0);
      
      // Update with display info
      const state = useDownloadStore.getState();
      const download = state.activeDownloads.get(downloadId);
      if (download) {
        state.activeDownloads.set(downloadId, {
          ...download,
          title: track.title,
          artist: track.artist,
          coverArtUri,
        });
      }

      // Create resumable download
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        fileUri,
        {},
        (downloadProgress) => {
          useDownloadStore.getState().updateProgress(downloadId, downloadProgress.totalBytesWritten);
        }
      );

      this.activeDownloads.set(downloadId, downloadResumable);

      // Start download
      const result = await downloadResumable.downloadAsync();

      if (!result) {
        throw new Error('Download failed: No result returned');
      }

      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(result.uri);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

      // Download lyrics
      const lyricsUri = await this.downloadLyrics(track.id);

      // Mark as downloaded (coverArtUri already downloaded above)
      useDownloadStore.getState().markTrackDownloaded(track, result.uri, fileSize, coverArtUri, lyricsUri);
      useDownloadStore.getState().completeDownload(downloadId);

      // Remove from active downloads
      this.activeDownloads.delete(downloadId);

      console.log(`Successfully downloaded track ${track.id}`);
      
      return {
        track,
        localUri: result.uri,
        coverArtUri,
        lyricsUri,
        downloadedAt: Date.now(),
        size: fileSize,
      };
    } catch (error) {
      console.error(`Download error for track ${track.id}:`, error);

      // Retry logic
      if (retryCount < DOWNLOAD_CONFIG.RETRY_ATTEMPTS) {
        const delay = DOWNLOAD_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retryCount);
        console.log(`Retrying download for track ${track.id} in ${delay}ms (attempt ${retryCount + 1})`);
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.startTrackDownload(track, retryCount + 1);
      }

      // Mark as failed
      const downloadId = Array.from(this.activeDownloads.keys()).find((id) => {
        const download = useDownloadStore.getState().activeDownloads.get(id);
        return download?.itemId === track.id;
      });

      if (downloadId) {
        useDownloadStore.getState().failDownload(downloadId, error instanceof Error ? error.message : 'Unknown error');
        this.activeDownloads.delete(downloadId);
      }

      throw error;
    }
  }

  /**
   * Start downloading an album with all tracks
   */
  private async startAlbumDownload(album: AlbumWithSongsID3): Promise<void> {
    try {
      const tracks = album.song || [];
      
      // Download album cover first for display
      const coverArtUri = album.coverArt ? await this.downloadCoverArt(album.coverArt) : undefined;
      
      // Create download with display metadata
      const downloadId = useDownloadStore.getState().addDownload(
        album.id, 
        'album', 
        0, 
        tracks.length
      );
      
      // Update with display info
      const state = useDownloadStore.getState();
      const download = state.activeDownloads.get(downloadId);
      if (download) {
        state.activeDownloads.set(downloadId, {
          ...download,
          title: album.name,
          artist: album.artist,
          coverArtUri,
        });
      }

      const downloadedTracks: DownloadedTrack[] = [];
      const failedTracks: string[] = [];
      let totalBytes = 0;
      let completedTracks = 0;

      // Download all tracks (continue even if some fail)
      for (const track of tracks) {
        try {
          const downloadedTrack = await this.startTrackDownload(track);
          downloadedTracks.push(downloadedTrack);
          totalBytes += downloadedTrack.size;
          completedTracks++;

          // Update progress
          useDownloadStore.getState().updateProgress(downloadId, totalBytes, completedTracks);
        } catch (error) {
          console.error(`Failed to download track ${track.id} in album ${album.id}:`, error);
          failedTracks.push(track.title);
          // Continue with next track
        }
      }

      // Only mark as downloaded if at least some tracks succeeded
      if (downloadedTracks.length > 0) {
        // Fetch and store full metadata for offline use
        const fullMetadata = await getAlbum(album.id);

        // Mark album as downloaded with metadata
        useDownloadStore.getState().markAlbumDownloaded(album, downloadedTracks, fullMetadata, coverArtUri);
        useDownloadStore.getState().completeDownload(downloadId);

        console.log(`Downloaded album ${album.id}: ${downloadedTracks.length}/${tracks.length} tracks`);
        
        // Show toast notification about partial failure if needed
        if (failedTracks.length > 0) {
          const { showToast } = await import('../stores/toastStore').then(m => m.useToastStore.getState());
          showToast(`Album partially downloaded. ${failedTracks.length} track(s) failed`, 'error');
        }
      } else {
        // All tracks failed
        useDownloadStore.getState().failDownload(downloadId, 'All tracks failed to download');
        throw new Error(`Failed to download any tracks from album ${album.id}`);
      }
    } catch (error) {
      console.error(`Failed to download album ${album.id}:`, error);
      throw error;
    }
  }

  /**
   * Start downloading a playlist with all tracks
   */
  private async startPlaylistDownload(playlist: PlaylistWithSongs): Promise<void> {
    try {
      const tracks = playlist.entry || [];
      
      // Download playlist cover first for display (use first track's cover if no playlist cover)
      const coverArtId = playlist.coverArt || tracks[0]?.coverArt;
      const coverArtUri = coverArtId ? await this.downloadCoverArt(coverArtId) : undefined;
      
      // Create download with display metadata
      const downloadId = useDownloadStore.getState().addDownload(
        playlist.id, 
        'playlist', 
        0, 
        tracks.length
      );
      
      // Update with display info
      const state = useDownloadStore.getState();
      const download = state.activeDownloads.get(downloadId);
      if (download) {
        state.activeDownloads.set(downloadId, {
          ...download,
          title: playlist.name,
          artist: `${playlist.songCount} tracks`,
          coverArtUri,
        });
      }

      const downloadedTracks: DownloadedTrack[] = [];
      const failedTracks: string[] = [];
      let totalBytes = 0;
      let completedTracks = 0;

      // Download all tracks (continue even if some fail)
      for (const track of tracks) {
        try {
          const downloadedTrack = await this.startTrackDownload(track);
          downloadedTracks.push(downloadedTrack);
          totalBytes += downloadedTrack.size;
          completedTracks++;

          // Update progress
          useDownloadStore.getState().updateProgress(downloadId, totalBytes, completedTracks);
        } catch (error) {
          console.error(`Failed to download track ${track.id} in playlist ${playlist.id}:`, error);
          failedTracks.push(track.title);
          // Continue with next track
        }
      }

      // Only mark as downloaded if at least some tracks succeeded
      if (downloadedTracks.length === 0) {
        // All tracks failed
        useDownloadStore.getState().failDownload(downloadId, 'All tracks failed to download');
        throw new Error(`Failed to download any tracks from playlist ${playlist.id}`);
      }

      // Fetch and store full metadata for offline use
      const fullMetadata = await getPlaylist(playlist.id);

      // Mark playlist as downloaded with metadata
      useDownloadStore.getState().markPlaylistDownloaded(playlist, downloadedTracks, fullMetadata, coverArtUri);
      useDownloadStore.getState().completeDownload(downloadId);

      console.log(`Downloaded playlist ${playlist.id}: ${downloadedTracks.length}/${tracks.length} tracks`);
      
      // Show toast notification about partial failure if needed
      if (failedTracks.length > 0) {
        const { showToast } = await import('../stores/toastStore').then(m => m.useToastStore.getState());
        showToast(`Playlist partially downloaded. ${failedTracks.length} track(s) failed`, 'error');
      }
    } catch (error) {
      console.error(`Failed to download playlist ${playlist.id}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a download
   */
  async cancelDownload(itemId: string): Promise<void> {
    const downloadId = Array.from(this.activeDownloads.keys()).find((id) => {
      const download = useDownloadStore.getState().activeDownloads.get(id);
      return download?.itemId === itemId;
    });

    if (!downloadId) {
      return;
    }

    const downloadResumable = this.activeDownloads.get(downloadId);
    if (downloadResumable) {
      await downloadResumable.cancelAsync();
      this.activeDownloads.delete(downloadId);
      useDownloadStore.getState().cancelDownload(downloadId);
    }
  }

  /**
   * Delete a downloaded track
   */
  async deleteTrack(trackId: string): Promise<void> {
    await useDownloadStore.getState().removeTrackDownload(trackId);
  }

  /**
   * Delete a downloaded album
   */
  async deleteAlbum(albumId: string): Promise<void> {
    await useDownloadStore.getState().removeAlbumDownload(albumId);
  }

  /**
   * Delete a downloaded playlist
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    await useDownloadStore.getState().removePlaylistDownload(playlistId);
  }

  /**
   * Get total storage used by downloads
   */
  getTotalStorageUsed(): number {
    return useDownloadStore.getState().totalStorageUsed;
  }

  /**
   * Get number of active downloads
   */
  getActiveDownloadCount(): number {
    return this.activeDownloads.size;
  }

  /**
   * Clear all downloads
   */
  async clearAllDownloads(): Promise<void> {
    // Cancel all active downloads
    const promises = Array.from(this.activeDownloads.keys()).map((id) => {
      const download = useDownloadStore.getState().activeDownloads.get(id);
      if (download) {
        return this.cancelDownload(download.itemId);
      }
      return Promise.resolve();
    });

    await Promise.all(promises);

    // Delete all downloaded content
    const { getAllTracks, getAllAlbums, getAllPlaylists } = useDownloadStore.getState();
    
    const deletePromises = [
      ...getAllTracks().map((t) => this.deleteTrack(t.track.id)),
      ...getAllAlbums().map((a) => this.deleteAlbum(a.album.id)),
      ...getAllPlaylists().map((p) => this.deletePlaylist(p.playlist.id)),
    ];

    await Promise.all(deletePromises);

    console.log('All downloads cleared');
  }
}

export const downloadService = DownloadService.getInstance();
