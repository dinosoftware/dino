 /**
 * Dino Music App - UPNP Player Service
 * Implements PlayerService for UPNP/DLNA devices
 */

import { PlayerService } from '../player/types';
import { upnpController } from './UpnpController';
import { getStreamUrl, getCoverArtUrl } from '../../api/opensubsonic/streaming';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';
import { useRemotePlaybackStore, RemoteDevice } from '../../stores/remotePlaybackStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTrackArtistString } from '../../utils/artistUtils';

let previousTrackId: string | null = null;

class UpnpPlayerService implements PlayerService {
  isInitialized = false;
  private device: RemoteDevice | null = null;
  private statePollInterval: ReturnType<typeof setInterval> | null = null;
  private positionPollInterval: ReturnType<typeof setInterval> | null = null;
  private trackChangeUnsubscribe: (() => void) | null = null;
  private wasPlaying: boolean = false;

  async initialize(): Promise<void> {
    this.setupTrackWatcher();
    this.isInitialized = true;
    console.log('[UpnpPlayer] Initialized');
  }

  private setupTrackWatcher(): void {
    this.trackChangeUnsubscribe = usePlayerStore.subscribe(
      (state, prevState) => {
        const activePlayerType = useRemotePlaybackStore.getState().activePlayerType;
        if (activePlayerType !== 'upnp' || !this.device) return;

        const currentTrackId = state.currentTrack?.id || null;
        const prevTrackId = prevState.currentTrack?.id || null;

        if (currentTrackId && currentTrackId !== prevTrackId) {
          console.log('[UpnpPlayer] Track changed from', prevTrackId, 'to', currentTrackId);
          previousTrackId = currentTrackId;
          this.play().catch(err => console.error('[UpnpPlayer] Auto-play failed:', err));
        }
      }
    );
  }

  async connect(device: RemoteDevice): Promise<void> {
    this.device = device;
    previousTrackId = null;
    useRemotePlaybackStore.getState().setActivePlayerType('upnp');
    this.startStatePolling();
    console.log('[UpnpPlayer] Connected to:', device.name);
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      await upnpController.stop(this.device);
    }
    this.stopStatePolling();
    this.device = null;
    previousTrackId = null;
    useRemotePlaybackStore.getState().setActivePlayerType('local');
    console.log('[UpnpPlayer] Disconnected');
  }

  private startStatePolling(): void {
    this.statePollInterval = setInterval(async () => {
      if (!this.device) return;

      try {
        const state = await upnpController.getState(this.device);
        const playbackState = state as 'playing' | 'paused' | 'stopped' | 'buffering';
        usePlayerStore.getState().setPlaybackState(playbackState);

        // Detect track ended (transition from playing to stopped)
        if (this.wasPlaying && playbackState === 'stopped') {
          console.log('[UpnpPlayer] Track ended, skipping to next');
          await this.skipToNext();
        }
        this.wasPlaying = playbackState === 'playing';
      } catch (error) {
        console.error('[UpnpPlayer] Failed to get state:', error);
      }
    }, 2000);

    this.positionPollInterval = setInterval(async () => {
      if (!this.device) return;

      try {
        const { position, duration } = await upnpController.getPosition(this.device);
        if (duration > 0) {
          usePlayerStore.getState().setProgress(position, duration);
        }
      } catch (error) {
        console.error('[UpnpPlayer] Failed to get position:', error);
      }
    }, 2000);
  }

  private stopStatePolling(): void {
    if (this.statePollInterval) {
      clearInterval(this.statePollInterval);
      this.statePollInterval = null;
    }
    if (this.positionPollInterval) {
      clearInterval(this.positionPollInterval);
      this.positionPollInterval = null;
    }
  }

  async play(): Promise<void> {
    const { currentTrack } = usePlayerStore.getState();
    if (!currentTrack || !this.device) {
      console.log('[UpnpPlayer] Cannot play: no track or device');
      return;
    }

    const { upnpQuality, upnpFormat } = useSettingsStore.getState();
    console.log('[UpnpPlayer] Getting stream URL for track:', currentTrack.id);
    const streamUrl = await getStreamUrl(currentTrack.id, upnpQuality, upnpFormat);
    console.log('[UpnpPlayer] Stream URL:', streamUrl);
    
    const coverArtUrl = currentTrack.coverArt
      ? await getCoverArtUrl(currentTrack.coverArt, 500)
      : undefined;

    console.log('[UpnpPlayer] Loading track on device:', this.device.name);
    const loaded = await upnpController.load(this.device, streamUrl, {
      title: currentTrack.title,
      artist: getTrackArtistString(currentTrack),
      album: currentTrack.album || 'Unknown Album',
      coverUrl: coverArtUrl,
    });
    console.log('[UpnpPlayer] Load result:', loaded);

    if (loaded) {
      const played = await upnpController.play(this.device);
      console.log('[UpnpPlayer] Play result:', played);
      usePlayerStore.getState().setPlaybackState('playing');
      console.log('[UpnpPlayer] Playing:', currentTrack.title);
    } else {
      console.error('[UpnpPlayer] Failed to load track');
    }
  }

  async pause(): Promise<void> {
    if (this.device) {
      await upnpController.pause(this.device);
      console.log('[UpnpPlayer] Paused');
    }
  }

  async togglePlayPause(): Promise<void> {
    if (!this.device) return;
    const state = await upnpController.getState(this.device);
    if (state === 'playing') {
      await upnpController.pause(this.device);
    } else {
      await upnpController.play(this.device);
    }
  }

  async seekTo(position: number): Promise<void> {
    if (this.device) {
      await upnpController.seek(this.device, position);
      console.log('[UpnpPlayer] Seeked to:', position);
    }
  }

  async stop(): Promise<void> {
    if (this.device) {
      await upnpController.stop(this.device);
      console.log('[UpnpPlayer] Stopped');
    }
  }

  async skipToNext(): Promise<void> {
    const { skipToNext, queue, currentIndex } = useQueueStore.getState();
    console.log('[UpnpPlayer] skipToNext called, current index:', currentIndex, 'queue length:', queue.length);
    const hasNext = skipToNext();
    console.log('[UpnpPlayer] hasNext:', hasNext);
    if (hasNext) {
      const newIndex = useQueueStore.getState().currentIndex;
      const newTrack = useQueueStore.getState().queue[newIndex];
      console.log('[UpnpPlayer] New track:', newTrack?.title);
      usePlayerStore.getState().setCurrentTrack(newTrack);
      await this.play();
    }
  }

  async skipToPrevious(): Promise<void> {
    const { skipToPrevious, queue, currentIndex } = useQueueStore.getState();
    console.log('[UpnpPlayer] skipToPrevious called, current index:', currentIndex, 'queue length:', queue.length);
    const hasPrev = skipToPrevious();
    console.log('[UpnpPlayer] hasPrev:', hasPrev);
    if (hasPrev) {
      const newIndex = useQueueStore.getState().currentIndex;
      const newTrack = useQueueStore.getState().queue[newIndex];
      console.log('[UpnpPlayer] New track:', newTrack?.title);
      usePlayerStore.getState().setCurrentTrack(newTrack);
      await this.play();
    }
  }

  async playTrack(index: number): Promise<void> {
    const { skipToTrack } = useQueueStore.getState();
    skipToTrack(index);
    await this.play();
  }

  async setVolume(volume: number): Promise<void> {
    if (this.device) {
      await upnpController.setVolume(this.device, volume * 100);
    }
  }

  async getVolume(): Promise<number> {
    if (this.device) {
      return upnpController.getVolume(this.device);
    }
    return 1;
  }

  async saveState(): Promise<{ position: number; isPlaying: boolean }> {
    if (!this.device) return { position: 0, isPlaying: false };

    try {
      const { position } = await upnpController.getPosition(this.device);
      const state = await upnpController.getState(this.device);

      return {
        position,
        isPlaying: state === 'playing',
      };
    } catch (error) {
      console.error('[UpnpPlayer] Failed to save state:', error);
      return { position: 0, isPlaying: false };
    }
  }

  async destroy(): Promise<void> {
    this.stopStatePolling();
    console.log('[UpnpPlayer] Destroyed');
  }
}

export const upnpPlayerService = new UpnpPlayerService();

