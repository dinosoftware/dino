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
import { PlaybackService } from './PlaybackService';
import { queueSyncManager } from './QueueSyncManager';
import { scrobblingManager } from './ScrobblingManager';

// Register the playback service
TrackPlayer.registerPlaybackService(() => PlaybackService);

class TrackPlayerService {
  private isInitialized = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private networkCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastNetworkType: 'wifi' | 'mobile' | 'unknown' = 'unknown';

  /**
   * Initialize the player service
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('[TrackPlayer] Initializing...');

    try {
      await TrackPlayer.setupPlayer({
        waitForBuffer: true,
        autoHandleInterruptions: true,
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

      // Load queue from local storage first
      await useQueueStore.getState().loadFromStorage();
      console.log('[TrackPlayer] Local queue loaded');

      // Try to load queue from server (will check for conflicts)
      try {
        const usedServerQueue = await queueSyncManager.loadFromServer();
        if (usedServerQueue) {
          console.log('[TrackPlayer] Loaded queue from server');
          // If we loaded server queue and it has tracks, restore current track
          const { queue, currentIndex } = useQueueStore.getState();
          if (queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length) {
            const currentTrack = queue[currentIndex];
            usePlayerStore.getState().setCurrentTrack(currentTrack);
            console.log('[TrackPlayer] Restored current track from server queue');
          }
        } else {
          console.log('[TrackPlayer] Using local queue');
        }
      } catch (error) {
        console.error('[TrackPlayer] Failed to load server queue, using local:', error);
      }

      // Start queue sync and scrobbling managers
      queueSyncManager.start();
      scrobblingManager.start();

      this.isInitialized = true;
      console.log('[TrackPlayer] Initialized successfully');
    } catch (error) {
      console.error('[TrackPlayer] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
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
      const { currentTrack: previousTrack, progress: previousProgress } = usePlayerStore.getState();
      
      if (event.nextTrack !== undefined) {
        const track = await TrackPlayer.getTrack(event.nextTrack);
        if (track) {
          const { queue } = useQueueStore.getState();
          const trackData = queue.find(t => t.id === track.id);
          if (trackData) {
            usePlayerStore.getState().setCurrentTrack(trackData);
            // Notify scrobbling manager about track change with previous track info
            scrobblingManager.onTrackChange(
              trackData,
              previousTrack,
              previousProgress.position,
              previousProgress.duration
            );
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

      // Scrobble the current track that just finished
      if (currentTrack) {
        await scrobblingManager.onTrackEnded(currentTrack, progress.position, progress.duration);
      }

      if (repeatMode === 'track') {
        // Repeat current track
        console.log('[TrackPlayer] Repeating current track');
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
  private async getActiveStreamingSettings() {
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

      // Generate display text
      let displayText: string;
      if (quality === '0' || streamingFormat === 'original') {
        displayText = 'MAX';
      } else {
        const formatUpper = (formatForApi || streamingFormat).toUpperCase();
        displayText = `${quality} kbps ${formatUpper}`;
      }

      const networkType = isWiFi ? 'wifi' : networkState.type === Network.NetworkStateType.CELLULAR ? 'mobile' : 'unknown';

      return {
        maxBitRate: maxBitRateForApi,
        format: formatForApi,
        displayText,
        quality,
        formatName: streamingFormat,
        networkType: networkType as 'wifi' | 'mobile' | 'unknown',
      };
    } catch (error) {
      console.error('[TrackPlayer] Failed to get network state:', error);
      // Fallback to mobile quality and format
      const fallbackMaxBitRate = streamingQualityMobile === '0' ? undefined : streamingQualityMobile;
      const fallbackFormat = streamingFormatMobile === 'original' ? undefined : streamingFormatMobile;
      return {
        maxBitRate: fallbackMaxBitRate,
        format: fallbackFormat,
        displayText: streamingQualityMobile === '0' ? 'MAX' : `${streamingQualityMobile} kbps ${streamingFormatMobile.toUpperCase()}`,
        quality: streamingQualityMobile,
        formatName: streamingFormatMobile,
        networkType: 'unknown' as const,
      };
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
      // Get active streaming settings based on network
      const streamingSettings = await this.getActiveStreamingSettings();

      console.log('[TrackPlayer] Streaming settings:', {
        quality: streamingSettings.quality,
        format: streamingSettings.formatName,
        network: streamingSettings.networkType,
        display: streamingSettings.displayText,
        maxBitRateForApi: streamingSettings.maxBitRate,
        formatForApi: streamingSettings.format,
      });

      // Update streaming info in store
      usePlayerStore.getState().setStreamingInfo({
        quality: streamingSettings.quality,
        format: streamingSettings.formatName,
        displayText: streamingSettings.displayText,
        networkType: streamingSettings.networkType,
      });

      // Get stream URL with transcoding parameters
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

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: currentTrack.id,
        url: streamUrl,
        title: currentTrack.title,
        artist: currentTrack.artist || 'Unknown Artist',
        artwork: coverArtUrl,
        duration: currentTrack.duration,
      });

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
    const { skipToNext } = useQueueStore.getState();
    const hasNext = skipToNext();
    if (hasNext) {
      const { queue, currentIndex } = useQueueStore.getState();
      const nextTrack = queue[currentIndex];
      if (nextTrack) {
        usePlayerStore.getState().setCurrentTrack(nextTrack);
        await this.play();
      }
    }
  }

  async skipToPrevious() {
    const position = await TrackPlayer.getPosition();
    if (position > 10) {
      await TrackPlayer.seekTo(0);
      return;
    }
    const { skipToPrevious } = useQueueStore.getState();
    const hasPrevious = skipToPrevious();
    if (hasPrevious) {
      const { queue, currentIndex } = useQueueStore.getState();
      const previousTrack = queue[currentIndex];
      if (previousTrack) {
        usePlayerStore.getState().setCurrentTrack(previousTrack);
        await this.play();
      }
    }
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

  private startProgressTracking() {
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
        console.warn('[TrackPlayer] Progress tracking error:', error);
      }
    }, 1000); // Changed from 250ms to 1000ms - Much less frequent updates
  }

  private stopProgressTracking() {
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
   * Start monitoring network changes
   */
  private startNetworkMonitoring() {
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
  private async detectInitialNetwork() {
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
  private setupNetworkEventListener() {
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
          console.log(`[TrackPlayer] Network event detected: ${this.lastNetworkType} → ${newNetworkType}`);
          this.lastNetworkType = newNetworkType;
          this.handleNetworkChange(newNetworkType);
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
  private async checkNetworkChange() {
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

      // Check if network type changed
      if (currentNetworkType !== this.lastNetworkType && this.lastNetworkType !== 'unknown') {
        console.log(`[TrackPlayer] Network poll detected change: ${this.lastNetworkType} → ${currentNetworkType}`);
        this.lastNetworkType = currentNetworkType;
        await this.handleNetworkChange(currentNetworkType);
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
  private stopNetworkMonitoring() {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }
  }

  /**
   * Handle network change - ALWAYS switch immediately for consistency
   */
  private async handleNetworkChange(newNetworkType: 'wifi' | 'mobile' | 'unknown') {
    const { currentTrack, playbackState } = usePlayerStore.getState();

    // Only handle network change if something is currently playing or paused
    if (!currentTrack || playbackState === 'stopped') {
      console.log('[TrackPlayer] No active track, skipping network change handling');
      return;
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
      usePlayerStore.getState().setStreamingInfo({
        quality: streamingSettings.quality,
        format: streamingSettings.formatName,
        displayText: streamingSettings.displayText,
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
