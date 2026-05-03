/**
 * Dino Music App - NitroPlayer Service
 * Audio playback engine with react-native-nitro-player
 */

import { PermissionsAndroid, Platform } from 'react-native';
import * as Network from 'expo-network';
import { TrackPlayer, PlayerQueue, AndroidAutoMediaLibraryHelper, DownloadManager } from 'react-native-nitro-player';
import type { TrackItem, RepeatMode as NitroRepeatMode } from 'react-native-nitro-player';
import { getCoverArtUrl, getStreamUrl } from '../../api/opensubsonic/streaming';
import { getArtworkUri } from '../../utils/artworkCache';
import { useDownloadStore } from '../../stores/downloadStore';
import { usePlayerStore, useQueueStore, useSettingsStore } from '../../stores';
import { setClearRestoredPositionCallback, setClearPreloadedTracksCallback, setResetPlayerCallback, setSkipToNextPlayerCallback, setPlayTrackCallback, setNativeAddToQueueCallback, setNativeRemoveFromQueueCallback, setNativeReorderQueueCallback, setNativeRebuildCallback } from '../../stores/queueStore';
import { queueSyncManager } from './QueueSyncManager';
import { scrobblingManager } from './ScrobblingManager';
import { useRemotePlaybackStore } from '../../stores/remotePlaybackStore';
import { getTrackArtistString } from '../../utils/artistUtils';
import { PlayerService } from './types';

const DINO_PLAYLIST_NAME = 'Queue';


class NitroPlayerService implements PlayerService {
  isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private playlistId: string | null = null;
  networkCheckInterval: ReturnType<typeof setInterval> | null = null;
  lastNetworkType: 'wifi' | 'mobile' | 'unknown' = 'unknown';
  private isSyncingQueue = false;
  private pendingSync = false;
  private lastQueueHash = '';
  private extensionTriggered = false;
  private isHandlingTrackChange = false;
  private isRecreatingPlaylist = false;
  private isResolvingUrls = false;
  private isStartingPlayback = false;
  private syncPromise: Promise<void> = Promise.resolve();
  private unsubscribeRepeatMode: (() => void) | null = null;

  private isLocalPlayerActive(): boolean {
    return useRemotePlaybackStore.getState().activePlayerType === 'local';
  }



  private getQueueHash(): string {
    const { queue } = useQueueStore.getState();
    return `${queue.length}:${queue.map(t => t.id).join(',')}`;
  }

  private async waitForReady(timeoutMs: number = 5000): Promise<boolean> {
    if (this.isInitialized) return true;

    if (this.initPromise) {
      try {
        await Promise.race([
          this.initPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
        ]);
        return this.isInitialized;
      } catch {
        console.warn('[NitroPlayer] Wait for ready timed out');
        return false;
      }
    }

    return this.isInitialized;
  }

  private formatCodecName(format: string): string {
    const formatLower = format.toLowerCase();
    switch (formatLower) {
      case 'flac': return 'FLAC';
      case 'opus': return 'Opus';
      case 'aac': return 'AAC';
      case 'mp3': return 'MP3';
      case 'ogg': return 'OGG';
      case 'wav': return 'WAV';
      case 'm4a': return 'M4A';
      case 'alac': return 'ALAC';
      case 'ape': return 'APE';
      case 'wma': return 'WMA';
      default: return format.toUpperCase();
    }
  }

  async initialize() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    await this.initPromise;
  }

  private async _doInitialize() {
    console.log('[NitroPlayer] Initializing...');

    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      } catch {}
    }

    try {
      await TrackPlayer.configure({
        showInNotification: true,
        androidAutoEnabled: true,
        lookaheadCount: 5,
      });

      DownloadManager.setPlaybackSourcePreference('auto');

      this.cleanupStalePlaylists();

      this.setupEventListeners();
      this.setupAndroidAuto();
      this.startNetworkMonitoring();

      setClearRestoredPositionCallback(() => {
        usePlayerStore.setState({ restoredPosition: null });
      });

      setClearPreloadedTracksCallback(() => { this.clearPreloadedTracks().catch(() => {}); });
      setResetPlayerCallback(() => this.resetPlayer());
      setSkipToNextPlayerCallback(() => this.skipToNext());
      setPlayTrackCallback((index: number) => this.playTrack(index));

      setNativeRebuildCallback(async () => {
        this.syncPromise = this.syncQueueWithNative();
      });

      setNativeAddToQueueCallback(async (trackId: string, position: 'next' | 'end') => {
        await this.nativeAddToQueue(trackId, position);
      });

      setNativeRemoveFromQueueCallback(async (nativeIndex: number) => {
        await this.nativeRemoveFromQueue(nativeIndex);
      });

      setNativeReorderQueueCallback(async (fromIndex: number, toIndex: number) => {
        await this.nativeReorderQueue(fromIndex, toIndex);
      });

      await useSettingsStore.getState().loadFromStorage();
      console.log('[NitroPlayer] Settings loaded');

      await usePlayerStore.getState().loadFromStorage();
      console.log('[NitroPlayer] Player state loaded (shuffle/loop)');

      await useQueueStore.getState().loadFromStorage();
      console.log('[NitroPlayer] Local queue loaded');

      this.isInitialized = true;
      console.log('[NitroPlayer] Initialized successfully (local queue)');

      queueSyncManager.start();
      scrobblingManager.start();

      this.unsubscribeRepeatMode = usePlayerStore.subscribe((state, prevState) => {
        if (state.repeatMode !== prevState.repeatMode) {
          this.syncRepeatMode().catch(err => {
            console.error('[NitroPlayer] Failed to sync repeat mode:', err);
          });
        }
      });

      queueSyncManager.loadFromServer().then(async (usedServerQueue) => {
        if (usedServerQueue) {
          console.log('[NitroPlayer] Loaded queue from server (background)');
          const { queue, currentIndex } = useQueueStore.getState();
          if (queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length) {
            usePlayerStore.getState().setCurrentTrack(queue[currentIndex]);
            this.updateStreamingInfo(queue[currentIndex]).catch(() => {});
            console.log('[NitroPlayer] Server queue ready:', queue.length, 'tracks');
          }
        } else {
          console.log('[NitroPlayer] Using local queue');
          const { queue, currentIndex } = useQueueStore.getState();
          if (queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length) {
            usePlayerStore.getState().setCurrentTrack(queue[currentIndex]);
            this.updateStreamingInfo(queue[currentIndex]).catch(() => {});
            console.log('[NitroPlayer] Local queue ready:', queue.length, 'tracks');
          }
        }

        await this.ensurePlaylistSynced();

        if (this.playlistId) {
          const { queue, currentIndex } = useQueueStore.getState();
          const currentTrack = usePlayerStore.getState().currentTrack;
          if (currentTrack && queue.length > 0 && currentIndex >= 0) {
            try {
              const trackId = currentTrack.id;
              this.isStartingPlayback = true;
              await TrackPlayer.playSong(trackId, this.playlistId);
              await TrackPlayer.pause();
              const restoredPosition = usePlayerStore.getState().restoredPosition;
              if (restoredPosition !== null && restoredPosition > 0) {
                await TrackPlayer.seek(restoredPosition);
                usePlayerStore.setState({ restoredPosition: null });
              }
              console.log('[NitroPlayer] Media session primed for Android Auto');
            } catch (err) {
              console.warn('[NitroPlayer] Failed to prime media session:', err);
            } finally {
              setTimeout(() => { this.isStartingPlayback = false; }, 1000);
            }
          }
        }

      }).catch((error) => {
        console.log('[NitroPlayer] Failed to load server queue (background), using local:', error);
      });
    } catch (error) {
      console.error('[NitroPlayer] Initialization failed:', error);
      throw error;
    }
  }

  private cleanupStalePlaylists() {
    try {
      const allPlaylists = PlayerQueue.getAllPlaylists();
      for (const p of allPlaylists) {
        if (p.name === DINO_PLAYLIST_NAME) {
          PlayerQueue.deletePlaylist(p.id).catch(() => {});
        }
      }
    } catch {}
  }

  private lastProgressUpdate = 0;
  private precacheTriggered = false;

  private setupEventListeners() {
    TrackPlayer.onPlaybackStateChange((state, _reason) => {
      if (!this.isLocalPlayerActive()) return;

      const { setPlaybackState, setBufferedProgress, progress } = usePlayerStore.getState();

      switch (state) {
        case 'playing':
          setPlaybackState('playing');
          setBufferedProgress(progress.duration);
          scrobblingManager.onPlaybackStateChange('playing');
          break;
        case 'paused':
          setPlaybackState('paused');
          scrobblingManager.onPlaybackStateChange('paused');
          break;
        case 'stopped':
          setPlaybackState('stopped');
          scrobblingManager.onPlaybackStateChange('stopped');
          break;
        case 'buffering':
          setPlaybackState('buffering');
          setBufferedProgress(progress.position);
          break;
      }
    });

    TrackPlayer.onPlaybackProgressChange((position, totalDuration, _isManuallySeeked) => {
      if (!this.isLocalPlayerActive()) return;

      const now = Date.now();
      if (now - this.lastProgressUpdate < 250) return;
      this.lastProgressUpdate = now;

      const { setProgress } = usePlayerStore.getState();
      setProgress(position, totalDuration);

      if (!this.precacheTriggered && totalDuration > 0 && position / totalDuration >= 0.5) {
        this.precacheTriggered = true;
        this.precacheNextTrack().catch(err => {
          console.error('[NitroPlayer] Precache failed:', err);
        });
      }

      if (!this.extensionTriggered && totalDuration > 0 && position / totalDuration >= 0.5) {
        this.extensionTriggered = true;
        this.extendQueueIfNeeded().catch(err => {
          console.error('[NitroPlayer] Queue extension failed:', err);
        });
      }
    });

    TrackPlayer.onChangeTrack(async (track, reason) => {
      if (!this.isLocalPlayerActive()) return;
      if (this.isHandlingTrackChange) return;
      this.isHandlingTrackChange = true;

      try {
        await this.handleTrackChange(track, reason);
      } finally {
        this.isHandlingTrackChange = false;
      }
    });

    TrackPlayer.onTracksNeedUpdate((tracks, _lookahead) => {
      this.handleTracksNeedUpdate(tracks).catch(err => {
        console.error('[NitroPlayer] Failed to resolve track URLs:', err);
      });
    });
  }

  private aaNeedsUpdate = false;

  private setupAndroidAuto() {
    try {
      TrackPlayer.onAndroidAutoConnectionChange((connected) => {
        console.log('[NitroPlayer] Android Auto connected:', connected);
        if (connected) {
          if (this.playlistId) {
            this.updateAndroidAutoQueue();
          } else {
            this.aaNeedsUpdate = true;
            console.log('[NitroPlayer] AA connected but no playlist yet, will update after queue loads');
          }
        }
      });

      try {
        if (TrackPlayer.isAndroidAutoConnected()) {
          console.log('[NitroPlayer] Android Auto already connected on init');
          if (this.playlistId) {
            this.updateAndroidAutoQueue();
          } else {
            this.aaNeedsUpdate = true;
            console.log('[NitroPlayer] AA connected on init but no playlist yet, will update after queue loads');
          }
        }
      } catch {}
    } catch (e) {
      console.warn('[NitroPlayer] Android Auto setup failed:', e);
    }
  }

  async refreshAndroidAutoLibrary() {
    this.updateAndroidAutoQueue();
  }

  private updateAndroidAutoQueue() {
    try {
      if (!AndroidAutoMediaLibraryHelper?.isAvailable()) return;

      const { queue } = useQueueStore.getState();
      const rootItems: any[] = [];

      if (this.playlistId) {
        rootItems.push({
          id: 'aa_queue',
          title: 'Queue',
          subtitle: `${queue.length} tracks`,
          mediaType: 'playlist' as const,
          isPlayable: false,
          playlistId: this.playlistId,
        });
      }

      AndroidAutoMediaLibraryHelper.set({
        layoutType: 'list',
        appName: 'Dino',
        rootItems,
      });
    } catch (e) {
      console.warn('[NitroPlayer] Failed to update AA queue:', e);
    }
  }

  private async handleTrackChange(track: TrackItem, reason: string | undefined): Promise<void> {
    if (this.isRecreatingPlaylist || this.isStartingPlayback) return;

    const { queue, currentIndex } = useQueueStore.getState();

    let newIndex = -1;
    if (currentIndex + 1 < queue.length && queue[currentIndex + 1].id === track.id) {
      newIndex = currentIndex + 1;
    } else if (currentIndex - 1 >= 0 && queue[currentIndex - 1].id === track.id) {
      newIndex = currentIndex - 1;
    } else {
      for (let offset = 2; offset < queue.length; offset++) {
        const forward = currentIndex + offset;
        if (forward < queue.length && queue[forward].id === track.id) {
          newIndex = forward;
          break;
        }
        const backward = currentIndex - offset;
        if (backward >= 0 && queue[backward].id === track.id) {
          newIndex = backward;
          break;
        }
      }
    }

    if (newIndex === -1) {
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].id === track.id) {
          newIndex = i;
          break;
        }
      }
    }

    if (newIndex === -1) return;

    const queueTrack = queue[newIndex];
    const { currentTrack: previousTrack, progress: previousProgress } = usePlayerStore.getState();

    if (previousTrack?.id === queueTrack.id && newIndex === currentIndex) {
      return;
    }

    useQueueStore.setState({ currentIndex: newIndex });
    useQueueStore.getState().saveToStorage();
    usePlayerStore.getState().setCurrentTrack(queueTrack);

    this.updateStreamingInfo(queueTrack).catch(() => {});

    scrobblingManager.onTrackChange(
      queueTrack,
      previousTrack,
      previousProgress.position,
      previousProgress.duration
    );

    this.extensionTriggered = false;
    this.precacheTriggered = false;
  }

  private async handleTracksNeedUpdate(tracks: TrackItem[]): Promise<void> {
    if (this.isRecreatingPlaylist || this.isResolvingUrls || !this.playlistId) return;

    const { queue } = useQueueStore.getState();
    const settings = useSettingsStore.getState();

    if (!settings?.gaplessPlayback) return;

    this.isResolvingUrls = true;
    try {
      const streamingSettings = await this.getActiveStreamingSettings();
      const updatedTracks: TrackItem[] = [];

      const tracksToResolve = tracks.slice(0, 5);

      for (const track of tracksToResolve) {
        if (!track.url || track.url === '') {
          const queueTrack = queue.find(q => q.id === track.id);
          if (!queueTrack) continue;

          const queueIndex = queue.indexOf(queueTrack);
          const trackItem = await this.buildTrackItem(queueTrack, queueIndex, streamingSettings);
          updatedTracks.push(trackItem);
        }
      }

      if (updatedTracks.length > 0) {
        await TrackPlayer.updateTracks(updatedTracks);
        console.log('[NitroPlayer] Resolved URLs for', updatedTracks.length, 'tracks');
      }
    } finally {
      this.isResolvingUrls = false;
    }
  }

  private async precacheNextTrack(): Promise<void> {
    const { queue, currentIndex } = useQueueStore.getState();
    const { repeatMode } = usePlayerStore.getState();
    const settings = useSettingsStore.getState();

    if (!settings?.gaplessPlayback) return;
    if (repeatMode === 'track') return;
    if (!this.playlistId) return;

    const nextIndex = currentIndex + 1;
    const nextTrack = repeatMode === 'queue' && nextIndex >= queue.length
      ? queue[0]
      : queue[nextIndex];

    if (!nextTrack) return;

    try {
      const streamingSettings = await this.getActiveStreamingSettings();
      const trackItem = await this.buildTrackItem(nextTrack, nextIndex, streamingSettings);
      await TrackPlayer.updateTracks([trackItem]);
      console.log('[NitroPlayer] Precached next track:', nextTrack.title);
    } catch (error) {
      console.error('[NitroPlayer] Failed to precache next track:', error);
    }
  }

  private async buildLazyTrackItem(track: Track, index: number): Promise<TrackItem> {
    let artwork: string | undefined;
    if (track.coverArt) {
      try { artwork = (await getArtworkUri(track.coverArt, 500)) ?? await getCoverArtUrl(track.coverArt, 500); } catch {}
    }

    return {
      id: track.id,
      title: track.title,
      artist: getTrackArtistString(track),
      album: track.album || 'Unknown Album',
      duration: track.duration,
      url: '',
      artwork,
      extraPayload: {
        queueIndex: index,
      },
    };
  }

  private async buildTrackItem(track: Track, index: number, streamingSettings: any): Promise<TrackItem> {
    const url = await getStreamUrl(track.id, streamingSettings.maxBitRate, streamingSettings.format);

    let artwork: string | undefined;
    if (track.coverArt) {
      try { artwork = (await getArtworkUri(track.coverArt, 500)) ?? await getCoverArtUrl(track.coverArt, 500); } catch {}
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
        queueIndex: index,
      },
    };
  }

private async ensurePlaylistSynced(): Promise<void> {
    const currentHash = this.getQueueHash();
    if (this.playlistId && currentHash === this.lastQueueHash) {
      return;
    }
    await this.recreatePlaylist();
  }

  private async recreatePlaylist(): Promise<void> {
    this.isRecreatingPlaylist = true;

    if (this.playlistId) {
      try { await PlayerQueue.deletePlaylist(this.playlistId); } catch {}
      this.playlistId = null;
    }

    try {
      const allPlaylists = PlayerQueue.getAllPlaylists();
      for (const p of allPlaylists) {
        if (p.name === DINO_PLAYLIST_NAME) {
          await PlayerQueue.deletePlaylist(p.id);
        }
      }
    } catch {}

    const id = await PlayerQueue.createPlaylist(DINO_PLAYLIST_NAME);
    this.playlistId = id;

    const { queue, currentIndex } = useQueueStore.getState();
    if (queue.length === 0) {
      this.lastQueueHash = this.getQueueHash();
      this.isRecreatingPlaylist = false;
      return;
    }

    const streamingSettings = await this.getActiveStreamingSettings();

    const trackItems: TrackItem[] = await Promise.all(
      queue.map((track, i) => {
        if (i === currentIndex || (i >= currentIndex + 1 && i <= currentIndex + 2)) {
          return this.buildTrackItem(track, i, streamingSettings);
        }
        return this.buildLazyTrackItem(track, i);
      })
    );

    console.log('[NitroPlayer] Adding', trackItems.length, 'tracks to playlist', id);
    console.log('[NitroPlayer] First track:', JSON.stringify({ id: trackItems[0]?.id, title: trackItems[0]?.title, url: trackItems[0]?.url?.substring(0, 60) }));

    try {
      await PlayerQueue.addTracksToPlaylist(id, trackItems);
    } catch (error) {
      console.error('[NitroPlayer] addTracksToPlaylist FAILED — playlist:', id, 'tracks:', trackItems.length, 'error:', error);
      console.error('[NitroPlayer] First 3 tracks:');
      for (let i = 0; i < Math.min(3, trackItems.length); i++) {
        const t = trackItems[i];
        console.error('[NitroPlayer]   ', i, ':', JSON.stringify({ id: t.id, title: t.title, url: t.url?.substring(0, 60), artwork: t.artwork?.substring(0, 60) }));
      }
      throw error;
    }

    this.lastQueueHash = this.getQueueHash();
    this.extensionTriggered = false;
    this.precacheTriggered = false;
    this.isRecreatingPlaylist = false;

    this.updateAndroidAutoQueue();
    this.aaNeedsUpdate = false;

    console.log('[NitroPlayer] Playlist created with', trackItems.length, 'tracks, current at index', currentIndex);
  }

  private async syncRepeatMode(): Promise<void> {
    if (!this.isInitialized) return;

    const { repeatMode } = usePlayerStore.getState();

    let nitroMode: NitroRepeatMode;
    switch (repeatMode) {
      case 'queue': nitroMode = 'Playlist'; break;
      case 'track': nitroMode = 'track'; break;
      default: nitroMode = 'off'; break;
    }

    await TrackPlayer.setRepeatMode(nitroMode);
  }

  private async updateStreamingInfo(track: Track): Promise<void> {
    const downloadedTrack = useDownloadStore.getState().getDownloadedTrack(track.id);

    if (downloadedTrack) {
      const bitRate = downloadedTrack.bitRate || downloadedTrack.track.bitRate;
      const suffix = downloadedTrack.suffix || downloadedTrack.track.suffix;
      let detailedText = 'Downloaded';
      if (bitRate && suffix) {
        const format = this.formatCodecName(suffix);
        detailedText = `${bitRate} kbps ${format}`;
      }

      usePlayerStore.getState().setStreamingInfo({
        quality: '0',
        format: suffix || 'Downloaded',
        displayText: detailedText,
        displayTextSimple: 'DOWNLOADED',
        networkType: 'unknown',
      });
    } else {
      const streamingSettings = await this.getActiveStreamingSettings();
      let detailedText = streamingSettings.displayText;
      if (streamingSettings.quality === '0' && track.bitRate && track.suffix) {
        const format = this.formatCodecName(track.suffix);
        detailedText = `${track.bitRate} kbps ${format}`;
      }

      usePlayerStore.getState().setStreamingInfo({
        quality: streamingSettings.quality,
        format: streamingSettings.formatName,
        displayText: detailedText,
        displayTextSimple: streamingSettings.displayTextSimple,
        networkType: streamingSettings.networkType,
      });
    }
  }

  async getActiveStreamingSettings() {
    const {
      streamingQualityWiFi,
      streamingQualityMobile,
      streamingFormatWiFi,
      streamingFormatMobile,
    } = useSettingsStore.getState();

    try {
      const networkState = await Network.getNetworkStateAsync();
      const isWiFi = networkState.type === Network.NetworkStateType.WIFI;

      const quality = isWiFi ? streamingQualityWiFi : streamingQualityMobile;
      const streamingFormat = isWiFi ? streamingFormatWiFi : streamingFormatMobile;

      let formatForApi: string | undefined = streamingFormat;
      if (formatForApi === 'original') {
        formatForApi = undefined;
      }

      let maxBitRateForApi: string | undefined = quality;
      if (quality === '0') {
        maxBitRateForApi = undefined;
      }

      let displayText: string;
      let displayTextSimple: string;

      if (quality === '0' || streamingFormat === 'original') {
        displayText = 'MAX';
        displayTextSimple = 'MAX';
      } else {
        const format = this.formatCodecName(formatForApi || streamingFormat);
        displayText = `${quality} kbps ${format}`;

        const qualityNum = parseInt(quality);
        if (qualityNum >= 256) {
          displayTextSimple = 'HIGH';
        } else if (qualityNum >= 128) {
          displayTextSimple = 'MEDIUM';
        } else {
          displayTextSimple = 'LOW';
        }
      }

      const networkType = isWiFi ? 'wifi' : networkState.type === Network.NetworkStateType.CELLULAR ? 'mobile' : 'unknown';

      return {
        maxBitRate: maxBitRateForApi,
        format: formatForApi,
        displayText,
        displayTextSimple,
        quality,
        formatName: streamingFormat,
        networkType: networkType as 'wifi' | 'mobile' | 'unknown',
      };
    } catch (error) {
      console.error('[NitroPlayer] Failed to get network state:', error);
      const fallbackMaxBitRate = streamingQualityMobile === '0' ? undefined : streamingQualityMobile;
      const fallbackFormat = streamingFormatMobile === 'original' ? undefined : streamingFormatMobile;
      const fallbackQualityNum = parseInt(streamingQualityMobile);
      const fallbackSimple = streamingQualityMobile === '0' ? 'MAX' :
                             fallbackQualityNum >= 256 ? 'HIGH' :
                             fallbackQualityNum >= 128 ? 'MEDIUM' : 'LOW';
      return {
        maxBitRate: fallbackMaxBitRate,
        format: fallbackFormat,
        displayText: streamingQualityMobile === '0' ? 'MAX' : `${streamingQualityMobile} kbps ${this.formatCodecName(streamingFormatMobile)}`,
        displayTextSimple: fallbackSimple,
        quality: streamingQualityMobile,
        formatName: streamingFormatMobile,
        networkType: 'unknown' as const,
      };
    }
  }

  async play() {
    if (!this.isLocalPlayerActive()) {
      console.log('[NitroPlayer] Skipping play - not active player');
      return;
    }

    const { currentTrack } = usePlayerStore.getState();

    if (!currentTrack) {
      console.warn('[NitroPlayer] No track to play');
      return;
    }

    console.log('[NitroPlayer] Playing:', currentTrack.title);

    this.isStartingPlayback = true;
    try {
      await this.syncPromise;
      const restoredPosition = usePlayerStore.getState().restoredPosition;

      this.lastQueueHash = '';
      await this.ensurePlaylistSynced();

      const trackId = currentTrack.id;

      await TrackPlayer.playSong(trackId, this.playlistId!);
      await TrackPlayer.play();

      if (restoredPosition !== null && restoredPosition > 0) {
        console.log('[NitroPlayer] Restoring position:', restoredPosition);
        await TrackPlayer.seek(restoredPosition);
        usePlayerStore.setState({ restoredPosition: null });
      }

      await this.syncRepeatMode();

      this.updateStreamingInfo(currentTrack).catch(() => {});
    } catch (error) {
      console.error('[NitroPlayer] Play failed:', error);
      throw error;
    } finally {
      setTimeout(() => { this.isStartingPlayback = false; }, 1000);
    }
  }

  async pause() {
    if (!await this.waitForReady()) {
      console.warn('[NitroPlayer] pause() called before player ready');
      return;
    }
    await TrackPlayer.pause();
  }

  async togglePlayPause() {
    if (!await this.waitForReady()) {
      console.warn('[NitroPlayer] togglePlayPause() called before player ready');
      return;
    }
    const state = await TrackPlayer.getState();
    if (state.currentState === 'playing') {
      await this.pause();
    } else if (state.currentState === 'paused') {
      await TrackPlayer.play();
    } else {
      await this.play();
    }
  }

  async skipToNext() {
    if (!await this.waitForReady()) {
      console.warn('[NitroPlayer] skipToNext() called before player ready');
      return;
    }

    try {
      await TrackPlayer.skipToNext();
    } catch {
      console.warn('[NitroPlayer] skipToNext failed natively, falling back to playSong');
      const { queue, currentIndex } = useQueueStore.getState();
      if (currentIndex + 1 < queue.length) {
        useQueueStore.getState().skipToTrack(currentIndex + 1);
      }
      await this.play();
    }
  }

  async skipToPrevious() {
    if (!await this.waitForReady()) {
      console.warn('[NitroPlayer] skipToPrevious() called before player ready');
      return;
    }

    try {
      await TrackPlayer.skipToPrevious();
    } catch {
      console.warn('[NitroPlayer] skipToPrevious failed natively');
      await TrackPlayer.seek(0);
    }
  }

  async seekTo(positionSeconds: number) {
    if (!await this.waitForReady()) {
      console.warn('[NitroPlayer] seekTo() called before player ready');
      return;
    }
    await TrackPlayer.seek(positionSeconds);
    scrobblingManager.onSeek(positionSeconds);
  }

  async stop() {
    try {
      await TrackPlayer.pause();
      await TrackPlayer.seek(0);
    } catch {}
    usePlayerStore.getState().setPlaybackState('stopped');
  }

  async playTrack(index: number) {
    const { queue, skipToTrack } = useQueueStore.getState();
    const track = queue[index];
    if (!track) return;

    skipToTrack(index);
    usePlayerStore.getState().setCurrentTrack(track);

    await this.syncPromise;
    await this.ensurePlaylistSynced();

    const trackId = track.id;
    this.isStartingPlayback = true;
    try {
      await TrackPlayer.playSong(trackId, this.playlistId!);
      await TrackPlayer.play();
    } catch {
      this.isStartingPlayback = false;
      await this.play();
      return;
    }
    setTimeout(() => { this.isStartingPlayback = false; }, 1000);
  }

  async setVolume(volume: number) {
    await TrackPlayer.setVolume(Math.round(volume * 100));
    usePlayerStore.getState().setVolume(volume);
  }

  async getVolume(): Promise<number> {
    return usePlayerStore.getState().volume;
  }

  async saveState(): Promise<{ position: number; isPlaying: boolean }> {
    try {
      const state = await TrackPlayer.getState();
      return {
        position: state.currentPosition,
        isPlaying: state.currentState === 'playing',
      };
    } catch {
      return { position: 0, isPlaying: false };
    }
  }

  private async resetPlayer(): Promise<void> {
    try {
      await TrackPlayer.pause();
      await TrackPlayer.seek(0);
    } catch {}

    if (this.playlistId) {
      try {
        await PlayerQueue.deletePlaylist(this.playlistId);
      } catch {}
      this.playlistId = null;
      this.lastQueueHash = '';
    }
  }

  async syncQueueWithNative() {
    if (this.isSyncingQueue) {
      console.log('[NitroPlayer] Queue sync already in progress, queuing another');
      this.pendingSync = true;
      return;
    }

    this.isSyncingQueue = true;

    try {
      const { queue } = useQueueStore.getState();
      const { currentTrack } = usePlayerStore.getState();

      if (!currentTrack || queue.length === 0) {
        console.log('[NitroPlayer] No track playing, skipping queue sync');
        return;
      }

      const currentHash = this.getQueueHash();
      if (this.playlistId && currentHash === this.lastQueueHash) {
        console.log('[NitroPlayer] Queue unchanged, skipping sync');
        return;
      }

      this.isRecreatingPlaylist = true;
      try {
        await this.recreatePlaylist();

        const trackId = currentTrack.id;
        this.isStartingPlayback = true;
        try {
          await TrackPlayer.playSong(trackId, this.playlistId!);
        } catch (error) {
          console.error('[NitroPlayer] Failed to sync queue:', error);
        } finally {
          setTimeout(() => { this.isStartingPlayback = false; }, 1000);
        }

        console.log('[NitroPlayer] Queue sync completed');
      } finally {
        this.isRecreatingPlaylist = false;
      }
    } catch (error) {
      console.error('[NitroPlayer] Failed to sync queue:', error);
    } finally {
      this.isSyncingQueue = false;

      if (this.pendingSync) {
        this.pendingSync = false;
        setTimeout(() => this.syncQueueWithNative(), 100);
      }
    }
  }

  private async nativeAddToQueue(trackId: string, position: 'next' | 'end') {
    if (!this.playlistId) return;
    const { queue, currentIndex } = useQueueStore.getState();
    const track = queue.find(t => t.id === trackId);
    if (!track) return;

    const streamingSettings = await this.getActiveStreamingSettings();
    const trackItem = await this.buildTrackItem(track, position === 'next' ? currentIndex + 1 : queue.length, streamingSettings);

    const insertIndex = position === 'next' ? currentIndex + 1 : undefined;

    await PlayerQueue.addTrackToPlaylist(this.playlistId, trackItem, insertIndex);
    this.lastQueueHash = '';
    console.log('[NitroPlayer] Native add:', track.title, 'at', position);
  }

  private async nativeRemoveFromQueue(nativeIndex: number) {
    if (!this.playlistId) return;
    const playlist = PlayerQueue.getPlaylist(this.playlistId);
    if (!playlist || nativeIndex >= playlist.tracks.length) return;

    const trackId = playlist.tracks[nativeIndex].id;
    await PlayerQueue.removeTrackFromPlaylist(this.playlistId, trackId);
    this.lastQueueHash = '';
    console.log('[NitroPlayer] Native remove at index:', nativeIndex);
  }

  private async nativeReorderQueue(fromIndex: number, toIndex: number) {
    if (!this.playlistId) return;
    const playlist = PlayerQueue.getPlaylist(this.playlistId);
    if (!playlist) return;
    if (fromIndex >= playlist.tracks.length || toIndex >= playlist.tracks.length) return;

    const trackId = playlist.tracks[fromIndex].id;
    await PlayerQueue.reorderTrackInPlaylist(this.playlistId, trackId, toIndex);
    this.lastQueueHash = '';
    console.log('[NitroPlayer] Native reorder:', fromIndex, '->', toIndex);
  }

  async clearPreloadedTracks() {
    this.extensionTriggered = false;
    this.precacheTriggered = false;
  }

  private async extendQueueIfNeeded() {
    const settings = useSettingsStore.getState();
    if (!settings?.autoExtendQueue) return;

    const { repeatMode } = usePlayerStore.getState();
    if (repeatMode === 'queue' || repeatMode === 'track') return;

    const { queue, currentIndex } = useQueueStore.getState();
    const remainingTracks = queue.length - currentIndex - 1;

    if (remainingTracks > 3 && queue.length > 1) return;

    const currentTrack = queue[currentIndex];
    if (!currentTrack) return;

    console.log('[NitroPlayer] Auto-extending queue, remaining tracks:', remainingTracks);

    try {
      const response = await getSimilarSongs2(currentTrack.id, 20);
      const similarSongs = response.similarSongs2?.song || [];

      if (similarSongs.length === 0) {
        console.log('[NitroPlayer] No similar songs found for queue extension');
        return;
      }

      const queueIds = new Set(queue.map(t => t.id));
      const newTracks = similarSongs.filter(t => !queueIds.has(t.id));

      if (newTracks.length === 0) {
        console.log('[NitroPlayer] All similar songs already in queue');
        return;
      }

      useQueueStore.getState().addToQueue(newTracks);
      console.log('[NitroPlayer] Extended queue with', newTracks.length, 'similar tracks');
    } catch (error) {
      console.error('[NitroPlayer] Failed to extend queue:', error);
    }
  }

  startNetworkMonitoring() {
    this.detectInitialNetwork();
    this.setupNetworkEventListener();
    this.networkCheckInterval = setInterval(() => {
      this.checkNetworkChange();
    }, 3000);
  }

  async detectInitialNetwork() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.type === Network.NetworkStateType.WIFI) {
        this.lastNetworkType = 'wifi';
      } else if (networkState.type === Network.NetworkStateType.CELLULAR) {
        this.lastNetworkType = 'mobile';
      } else {
        this.lastNetworkType = 'unknown';
      }
      console.log(`[NitroPlayer] Initial network type: ${this.lastNetworkType}`);
    } catch (error) {
      console.error('[NitroPlayer] Initial network detection error:', error);
      this.lastNetworkType = 'unknown';
    }
  }

  setupNetworkEventListener() {
    try {
      Network.addNetworkStateListener((networkState) => {
        let newNetworkType: 'wifi' | 'mobile' | 'unknown';

        if (networkState.type === Network.NetworkStateType.WIFI) {
          newNetworkType = 'wifi';
        } else if (networkState.type === Network.NetworkStateType.CELLULAR) {
          newNetworkType = 'mobile';
        } else {
          newNetworkType = 'unknown';
        }

        if (newNetworkType !== this.lastNetworkType && this.lastNetworkType !== 'unknown') {
          const isMeaningfulChange =
            (this.lastNetworkType === 'wifi' && newNetworkType === 'mobile') ||
            (this.lastNetworkType === 'mobile' && newNetworkType === 'wifi');

          if (isMeaningfulChange) {
            console.log(`[NitroPlayer] Network event detected: ${this.lastNetworkType} → ${newNetworkType}`);
            this.lastNetworkType = newNetworkType;
            this.handleNetworkChange(newNetworkType);
          } else {
            this.lastNetworkType = newNetworkType;
          }
        } else if (this.lastNetworkType === 'unknown') {
          this.lastNetworkType = newNetworkType;
        }
      });
      console.log('[NitroPlayer] Network event listener registered');
    } catch (_error) {
      console.log('[NitroPlayer] Network event listener not available, using polling only');
    }
  }

  async checkNetworkChange() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      let currentNetworkType: 'wifi' | 'mobile' | 'unknown';

      if (networkState.type === Network.NetworkStateType.WIFI) {
        currentNetworkType = 'wifi';
      } else if (networkState.type === Network.NetworkStateType.CELLULAR) {
        currentNetworkType = 'mobile';
      } else {
        currentNetworkType = 'unknown';
      }

      if (currentNetworkType !== this.lastNetworkType && this.lastNetworkType !== 'unknown') {
        const isMeaningfulChange =
          (this.lastNetworkType === 'wifi' && currentNetworkType === 'mobile') ||
          (this.lastNetworkType === 'mobile' && currentNetworkType === 'wifi');

        if (isMeaningfulChange) {
          console.log(`[NitroPlayer] Network poll detected change: ${this.lastNetworkType} → ${currentNetworkType}`);
          this.lastNetworkType = currentNetworkType;
          await this.handleNetworkChange(currentNetworkType);
        } else {
          this.lastNetworkType = currentNetworkType;
        }
      } else if (this.lastNetworkType === 'unknown') {
        this.lastNetworkType = currentNetworkType;
      }
    } catch (error) {
      console.error('[NitroPlayer] Network polling error:', error);
    }
  }

  stopNetworkMonitoring() {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }
  }

  async handleNetworkChange(newNetworkType: 'wifi' | 'mobile' | 'unknown') {
    const { currentTrack, playbackState } = usePlayerStore.getState();

    if (!currentTrack || playbackState === 'stopped') {
      console.log('[NitroPlayer] No active track, skipping network change handling');
      return;
    }

    const downloadedTrack = useDownloadStore.getState().getDownloadedTrack(currentTrack.id);
    if (downloadedTrack) {
      console.log('[NitroPlayer] Track is downloaded, ignoring network change');
      return;
    }

    const {
      streamingQualityWiFi,
      streamingQualityMobile,
      streamingFormatWiFi,
      streamingFormatMobile,
    } = useSettingsStore.getState();

    if (streamingQualityWiFi === streamingQualityMobile &&
        streamingFormatWiFi === streamingFormatMobile) {
      console.log('[NitroPlayer] WiFi and Mobile settings are identical - no need to switch');
      await this.updateStreamingInfo(currentTrack);
      return;
    }

    const startTime = Date.now();
    const wasPlaying = playbackState === 'playing';

    try {
      const state = await TrackPlayer.getState();
      const currentPosition = state.currentPosition;

      console.log(`[NitroPlayer] Network changed, switching quality at position ${currentPosition.toFixed(1)}s`);

      usePlayerStore.getState().setPlaybackState('buffering');

      const streamingSettings = await this.getActiveStreamingSettings();
      const { currentIndex } = useQueueStore.getState();
      const trackItem = await this.buildTrackItem(currentTrack, currentIndex, streamingSettings);

      await TrackPlayer.updateTracks([trackItem]);

      let detailedText = streamingSettings.displayText;
      if (streamingSettings.quality === '0' && currentTrack.bitRate && currentTrack.suffix) {
        const format = this.formatCodecName(currentTrack.suffix);
        detailedText = `${currentTrack.bitRate} kbps ${format}`;
      }

      usePlayerStore.getState().setStreamingInfo({
        quality: streamingSettings.quality,
        format: streamingSettings.formatName,
        displayText: detailedText,
        displayTextSimple: streamingSettings.displayTextSimple,
        networkType: streamingSettings.networkType,
      });

      await TrackPlayer.playSong(trackItem.id, this.playlistId!);

      const seekPosition = Math.max(0, currentPosition - 0.5);
      await TrackPlayer.seek(seekPosition);

      if (wasPlaying) {
        await TrackPlayer.play();
      }

      const elapsedTime = Date.now() - startTime;
      console.log(`[NitroPlayer] Quality switch completed in ${elapsedTime}ms`);
    } catch (error) {
      console.error('[NitroPlayer] Failed to handle network change:', error);
      usePlayerStore.getState().setPlaybackState(playbackState);
    }
  }

  async destroy() {
    this.stopNetworkMonitoring();

    if (this.unsubscribeRepeatMode) {
      this.unsubscribeRepeatMode();
      this.unsubscribeRepeatMode = null;
    }

    queueSyncManager.stop();
    scrobblingManager.stop();

    await scrobblingManager.forceUpdate();

    await this.resetPlayer();
  }

  getQueueSyncManager() {
    return queueSyncManager;
  }

  getScrobblingManager() {
    return scrobblingManager;
  }
}

export const nitroPlayerService = new NitroPlayerService();
