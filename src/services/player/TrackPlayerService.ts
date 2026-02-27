/**
 * Dino Music App - TrackPlayer Service
 * Audio playback engine with react-native-track-player
 */

import * as Network from 'expo-network';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State
} from 'react-native-track-player';
import { getCoverArtUrl, getStreamUrl } from '../../api/opensubsonic/streaming';
import { search3 } from '../../api/opensubsonic/search';
import { getSimilarSongs2 } from '../../api/opensubsonic/radio';
import { Track } from '../../api/opensubsonic/types';
import { usePlayerStore, useQueueStore, useSettingsStore } from '../../stores';
import { useDownloadStore } from '../../stores/downloadStore';
import { setClearRestoredPositionCallback, setSyncQueueCallback, setClearPreloadedTracksCallback } from '../../stores/queueStore';
import { queueSyncManager } from './QueueSyncManager';
import { scrobblingManager } from './ScrobblingManager';

// Playback service function (replaces PlaybackService.ts to avoid circular dependency)
async function PlaybackService() {
  // Remote control event handlers
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('[PlaybackService] Remote play');
    trackPlayerService.togglePlayPause();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('[PlaybackService] Remote pause');
    trackPlayerService.togglePlayPause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log('[PlaybackService] Remote next');
    trackPlayerService.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('[PlaybackService] Remote previous');
    trackPlayerService.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    console.log('[PlaybackService] Remote seek:', event.position);
    trackPlayerService.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteSkip, (event) => {
    console.log('[PlaybackService] Remote skip to index:', event.index);
    trackPlayerService.playTrack(event.index);
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    console.log('[PlaybackService] Remote stop');
    TrackPlayer.stop();
  });
}

// Register the playback service
TrackPlayer.registerPlaybackService(() => PlaybackService);

class TrackPlayerService {
  isInitialized = false;
  networkCheckInterval: ReturnType<typeof setInterval> | null = null;
  lastNetworkType: 'wifi' | 'mobile' | 'unknown' = 'unknown';
  isSyncingQueue = false;

  // Precache: pre-resolve the next track object so PlaybackQueueEnded can start it instantly
  precachedTrackObj: any = null;      // the fully-built RNTP track object
  precachedTrackIndex: number | null = null; // which queue index is cached (not ID - handles duplicates)
  precacheTriggerred = false;         // did we already trigger precache for the current song

  /**
   * Format audio codec name with proper capitalization
   * FLAC, Opus, AAC, etc. - not all uppercase
   */
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
      default: return format.toUpperCase(); // Fallback to uppercase
    }
  }

  /**
   * Initialize the player service
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('[TrackPlayer] Initializing...');

    try {
      // Get stream cache size from settings (convert MB to KB)
      const { streamCacheSize } = useSettingsStore.getState();
      const maxCacheSizeKB = streamCacheSize * 1024;
      
      await TrackPlayer.setupPlayer({
        waitForBuffer: true,
        autoHandleInterruptions: true,
        maxCacheSize: maxCacheSizeKB, // Android only - in KB
      });

      await TrackPlayer.updateOptions({
        progressUpdateEventInterval: 1, // Fire PlaybackProgressUpdated every 1 second
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
          alwaysPauseOnInterruption: true,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        icon: require('../../../assets/images/icon-transparent.png'),
      });

      // Setup event listeners
      this.setupEventListeners();

      // Start monitoring network changes
      this.startNetworkMonitoring();
      
      // Register callback to clear restored position when user starts new queue
      setClearRestoredPositionCallback(() => {
        usePlayerStore.setState({ restoredPosition: null });
      });
      
      // Register callback to sync queue with TrackPlayer when queue is modified
      setSyncQueueCallback(() => this.syncQueueWithTrackPlayer());
      setClearPreloadedTracksCallback(() => { this.clearPreloadedTracks().catch(() => {}); });

      // Load settings from storage first
      await useSettingsStore.getState().loadFromStorage();
      console.log('[TrackPlayer] Settings loaded');

      // Load queue from local storage first
      await useQueueStore.getState().loadFromStorage();
      console.log('[TrackPlayer] Local queue loaded');

      // Mark as initialized early - don't wait for server
      this.isInitialized = true;
      console.log('[TrackPlayer] Initialized successfully (local queue)');

      // Start queue sync and scrobbling managers
      queueSyncManager.start();
      scrobblingManager.start();

      // Load queue from server in background (non-blocking)
      // This allows app to start immediately even if server is unreachable
queueSyncManager.loadFromServer().then(async (usedServerQueue) => {
          if (usedServerQueue) {
            console.log('[TrackPlayer] Loaded queue from server (background)');
            const { queue, currentIndex } = useQueueStore.getState();
            if (queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length) {
              const currentTrack = queue[currentIndex];
              usePlayerStore.getState().setCurrentTrack(currentTrack);
              console.log('[TrackPlayer] Server queue ready:', queue.length, 'tracks, current track set');
            }
          } else {
          console.log('[TrackPlayer] Using local queue');
          // If there's a local queue, make sure current track is set
          const { queue, currentIndex } = useQueueStore.getState();
          if (queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length) {
            const currentTrack = queue[currentIndex];
            usePlayerStore.getState().setCurrentTrack(currentTrack);
            console.log('[TrackPlayer] Local queue ready:', queue.length, 'tracks, current track set');
          }
        }
      }).catch((error) => {
        console.log('[TrackPlayer] Failed to load server queue (background), using local:', error);
      });
    } catch (error) {
      console.error('[TrackPlayer] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
      const { setPlaybackState } = usePlayerStore.getState();

      switch (event.state) {
        case State.Playing:
          setPlaybackState('playing');
          this.startProgressTracking();
          scrobblingManager.onPlaybackStateChange('playing');
          break;
        case State.Paused:
          setPlaybackState('paused');
          this.stopProgressTracking();
          scrobblingManager.onPlaybackStateChange('paused');
          break;
        case State.Stopped:
          setPlaybackState('stopped');
          this.stopProgressTracking();
          scrobblingManager.onPlaybackStateChange('stopped');
          break;
        case State.Buffering:
          setPlaybackState('buffering');
          break;
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async (event) => {
      const { setProgress, setBufferedProgress } = usePlayerStore.getState();
      setProgress(event.position, event.duration);
      setBufferedProgress(event.buffered);

      // Trigger precache at 50% through the track - gives RNTP time to buffer audio
      if (
        !this.precacheTriggerred &&
        event.duration > 0 &&
        event.position / event.duration >= 0.5
      ) {
        this.precacheTriggerred = true;
        this.precacheNextTrack().catch(err => {
          console.error('[TrackPlayer] Precache failed:', err);
        });
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (event) => {
      // When TrackPlayer.add() buffers the next track, ExoPlayer fires a media transition
      // which RNTP surfaces as PlaybackTrackChanged with track=null, nextTrack=1.
      // This is NOT a real playback change - ignore it to prevent invalidatePrecache()
      // from resetting precacheTriggerred and causing an infinite add() loop.
      if (event.track === null && event.nextTrack !== null && event.nextTrack > 0) {
        return;
      }

      // Get previous track info for scrobbling
      const { currentTrack: previousTrack, progress: previousProgress, repeatMode } = usePlayerStore.getState();

      // Check if we should repeat the current track
      if (repeatMode === 'track' && previousTrack && event.nextTrack !== undefined) {
        console.log('[TrackPlayer] Repeat track mode - going back to:', previousTrack.title);
        // Go back to the previous track (which is the one we want to repeat)
        await TrackPlayer.skipToPrevious();
        return;
      }

      if (event.nextTrack !== undefined) {
        const track = await TrackPlayer.getTrack(event.nextTrack);
        if (track) {
          const { queue, currentIndex, skipToTrack } = useQueueStore.getState();
          const { currentTrack: storeCurrentTrack } = usePlayerStore.getState();
          
          // Check if this is the track we already set (manual selection via playTrack)
          // In that case, trust the currentIndex in the store - don't search
          if (storeCurrentTrack && storeCurrentTrack.id === track.id && queue[currentIndex]?.id === track.id) {
            // The store is already correct - this was a manual track change
            console.log('[TrackPlayer] PlaybackTrackChanged: manual selection, index already correct:', currentIndex);
            return;
          }
          
          // When gapless playback advances naturally, the next track should be at currentIndex + 1
          // Only search by ID if we detect something unexpected (like manual seek or queue modification)
          const expectedNextIndex = currentIndex + 1;
          const expectedNextTrack = queue[expectedNextIndex];
          
          let trackData;
          let newIndex;
          
          // Check if it's the expected next track
          if (expectedNextTrack && expectedNextTrack.id === track.id) {
            // Natural progression - just increment index
            trackData = expectedNextTrack;
            newIndex = expectedNextIndex;
          } else {
            // Track doesn't match expected - find it in queue AFTER current position
            // This handles duplicate tracks correctly by searching forward from currentIndex
            trackData = queue.slice(currentIndex + 1).find(t => t.id === track.id);
            const localIndex = queue.slice(currentIndex + 1).findIndex(t => t.id === track.id);
            newIndex = localIndex !== -1 ? currentIndex + 1 + localIndex : -1;
          }
          
          if (trackData && newIndex !== -1) {
            // Update queue index if it changed
            if (newIndex !== currentIndex) {
              skipToTrack(newIndex);
            }
            
            usePlayerStore.getState().setCurrentTrack(trackData);
            
            // Update streaming info based on whether track is downloaded
            const downloadedTrack = useDownloadStore.getState().getDownloadedTrack(trackData.id);
            if (downloadedTrack) {
              // Show actual bitrate and format for downloaded tracks in detailed view
              const track = downloadedTrack.track;
              let detailedText = 'Downloaded';
              if (track.bitRate && track.suffix) {
                const format = this.formatCodecName(track.suffix);
                detailedText = `${track.bitRate} kbps ${format}`;
              }
              
              usePlayerStore.getState().setStreamingInfo({
                quality: '0',
                format: track.suffix || 'Downloaded',
                displayText: detailedText,
                displayTextSimple: 'DOWNLOADED',
                networkType: 'unknown',
              });
            } else {
              // Update with current network settings
              this.getActiveStreamingSettings().then(streamingSettings => {
                // For MAX quality, show actual track bitrate/format in detailed view
                let detailedText = streamingSettings.displayText;
                if (streamingSettings.quality === '0' && trackData.bitRate && trackData.suffix) {
                  const format = this.formatCodecName(trackData.suffix);
                  detailedText = `${trackData.bitRate} kbps ${format}`;
                }
                
                usePlayerStore.getState().setStreamingInfo({
                  quality: streamingSettings.quality,
                  format: streamingSettings.formatName,
                  displayText: detailedText,
                  displayTextSimple: streamingSettings.displayTextSimple,
                  networkType: streamingSettings.networkType,
                });
              }).catch(err => console.error('[TrackPlayer] Failed to update streaming info:', err));
            }
            
            // Notify scrobbling manager about track change with previous track info
            scrobblingManager.onTrackChange(
              trackData,
              previousTrack,
              previousProgress.position,
              previousProgress.duration
            );

            // Reset precache so it gets refreshed for the new current track
            this.invalidatePrecache();
          }
        }
      } else {
        // Track cleared - scrobble the previous track if needed
        scrobblingManager.onTrackChange(null, previousTrack, previousProgress.position, previousProgress.duration);
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      // RNTP queue is always exactly 1 track, so PlaybackQueueEnded means the
      // current track truly finished. No false-positive from remove() anymore.
      const { repeatMode, currentTrack, progress } = usePlayerStore.getState();
      const { queue, currentIndex, skipToNext } = useQueueStore.getState();

      console.log('[TrackPlayer] Track finished (queue ended), advancing to next');

      // Scrobble the current track that just finished
      if (currentTrack) {
        await scrobblingManager.onTrackEnded(currentTrack, progress.position, progress.duration);
      }

      if (repeatMode === 'track') {
        // Repeat current track
        console.log('[TrackPlayer] Repeating current track:', currentTrack?.title);
        await this.play();
        return;
      }

      // Determine next track
      const hasNext = currentIndex < queue.length - 1;

      if (hasNext || repeatMode === 'queue') {
        // Advance index
        if (hasNext) {
          skipToNext();
        } else {
          // repeatMode === 'queue' - wrap around to start
          useQueueStore.getState().skipToTrack(0);
        }

        const { queue: updatedQueue, currentIndex: newIndex } = useQueueStore.getState();
        const nextTrack = updatedQueue[newIndex];

        if (!nextTrack) {
          console.error('[TrackPlayer] Next track not found at index', newIndex);
          return;
        }

        usePlayerStore.getState().setCurrentTrack(nextTrack);

        // If the next track is already buffered in RNTP's queue, use native skip (gapless, no lag)
        if (this.precachedTrackIndex === newIndex) {
          console.log('[TrackPlayer] PlaybackQueueEnded: native skip to buffered track:', nextTrack.title);
          this.invalidatePrecache();
          await TrackPlayer.skipToNext();
        } else {
          console.log('[TrackPlayer] PlaybackQueueEnded: no buffer, playing normally:', nextTrack.title);
          this.invalidatePrecache();
          await this.play();
        }
      } else {
        console.log('[TrackPlayer] Playback ended');
        usePlayerStore.getState().setPlaybackState('stopped');
      }
    });
  }

  /**
   * Get active streaming settings based on network type
   */
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

      // Select quality and format based on network type
      const quality = isWiFi ? streamingQualityWiFi : streamingQualityMobile;
      const streamingFormat = isWiFi ? streamingFormatWiFi : streamingFormatMobile;

      // Determine format to use (for API call - undefined means use original)
      let formatForApi: string | undefined = streamingFormat;
      if (formatForApi === 'original') {
        formatForApi = undefined; // Don't send format param to use original
      }

      // Determine bitrate (for API call - undefined means use original)
      let maxBitRateForApi: string | undefined = quality;
      if (quality === '0') {
        maxBitRateForApi = undefined; // Don't send bitrate param to use original
      }

      // Generate display text (detailed and simple)
      let displayText: string;
      let displayTextSimple: string;
      
      if (quality === '0' || streamingFormat === 'original') {
        displayText = 'MAX';
        displayTextSimple = 'MAX';
      } else {
        const format = this.formatCodecName(formatForApi || streamingFormat);
        displayText = `${quality} kbps ${format}`;
        
        // Simple text based on quality range
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
      console.error('[TrackPlayer] Failed to get network state:', error);
      // Fallback to mobile quality and format
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

  /**
   * Build track object for TrackPlayer
   */
  async buildTrackObject(track: any, streamingSettings: any) {
    // Check if track is downloaded
    const downloadedTrack = useDownloadStore.getState().getDownloadedTrack(track.id);
    
    let url: string;
    let coverArtUrl;
    
    if (downloadedTrack) {
      // Use local file
      url = downloadedTrack.localUri;
      // Use cached cover art if available
      coverArtUrl = downloadedTrack.coverArtUri || (track.coverArt ? await getCoverArtUrl(track.coverArt, 500) : undefined);
      console.log(`[TrackPlayer] Using downloaded file for track ${track.id}`);
    } else {
      // Stream from server
      url = await getStreamUrl(
        track.id,
        streamingSettings.maxBitRate,
        streamingSettings.format
      );
      
      // Fetch cover art
      if (track.coverArt) {
        coverArtUrl = await getCoverArtUrl(track.coverArt, 500);
      }
    }

    return {
      id: track.id,
      url,
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      album: track.album || 'Unknown Album',
      artwork: coverArtUrl,
      duration: track.duration,
    };
  }

  /**
   * Enqueue the next track into RNTP so it starts buffering audio data immediately.
   * RNTP will gaplessly advance to it when the current track ends.
   * Called at ~50% through the current track via PlaybackProgressUpdated / setInterval.
   */
  async precacheNextTrack() {
    const { queue, currentIndex } = useQueueStore.getState();
    const { repeatMode } = usePlayerStore.getState();
    const settings = useSettingsStore.getState();

    if (!settings || !settings.gaplessPlayback) return;
    if (repeatMode === 'track') return;

    // Check if we need to extend the queue with similar songs
    this.extendQueueIfNeeded().catch(err => {
      console.error('[TrackPlayer] Queue extension failed:', err);
    });

    const nextIndex = currentIndex + 1;
    const nextTrack = repeatMode === 'queue' && nextIndex >= queue.length
      ? queue[0]
      : queue[nextIndex];

    if (!nextTrack) return;

    // Already enqueued for this track index
    if (this.precachedTrackIndex === nextIndex) return;

    try {
      console.log('[TrackPlayer] Enqueueing next track for gapless buffering:', nextTrack.title);
      const streamingSettings = await this.getActiveStreamingSettings();
      const trackObj = await this.buildTrackObject(nextTrack, streamingSettings);

      // Remove any stale upcoming tracks first (safe - never touches currently playing track)
      await TrackPlayer.removeUpcomingTracks();
      // Add next track - RNTP starts buffering it immediately for gapless playback
      await TrackPlayer.add(trackObj);

      this.precachedTrackObj = trackObj;
      this.precachedTrackIndex = nextIndex;
      console.log('[TrackPlayer] Next track enqueued and buffering:', nextTrack.title);
    } catch (error) {
      console.error('[TrackPlayer] Failed to enqueue next track:', error);
      this.precachedTrackObj = null;
      this.precachedTrackIndex = null;
    }
  }

  /**
   * Invalidate precache in memory only. No RNTP queue changes.
   * Called when queue changes so the cached next track gets refreshed.
   */
  invalidatePrecache() {
    this.precachedTrackObj = null;
    this.precachedTrackIndex = null;
    this.precacheTriggerred = false;
  }

  /**
   * Extend queue with similar songs when near the end.
   * Called when there are 3 or fewer tracks remaining (or only 1 track).
   */
  async extendQueueIfNeeded() {
    const settings = useSettingsStore.getState();
    if (!settings?.autoExtendQueue) return;

    const { repeatMode } = usePlayerStore.getState();
    if (repeatMode === 'queue' || repeatMode === 'track') return;

    const { queue, currentIndex } = useQueueStore.getState();
    const remainingTracks = queue.length - currentIndex - 1;

    // Extend when 3 or fewer tracks remain, or when playing the only/last track
    if (remainingTracks > 3 && queue.length > 1) return;

    const currentTrack = queue[currentIndex];
    if (!currentTrack) return;

    console.log('[TrackPlayer] Auto-extending queue, remaining tracks:', remainingTracks);

    try {
      const response = await getSimilarSongs2(currentTrack.id, 20);
      const similarSongs = response.similarSongs2?.song || [];

      if (similarSongs.length === 0) {
        console.log('[TrackPlayer] No similar songs found for queue extension');
        return;
      }

      // Filter out tracks already in queue and the current track
      const queueIds = new Set(queue.map(t => t.id));
      const newTracks = similarSongs.filter(t => !queueIds.has(t.id));

      if (newTracks.length === 0) {
        console.log('[TrackPlayer] All similar songs already in queue');
        return;
      }

      // Add new tracks to queue
      useQueueStore.getState().addToQueue(newTracks);
      console.log('[TrackPlayer] Extended queue with', newTracks.length, 'similar tracks');
    } catch (error) {
      console.error('[TrackPlayer] Failed to extend queue:', error);
    }
  }

  /**
   * Play a track
   */
  async play() {
    const { currentTrack } = usePlayerStore.getState();

    if (!currentTrack) {
      console.warn('[TrackPlayer] No track to play');
      return;
    }

    console.log('[TrackPlayer] Playing:', currentTrack.title);

    try {
      // Check if track is downloaded
      const downloadedTrack = useDownloadStore.getState().getDownloadedTrack(currentTrack.id);
      
      // Get active streaming settings based on network (only if not downloaded)
      const streamingSettings = await this.getActiveStreamingSettings();

      console.log('[TrackPlayer] Streaming settings:', {
        quality: streamingSettings.quality,
        format: streamingSettings.formatName,
        network: streamingSettings.networkType,
        display: streamingSettings.displayText,
        maxBitRateForApi: streamingSettings.maxBitRate,
        formatForApi: streamingSettings.format,
        isDownloaded: !!downloadedTrack,
      });

      // Update streaming info in store
      if (downloadedTrack) {
        // Show "Downloaded" badge for local files
        usePlayerStore.getState().setStreamingInfo({
          quality: '0',
          format: 'Downloaded',
          displayText: 'Downloaded',
          displayTextSimple: 'DOWNLOADED',
          networkType: 'unknown',
        });
      } else {
        // For MAX quality, show actual track bitrate/format in detailed view
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
      }

      // Build current track object
      const currentTrackObj = await this.buildTrackObject(currentTrack, streamingSettings);

      await TrackPlayer.reset();
      await TrackPlayer.add(currentTrackObj);

      // Reset precache - will be triggered fresh at 80% via PlaybackProgressUpdated
      this.invalidatePrecache();

      // Check if we need to restore a position (from server queue)
      const { restoredPosition } = usePlayerStore.getState();
      if (restoredPosition !== null && restoredPosition > 0) {
        console.log('[TrackPlayer] Restoring position:', restoredPosition);
        await TrackPlayer.seekTo(restoredPosition);
        // Clear the restored position
        usePlayerStore.setState({ restoredPosition: null });
      }

      await TrackPlayer.play();
    } catch (error) {
      console.error('[TrackPlayer] Play failed:', error);
      throw error;
    }
  }

  async pause() {
    await TrackPlayer.pause();
  }

  async togglePlayPause() {
    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
      await this.pause();
    } else {
      if (state === State.Paused) {
        await TrackPlayer.play();
      } else {
        await this.play();
      }
    }
  }

  async skipToNext() {
    const { queue, currentIndex, skipToNext: incrementIndex } = useQueueStore.getState();
    
    // Check if there's a next track
    if (currentIndex >= queue.length - 1 || queue.length === 0) {
      console.log('[TrackPlayer] No next track available');
      return;
    }

    // Calculate expected next index BEFORE incrementing (for precache comparison)
    const expectedNextIndex = currentIndex + 1;

    // Increment index first
    const hasNext = incrementIndex();
    if (!hasNext) {
      console.log('[TrackPlayer] Could not increment index');
      return;
    }

    // Get the updated queue state after incrementing
    const { queue: updatedQueue, currentIndex: newIndex } = useQueueStore.getState();
    const nextTrack = updatedQueue[newIndex];
    
    if (!nextTrack) {
      console.error('[TrackPlayer] Next track not found at index', newIndex);
      return;
    }

    // Update current track in player store
    usePlayerStore.getState().setCurrentTrack(nextTrack);

    // If the next track is already buffered in RNTP's queue, use native skip (gapless, no lag)
    if (this.precachedTrackIndex === expectedNextIndex) {
      console.log('[TrackPlayer] skipToNext: native skip to buffered track:', nextTrack.title);
      this.invalidatePrecache();
      await TrackPlayer.skipToNext();
      return;
    }

    // Not buffered yet - play normally
    this.invalidatePrecache();
    await this.play();
  }

  async skipToPrevious() {
    const position = await TrackPlayer.getPosition();
    const { queue, currentIndex } = useQueueStore.getState();
    
    // If more than 10 seconds into track, restart current track
    if (position > 10) {
      await TrackPlayer.seekTo(0);
      return;
    }
    
    // Check if there's a previous track
    if (currentIndex <= 0 || queue.length === 0) {
      console.log('[TrackPlayer] No previous track available');
      await TrackPlayer.seekTo(0); // Just restart current track
      return;
    }
    
    // Decrement index
    const { skipToPrevious: decrementIndex } = useQueueStore.getState();
    const hasPrevious = decrementIndex();
    
    if (!hasPrevious) {
      console.log('[TrackPlayer] Could not decrement index');
      await TrackPlayer.seekTo(0);
      return;
    }
    
    // Get the updated queue state after decrementing
    const { queue: updatedQueue, currentIndex: newIndex } = useQueueStore.getState();
    const previousTrack = updatedQueue[newIndex];
    
    if (!previousTrack) {
      console.error('[TrackPlayer] Previous track not found at index', newIndex);
      await TrackPlayer.seekTo(0);
      return;
    }
    
    // Update current track and play
    usePlayerStore.getState().setCurrentTrack(previousTrack);
    await this.play();
  }

  async seekTo(positionSeconds: number) {
    await TrackPlayer.seekTo(positionSeconds);
    // Notify scrobbling manager about seek (triggers queue sync with new position)
    scrobblingManager.onSeek(positionSeconds);
  }

  async jumpForward(intervalSeconds: number) {
    const currentPosition = await TrackPlayer.getPosition();
    const newPosition = currentPosition + intervalSeconds;
    await this.seekTo(newPosition);
  }

  async jumpBackward(intervalSeconds: number) {
    const currentPosition = await TrackPlayer.getPosition();
    const newPosition = Math.max(0, currentPosition - intervalSeconds);
    await this.seekTo(newPosition);
  }

  async setVolume(volume: number) {
    await TrackPlayer.setVolume(volume);
    usePlayerStore.getState().setVolume(volume);
  }

  startProgressTracking() {
    // Progress is delivered via PlaybackProgressUpdated event (progressUpdateEventInterval: 1).
    // No polling needed - eliminates 3 native bridge calls/sec.
  }

  stopProgressTracking() {
    // No-op - event-based tracking stops automatically when playback stops.
  }

  async playTrack(index: number) {
    const { queue, skipToTrack } = useQueueStore.getState();
    const track = queue[index];
    if (!track) return;
    skipToTrack(index);
    usePlayerStore.getState().setCurrentTrack(track);
    await this.play();
  }

  /**
   * Called when queue is modified - remove the stale buffered track from RNTP
   * and reset precache state. Uses removeUpcomingTracks() which is safe and
   * never touches the currently-playing track at index 0.
   */
  async clearPreloadedTracks() {
    this.invalidatePrecache();
    try {
      await TrackPlayer.removeUpcomingTracks();
    } catch (e) {
      // silent
    }
  }

  /**
   * Sync TrackPlayer's internal queue with Zustand queue.
   * Since RNTP queue is always exactly 1 track, there's nothing to remove.
   * We only need to verify the current track index is correct and invalidate
   * the in-memory precache so the right next track gets resolved.
   */
  async syncQueueWithTrackPlayer() {
    // Prevent concurrent syncs - they can cause race conditions
    if (this.isSyncingQueue) {
      console.log('[TrackPlayer] Queue sync already in progress, skipping');
      return;
    }
    
    this.isSyncingQueue = true;
    
    try {
      const { queue, currentIndex } = useQueueStore.getState();
      const { currentTrack } = usePlayerStore.getState();
      
      if (!currentTrack || queue.length === 0) {
        console.log('[TrackPlayer] No track playing, skipping queue sync');
        return;
      }

      // Verify current track is still in queue - if not at currentIndex, find it
      const trackAtCurrentIndex = queue[currentIndex];
      if (!trackAtCurrentIndex || trackAtCurrentIndex.id !== currentTrack.id) {
        console.warn('[TrackPlayer] Current track mismatch after queue modification');
        
        // Search for the current track in the queue, starting from currentIndex
        // This handles duplicate tracks by checking nearby positions first
        let actualIndex = -1;
        
        // Check positions around currentIndex first (most likely after reorder)
        const searchOrder = [
          currentIndex,
          currentIndex + 1,
          currentIndex - 1,
          currentIndex + 2,
          currentIndex - 2,
        ].filter(i => i >= 0 && i < queue.length);
        
        for (const idx of searchOrder) {
          if (queue[idx].id === currentTrack.id) {
            actualIndex = idx;
            break;
          }
        }
        
        // If not found nearby, search forward from currentIndex (handles larger shifts)
        if (actualIndex === -1) {
          const localIndex = queue.slice(currentIndex).findIndex(t => t.id === currentTrack.id);
          if (localIndex !== -1) {
            actualIndex = currentIndex + localIndex;
          }
        }
        
        // Last resort: search from beginning
        if (actualIndex === -1) {
          actualIndex = queue.findIndex(t => t.id === currentTrack.id);
        }
        
        if (actualIndex !== -1) {
          // Found it! Just update the index, don't restart playback
          console.log('[TrackPlayer] Found current track at index:', actualIndex);
          useQueueStore.setState({ currentIndex: actualIndex });
        } else {
          // Current track was removed from queue entirely
          console.warn('[TrackPlayer] Current track no longer in queue');
          const newCurrentTrack = queue[currentIndex];
          if (newCurrentTrack) {
            // Update to new track but preserve playback state
            const wasPlaying = usePlayerStore.getState().playbackState === 'playing';
            console.log('[TrackPlayer] Switching to track at current index, was playing:', wasPlaying);
            
            usePlayerStore.getState().setCurrentTrack(newCurrentTrack);
            
            // Only resume playback if we were previously playing
            if (wasPlaying) {
              await this.play();
            }
            return;
          }
        }
      }

      // Invalidate precache so it gets refreshed for the updated queue
      // RNTP queue stays at 1 track - nothing to remove
      this.invalidatePrecache();

      console.log('[TrackPlayer] Queue sync completed - precache invalidated');
    } catch (error) {
      console.error('[TrackPlayer] Failed to sync queue:', error);
    } finally {
      this.isSyncingQueue = false;
    }
  }

  /**
   * Start monitoring network changes
   */
  startNetworkMonitoring() {
    // Initial network detection
    this.detectInitialNetwork();

    // Use event-based monitoring with polling fallback
    this.setupNetworkEventListener();

    // Also poll every 3 seconds as fallback (some devices don't fire events reliably)
    this.networkCheckInterval = setInterval(() => {
      this.checkNetworkChange();
    }, 3000);
  }

  /**
   * Detect initial network type on startup
   */
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
      console.log(`[TrackPlayer] Initial network type: ${this.lastNetworkType}`);
    } catch (error) {
      console.error('[TrackPlayer] Initial network detection error:', error);
      this.lastNetworkType = 'unknown';
    }
  }

  /**
   * Setup network event listener (if available)
   */
  setupNetworkEventListener() {
    try {
      // Try to use network state change event if available
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
          // Only handle meaningful changes (wifi <-> mobile)
          // Don't trigger on mobile -> mobile (SIM switch) or unknown states
          const isMeaningfulChange = 
            (this.lastNetworkType === 'wifi' && newNetworkType === 'mobile') ||
            (this.lastNetworkType === 'mobile' && newNetworkType === 'wifi');
          
          if (isMeaningfulChange) {
            console.log(`[TrackPlayer] Network event detected: ${this.lastNetworkType} → ${newNetworkType}`);
            this.lastNetworkType = newNetworkType;
            this.handleNetworkChange(newNetworkType);
          } else {
            console.log(`[TrackPlayer] Ignoring network event: ${this.lastNetworkType} → ${newNetworkType} (not WiFi/Mobile switch)`);
            this.lastNetworkType = newNetworkType;
          }
        } else if (this.lastNetworkType === 'unknown') {
          this.lastNetworkType = newNetworkType;
        }
      });
      console.log('[TrackPlayer] Network event listener registered');
    } catch (error) {
      console.log('[TrackPlayer] Network event listener not available, using polling only');
    }
  }

  /**
   * Check for network changes (polling fallback)
   */
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

      // Check if network type changed (wifi <-> mobile, not mobile <-> mobile)
      if (currentNetworkType !== this.lastNetworkType && this.lastNetworkType !== 'unknown') {
        // Only handle meaningful changes (wifi <-> mobile)
        // Don't trigger on mobile -> mobile (SIM switch) or unknown states
        const isMeaningfulChange = 
          (this.lastNetworkType === 'wifi' && currentNetworkType === 'mobile') ||
          (this.lastNetworkType === 'mobile' && currentNetworkType === 'wifi');
        
        if (isMeaningfulChange) {
          console.log(`[TrackPlayer] Network poll detected change: ${this.lastNetworkType} → ${currentNetworkType}`);
          this.lastNetworkType = currentNetworkType;
          await this.handleNetworkChange(currentNetworkType);
        } else {
          console.log(`[TrackPlayer] Ignoring network change: ${this.lastNetworkType} → ${currentNetworkType} (not WiFi/Mobile switch)`);
          this.lastNetworkType = currentNetworkType;
        }
      } else if (this.lastNetworkType === 'unknown') {
        this.lastNetworkType = currentNetworkType;
      }
    } catch (error) {
      console.error('[TrackPlayer] Network polling error:', error);
    }
  }

  /**
   * Stop monitoring network changes
   */
  stopNetworkMonitoring() {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }
  }

  /**
   * Handle network change - ALWAYS switch immediately for consistency
   */
  async handleNetworkChange(newNetworkType: 'wifi' | 'mobile' | 'unknown') {
    const { currentTrack, playbackState } = usePlayerStore.getState();

    // Only handle network change if something is currently playing or paused
    if (!currentTrack || playbackState === 'stopped') {
      console.log('[TrackPlayer] No active track, skipping network change handling');
      return;
    }

    // Check if track is downloaded - no need to handle network changes for local files
    const downloadedTrack = useDownloadStore.getState().getDownloadedTrack(currentTrack.id);
    if (downloadedTrack) {
      console.log('[TrackPlayer] Track is downloaded, ignoring network change');
      return;
    }

    // Check if WiFi and Mobile settings are identical
    const {
      streamingQualityWiFi,
      streamingQualityMobile,
      streamingFormatWiFi,
      streamingFormatMobile,
    } = useSettingsStore.getState();

    if (streamingQualityWiFi === streamingQualityMobile && 
        streamingFormatWiFi === streamingFormatMobile) {
      console.log('[TrackPlayer] WiFi and Mobile settings are identical - no need to switch');
      console.log(`[TrackPlayer] Both use: ${streamingQualityWiFi} kbps ${streamingFormatWiFi}`);
      
      // Check if downloaded (shouldn't reach here due to earlier check, but be safe)
      const downloadedTrack = useDownloadStore.getState().getDownloadedTrack(currentTrack.id);
      if (downloadedTrack) {
        usePlayerStore.getState().setStreamingInfo({
          quality: '0',
          format: 'Downloaded',
          displayText: 'Downloaded',
          displayTextSimple: 'DOWNLOADED',
          networkType: 'unknown',
        });
      } else {
        // Still update the badge to show current network type
        const streamingSettings = await this.getActiveStreamingSettings();
        
        // For MAX quality, show actual track bitrate/format in detailed view
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
      }
      
      return; // Skip the stream switch
    }

    const startTime = Date.now();
    const wasPlaying = playbackState === 'playing';

    try {
      // Get current position before switching
      const currentPosition = await TrackPlayer.getPosition();

      console.log(`[TrackPlayer] Network changed: ${this.lastNetworkType} → ${newNetworkType}`);
      console.log(`[TrackPlayer] Switching quality immediately at position ${currentPosition.toFixed(1)}s`);

      // Show buffering state
      usePlayerStore.getState().setPlaybackState('buffering');

      // Get new streaming settings
      const streamingSettings = await this.getActiveStreamingSettings();

      console.log('[TrackPlayer] New streaming settings:', {
        quality: streamingSettings.quality,
        format: streamingSettings.formatName,
        network: streamingSettings.networkType,
        display: streamingSettings.displayText,
        maxBitRateForApi: streamingSettings.maxBitRate,
        formatForApi: streamingSettings.format,
      });

      // Update badge immediately
        // For MAX quality, show actual track bitrate/format in detailed view
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

      // Build new stream URL with new transcoding parameters
      console.log('[TrackPlayer] Building stream URL with params:', {
        trackId: currentTrack.id,
        maxBitRate: streamingSettings.maxBitRate,
        format: streamingSettings.format,
      });

      const streamUrl = await getStreamUrl(
        currentTrack.id,
        streamingSettings.maxBitRate,
        streamingSettings.format
      );

      console.log('[TrackPlayer] Stream URL built:', streamUrl);

      let coverArtUrl;
      if (currentTrack.coverArt) {
        coverArtUrl = await getCoverArtUrl(currentTrack.coverArt, 500);
      }

      // Reset and load new stream with new quality
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: currentTrack.id,
        url: streamUrl,
        title: currentTrack.title,
        artist: currentTrack.artist || 'Unknown Artist',
        artwork: coverArtUrl,
        duration: currentTrack.duration,
      });

      // Seek to previous position (go back 0.5s for smoother resume)
      const seekPosition = Math.max(0, currentPosition - 0.5);
      await TrackPlayer.seekTo(seekPosition);

      // Resume playback if it was playing
      if (wasPlaying) {
        await TrackPlayer.play();
      }

      const elapsedTime = Date.now() - startTime;
      console.log(`[TrackPlayer] Quality switch completed in ${elapsedTime}ms`);
    } catch (error) {
      console.error('[TrackPlayer] Failed to handle network change:', error);
      // Restore playback state on error
      usePlayerStore.getState().setPlaybackState(playbackState);
    }
  }

  async destroy() {
    this.stopNetworkMonitoring();

    // Stop managers
    queueSyncManager.stop();
    scrobblingManager.stop();

    // Force final sync before destroying
    await scrobblingManager.forceUpdate();

    await TrackPlayer.reset();
  }

  /**
   * Get queue sync manager instance
   */
  getQueueSyncManager() {
    return queueSyncManager;
  }

  /**
   * Get scrobbling manager instance
   */
  getScrobblingManager() {
    return scrobblingManager;
  }
}

export const trackPlayerService = new TrackPlayerService();
