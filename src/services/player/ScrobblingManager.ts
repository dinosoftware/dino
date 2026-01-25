/**
 * Dino Music App - Scrobbling Manager
 * Handles track play counting and scrobbling to server
 * Also triggers queue sync when updating playback progress
 */

import { scrobble } from '../../api/opensubsonic/streaming';
import { usePlayerStore } from '../../stores';
import { Track } from '../../api/opensubsonic/types';
import { queueSyncManager } from './QueueSyncManager';

interface ScrobbleState {
  currentTrackId: string | null;
  hasScrobbledNowPlaying: boolean;
  hasScrobbledSubmission: boolean;
  lastProgressUpdate: number;
}

class ScrobblingManager {
  private state: ScrobbleState = {
    currentTrackId: null,
    hasScrobbledNowPlaying: false,
    hasScrobbledSubmission: false,
    lastProgressUpdate: 0,
  };

  private progressUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private readonly PROGRESS_UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly SCROBBLE_THRESHOLD = 0.8; // 80% of track or 4 minutes

  /**
   * Start scrobbling manager
   */
  start() {
    console.log('[Scrobbling] 🚀 Starting manager with interval:', this.PROGRESS_UPDATE_INTERVAL);
    
    // Clear existing interval
    this.stop();

    // Setup periodic progress updates (30 seconds)
    this.progressUpdateInterval = setInterval(() => {
      console.log('[Scrobbling] ⏰ Interval triggered, calling updateProgress()');
      this.updateProgress();
    }, this.PROGRESS_UPDATE_INTERVAL);
    
    console.log('[Scrobbling] ✅ Manager started, interval ID:', this.progressUpdateInterval);
  }

  /**
   * Stop scrobbling manager
   */
  stop() {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = null;
    }
    console.log('[Scrobbling] Stopped');
  }

  /**
   * Handle track change - send "now playing" scrobble
   */
  async onTrackChange(track: Track | null, previousTrack?: Track | null, position?: number, duration?: number): Promise<void> {
    // If we had a previous track, check if we should scrobble it before changing
    if (previousTrack && position !== undefined && duration !== undefined) {
      const pos = position;
      const dur = duration || previousTrack.duration;
      console.log('[Scrobbling] Track changed, checking if previous track should be scrobbled:', previousTrack.title);
      // Force check even if already scrobbled, in case track changed before periodic update
      await this.onTrackPlayed(previousTrack, pos, dur, true);
    }

    if (!track) {
      this.resetState();
      return;
    }

    // Reset state for new track
    this.state = {
      currentTrackId: track.id,
      hasScrobbledNowPlaying: false,
      hasScrobbledSubmission: false,
      lastProgressUpdate: 0,
    };

    // Send "now playing" scrobble
    try {
      console.log('[Scrobbling] Sending now playing for:', track.title);
      await scrobble(track.id, undefined, false);
      this.state.hasScrobbledNowPlaying = true;
    } catch (error) {
      console.error('[Scrobbling] Failed to send now playing:', error);
    }
  }

  /**
   * Handle track completion or significant playback (80% or 4 minutes)
   * Send submission scrobble
   */
  async onTrackPlayed(track: Track, position: number, duration: number, force: boolean = false): Promise<void> {
    // Don't scrobble if already scrobbled (unless forced, like on track change)
    if (!force && this.state.hasScrobbledSubmission && this.state.currentTrackId === track.id) {
      console.log('[Scrobbling] Already scrobbled this track, skipping');
      return;
    }

    // Check if track has been played enough to count (80% or 4 minutes)
    const playedPercentage = duration > 0 ? position / duration : 0;
    const playedMinutes = position / 60;

    const shouldScrobble = playedPercentage >= this.SCROBBLE_THRESHOLD || playedMinutes >= 4;

    console.log('[Scrobbling] Checking if should scrobble:', track.title, {
      position: position.toFixed(1),
      duration: duration.toFixed(1),
      percentage: (playedPercentage * 100).toFixed(1) + '%',
      playedMinutes: playedMinutes.toFixed(1),
      shouldScrobble,
      force,
    });

    if (!shouldScrobble) {
      return;
    }

    try {
      console.log('[Scrobbling] Submitting scrobble for:', track.title);

      // Send submission scrobble
      await scrobble(track.id, Math.floor(Date.now() / 1000), true);
      this.state.hasScrobbledSubmission = true;

      console.log('[Scrobbling] ✅ Successfully scrobbled:', track.title);
    } catch (error) {
      console.error('[Scrobbling] ❌ Failed to submit scrobble:', error);
    }
  }

  /**
   * Update playback progress periodically (every 30 seconds)
   * This also triggers queue sync with current position
   */
  private async updateProgress(): Promise<void> {
    const { currentTrack, playbackState, progress } = usePlayerStore.getState();

    // Only update if playing
    if (playbackState !== 'playing' || !currentTrack) {
      return;
    }

    const now = Date.now();
    
    // Don't update too frequently (though interval should prevent this)
    if (now - this.state.lastProgressUpdate < this.PROGRESS_UPDATE_INTERVAL - 1000) {
      return;
    }

    this.state.lastProgressUpdate = now;

    const position = progress.position;
    const duration = progress.duration || currentTrack.duration;

    console.log('[Scrobbling] Updating progress:', {
      track: currentTrack.title,
      position: position.toFixed(1),
      duration: duration.toFixed(1),
    });

    // Check if we should submit scrobble (50% or 4 minutes)
    await this.onTrackPlayed(currentTrack, position, duration);

    // IMPORTANT: Sync queue to server with current position
    // This is where queue sync happens together with progress updates
    try {
      console.log('[Scrobbling] Syncing queue with position:', position.toFixed(1));
      await queueSyncManager.syncToServer(position);
    } catch (error) {
      console.error('[Scrobbling] Failed to sync queue during progress update:', error);
    }
  }

  /**
   * Handle playback state change
   */
  async onPlaybackStateChange(state: 'playing' | 'paused' | 'stopped'): Promise<void> {
    if (state === 'stopped') {
      // Track stopped - check if we should scrobble
      const { currentTrack, progress } = usePlayerStore.getState();
      if (currentTrack) {
        await this.onTrackPlayed(currentTrack, progress.position, progress.duration);
      }
      this.resetState();
    } else if (state === 'paused') {
      // Track paused - sync current position
      const { currentTrack, progress } = usePlayerStore.getState();
      if (currentTrack) {
        await queueSyncManager.syncToServer(progress.position);
      }
    }
  }

  /**
   * Handle seek - update progress immediately
   */
  async onSeek(position: number): Promise<void> {
    console.log('[Scrobbling] Seek detected, syncing position:', position.toFixed(1));
    await queueSyncManager.syncToServer(position);
  }

  /**
   * Reset scrobble state
   */
  private resetState(): void {
    this.state = {
      currentTrackId: null,
      hasScrobbledNowPlaying: false,
      hasScrobbledSubmission: false,
      lastProgressUpdate: 0,
    };
  }

  /**
   * Force immediate progress update and queue sync
   * Useful for app backgrounding or user-initiated sync
   */
  async forceUpdate(): Promise<void> {
    const { currentTrack, playbackState, progress } = usePlayerStore.getState();

    if (playbackState === 'playing' && currentTrack) {
      console.log('[Scrobbling] Force updating progress and queue');
      this.state.lastProgressUpdate = 0; // Reset to allow immediate update
      await this.updateProgress();
    }
  }
}

export const scrobblingManager = new ScrobblingManager();
