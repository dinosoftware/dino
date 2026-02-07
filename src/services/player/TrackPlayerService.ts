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
import { usePlayerStore, useQueueStore, useSettingsStore } from '../../stores';
import { useDownloadStore } from '../../stores/downloadStore';
import { setClearRestoredPositionCallback, setSyncQueueCallback } from '../../stores/queueStore';
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
  intervalId: ReturnType<typeof setInterval> | null = null;
  networkCheckInterval: ReturnType<typeof setInterval> | null = null;
  lastNetworkType: 'wifi' | 'mobile' | 'unknown' = 'unknown';

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
            // Set current track so mini player shows up
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
    });

    TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (event) => {
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
          const trackData = queue.find(t => t.id === track.id);
          if (trackData) {
            // Find the correct index in the queue
            const newIndex = queue.findIndex(t => t.id === track.id);
            
            // CRITICAL FIX: Update queue index to match the actual playing track
            // Only sync if indices are different (prevents unnecessary store updates)
            if (newIndex !== -1 && newIndex !== currentIndex) {
              skipToTrack(newIndex);
            }
            
            usePlayerStore.getState().setCurrentTrack(trackData);
            
            // Update streaming info based on whether track is downloaded
            const downloadedTrack = useDownloadStore.getState().getDownloadedTrack(trackData.id);
            if (downloadedTrack) {
              usePlayerStore.getState().setStreamingInfo({
                quality: '0',
                format: 'Downloaded',
                displayText: 'Downloaded',
                displayTextSimple: 'DOWNLOADED',
                networkType: 'unknown',
              });
            } else {
              // Update with current network settings
              this.getActiveStreamingSettings().then(streamingSettings => {
                // For MAX quality, show actual track bitrate/format in detailed view
                let detailedText = streamingSettings.displayText;
                if (streamingSettings.quality === '0' && trackData.bitRate && trackData.suffix) {
                  const format = trackData.suffix.toUpperCase();
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

            // Preload next tracks for gapless playback (async, don't await)
            const updatedIndex = useQueueStore.getState().currentIndex;
            const updatedQueue = useQueueStore.getState().queue;
            this.preloadNextTracks(updatedIndex, updatedQueue).catch(err => {
              console.error('[TrackPlayer] Failed to preload tracks:', err);
            });
          }
        }
      } else {
        // Track cleared - scrobble the previous track if needed
        scrobblingManager.onTrackChange(null, previousTrack, previousProgress.position, previousProgress.duration);
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      console.log('[TrackPlayer] Queue ended - handling track completion');
      const { repeatMode, currentTrack, progress } = usePlayerStore.getState();
      const { queue, currentIndex, skipToNext } = useQueueStore.getState();

      console.log('[TrackPlayer] Repeat mode:', repeatMode, 'Current index:', currentIndex, 'Queue length:', queue.length);

      // Scrobble the current track that just finished
      if (currentTrack) {
        await scrobblingManager.onTrackEnded(currentTrack, progress.position, progress.duration);
      }

      if (repeatMode === 'track') {
        // Repeat current track - just replay it
        console.log('[TrackPlayer] Repeating current track:', currentTrack?.title);
        await this.play();
      } else if (repeatMode === 'queue' || currentIndex < queue.length - 1) {
        // Skip to next track if:
        // - Repeat mode is 'queue' (loop back to start when reaching end)
        // - OR there are more tracks in the queue
        const hasNext = skipToNext();

        if (hasNext) {
          // Play next track in queue
          const nextTrack = queue[useQueueStore.getState().currentIndex];
          if (nextTrack) {
            console.log('[TrackPlayer] Playing next track:', nextTrack.title);
            usePlayerStore.getState().setCurrentTrack(nextTrack);
            await this.play();
          }
        } else if (repeatMode === 'queue' && queue.length > 0) {
          // Reached end of queue with repeat mode 'queue' - restart from beginning
          console.log('[TrackPlayer] Restarting queue from beginning');
          useQueueStore.getState().skipToTrack(0);
          const firstTrack = queue[0];
          if (firstTrack) {
            usePlayerStore.getState().setCurrentTrack(firstTrack);
            await this.play();
          }
        }
      } else {
        // Repeat mode is 'off' and no more tracks - stop playback
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
        const formatUpper = (formatForApi || streamingFormat).toUpperCase();
        displayText = `${quality} kbps ${formatUpper}`;
        
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
        displayText: streamingQualityMobile === '0' ? 'MAX' : `${streamingQualityMobile} kbps ${streamingFormatMobile.toUpperCase()}`,
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
   * Preload next tracks for gapless playback (initial load)
   */
  async preloadNextTracksInitial(currentIndex: number, queue: any[], streamingSettings: any) {
    try {
      // Check if gapless playback is enabled
      const settings = useSettingsStore.getState();
      if (!settings || !settings.gaplessPlayback) {
        return;
      }

      const tracksToPreload = 2; // Preload next 2 tracks

      for (let i = 1; i <= tracksToPreload; i++) {
        const nextIndex = currentIndex + i;
        if (nextIndex < queue.length) {
          const nextTrack = queue[nextIndex];
          if (!nextTrack || !nextTrack.id) {
            console.warn('[TrackPlayer] Skipping undefined track at index:', nextIndex);
            continue;
          }
          try {
            const nextTrackObj = await this.buildTrackObject(nextTrack, streamingSettings);
            await TrackPlayer.add(nextTrackObj);
            console.log('[TrackPlayer] Preloaded next track for gapless:', nextTrack.title);
          } catch (error) {
            console.error('[TrackPlayer] Failed to preload track:', error);
          }
        }
      }
    } catch (error) {
      console.error('[TrackPlayer] preloadNextTracksInitial error:', error);
    }
  }

  /**
   * Preload next tracks for gapless playback (during playback)
   */
  async preloadNextTracks(currentIndex: number, queue: any[]) {
    try {
      // Check if gapless playback is enabled
      const settings = useSettingsStore.getState();
      if (!settings || !settings.gaplessPlayback) {
        return;
      }

      const playerQueue = await TrackPlayer.getQueue();
      const playerQueueLength = playerQueue.length;

      // If we have less than 2 tracks in the player queue, add more
      if (playerQueueLength < 2) {
        const streamingSettings = await this.getActiveStreamingSettings();
        const tracksToAdd = 2 - playerQueueLength;

        for (let i = 1; i <= tracksToAdd; i++) {
          const nextIndex = currentIndex + i;
          if (nextIndex < queue.length) {
            const nextTrack = queue[nextIndex];
            if (!nextTrack || !nextTrack.id) {
              console.warn('[TrackPlayer] Skipping undefined track at index:', nextIndex);
              continue;
            }
            try {
              const nextTrackObj = await this.buildTrackObject(nextTrack, streamingSettings);
              await TrackPlayer.add(nextTrackObj);
              console.log('[TrackPlayer] Preloaded next track for gapless:', nextTrack.title);
            } catch (error) {
              console.error('[TrackPlayer] Failed to preload track:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('[TrackPlayer] preloadNextTracks error:', error);
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
          const format = currentTrack.suffix.toUpperCase();
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

      // Preload next tracks for gapless playback (async, non-blocking)
      // Skip preloading if repeat track is enabled - we don't want to auto-advance
      const { queue, currentIndex } = useQueueStore.getState();
      const { repeatMode: currentRepeatMode } = usePlayerStore.getState();
      if (currentRepeatMode !== 'track') {
        this.preloadNextTracksInitial(currentIndex, queue, streamingSettings).catch(err => {
          console.error('[TrackPlayer] Failed to preload initial tracks:', err);
        });
      }

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

    // Try to use native skip if track is already loaded (for gapless)
    try {
      const settings = useSettingsStore.getState();
      if (settings && settings.gaplessPlayback) {
        const playerQueue = await TrackPlayer.getQueue();
        
        if (playerQueue.find((t: any) => t.id === nextTrack.id)) {
          console.log('[TrackPlayer] Using native skip for gapless playback');
          await TrackPlayer.skipToNext();
          return;
        }
      }
    } catch (error) {
      console.warn('[TrackPlayer] Could not use native skip, falling back to play:', error);
    }

    // Otherwise, play the track normally
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
    if (this.intervalId) return;
    this.intervalId = setInterval(async () => {
      try {
        const position = await TrackPlayer.getPosition();
        const duration = await TrackPlayer.getDuration();
        const bufferedPosition = await TrackPlayer.getBufferedPosition();
        const { setProgress, setBufferedProgress } = usePlayerStore.getState();
        setProgress(position, duration);
        setBufferedProgress(bufferedPosition);
      } catch (error) {
        // Silent fail - don't spam console during normal operation
      }
    }, 1000); // 1 second updates for better performance
  }

  stopProgressTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
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
   * Sync TrackPlayer's internal queue with Zustand queue
   * This is critical when queue is modified (remove/reorder) to keep everything in sync
   */
  async syncQueueWithTrackPlayer() {
    try {
      const { queue, currentIndex } = useQueueStore.getState();
      const { currentTrack } = usePlayerStore.getState();
      
      if (!currentTrack || queue.length === 0) {
        console.log('[TrackPlayer] No track playing, skipping queue sync');
        return;
      }

      // Verify current track is still in queue at currentIndex
      const trackAtCurrentIndex = queue[currentIndex];
      if (!trackAtCurrentIndex || trackAtCurrentIndex.id !== currentTrack.id) {
        console.warn('[TrackPlayer] Current track mismatch after queue modification');
        // Update to the track at currentIndex
        const newCurrentTrack = queue[currentIndex];
        if (newCurrentTrack) {
          usePlayerStore.getState().setCurrentTrack(newCurrentTrack);
          await this.play(); // Play the new current track
          return;
        }
      }

      // Current track is still correct, just need to sync the preloaded tracks
      console.log('[TrackPlayer] Current track unchanged, syncing preloaded tracks');
      
      // Get TrackPlayer's current queue
      const playerQueue = await TrackPlayer.getQueue();
      
      // Check if gapless playback is enabled
      const settings = useSettingsStore.getState();
      if (!settings || !settings.gaplessPlayback) {
        console.log('[TrackPlayer] Gapless playback disabled, no sync needed');
        return;
      }
      
      // Remove all tracks except the first one (currently playing)
      // TrackPlayer keeps index 0 as the current track
      for (let i = playerQueue.length - 1; i > 0; i--) {
        await TrackPlayer.remove(i);
      }
      
      console.log('[TrackPlayer] Cleared preloaded tracks');
      
      // Get streaming settings
      const streamingSettings = await this.getActiveStreamingSettings();

      // Preload next tracks based on updated queue
      this.preloadNextTracksInitial(currentIndex, queue, streamingSettings).catch(err => {
        console.error('[TrackPlayer] Failed to preload tracks after queue sync:', err);
      });

      console.log('[TrackPlayer] Queue sync completed - preloaded tracks updated');
    } catch (error) {
      console.error('[TrackPlayer] Failed to sync queue:', error);
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
          const format = currentTrack.suffix.toUpperCase();
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
        const format = currentTrack.suffix.toUpperCase();
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
