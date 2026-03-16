 /**
 * Dino Music App - Cast Player Service
 * Implements PlayerService for Google Cast
 */

import GoogleCast from 'react-native-google-cast';
import { PlayerService } from '../player/types';
import { getStreamUrl, getCoverArtUrl } from '../../api/opensubsonic/streaming';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';
import { useRemotePlaybackStore, RemoteDevice } from '../../stores/remotePlaybackStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTrackArtistString } from '../../utils/artistUtils';

class CastPlayerService implements PlayerService {
  isInitialized = false;
  private eventUnsubscribers: (() => void)[] = [];
  private currentMediaId: string | null = null;
  private progressPollInterval: ReturnType<typeof setInterval> | null = null;

  async initialize(): Promise<void> {
    this.setupEventListeners();
    this.isInitialized = true;
    console.log('[CastPlayer] Initialized');
  }

  private setupEventListeners(): void {
    const sessionManager = GoogleCast.getSessionManager();

    const suspendedSub = sessionManager.onSessionSuspended(() => {
      console.log('[CastPlayer] Session suspended');
      this.cleanupEvents();
      this.stopProgressPoll();
      useRemotePlaybackStore.getState().selectDevice(null);
      useRemotePlaybackStore.getState().setActivePlayerType('local');
    });
    this.eventUnsubscribers.push(() => suspendedSub.remove());

    const endedSub = sessionManager.onSessionEnded(() => {
      console.log('[CastPlayer] Session ended');
      this.cleanupEvents();
      this.stopProgressPoll();
    });
    this.eventUnsubscribers.push(() => endedSub.remove());
  }

  private setupMediaEventListeners(client: any): void {
    this.cleanupMediaEvents();

    const statusSub = client.onMediaStatusUpdated((mediaStatus: any) => {
      if (!mediaStatus) return;
      const playerState = mediaStatus.playerState;
      console.log('[CastPlayer] Media status updated:', playerState);
      
      const { setPlaybackState, setProgress, progress } = usePlayerStore.getState();
      if (playerState === 'playing') {
        setPlaybackState('playing');
      } else if (playerState === 'paused') {
        setPlaybackState('paused');
      } else if (playerState === 'buffering' || playerState === 'loading') {
        setPlaybackState('buffering');
      } else {
        setPlaybackState('stopped');
      }
      
      if (mediaStatus.streamPosition !== undefined && mediaStatus.streamPosition !== null) {
        setProgress(mediaStatus.streamPosition, progress.duration);
      }
    });
    this.eventUnsubscribers.push(() => statusSub.remove());

    const playbackEndedSub = client.onMediaPlaybackEnded(async () => {
      console.log('[CastPlayer] Media playback ended');
      const { repeatMode } = usePlayerStore.getState();
      
      if (repeatMode === 'track') {
        await this.seekTo(0);
        const c = await this.getClient();
        await c?.play();
      } else {
        await this.skipToNext();
      }
    });
    this.eventUnsubscribers.push(() => playbackEndedSub.remove());
  }

  private startProgressPoll(): void {
    this.stopProgressPoll();
    this.progressPollInterval = setInterval(async () => {
      try {
        const client = await this.getClient();
        if (!client) return;
        
        const position = await client.getStreamPosition();
        const { progress, setProgress } = usePlayerStore.getState();
        if (position !== null && position !== undefined) {
          setProgress(position, progress.duration);
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 1000);
  }

  private stopProgressPoll(): void {
    if (this.progressPollInterval) {
      clearInterval(this.progressPollInterval);
      this.progressPollInterval = null;
    }
  }

  private cleanupMediaEvents(): void {
    while (this.eventUnsubscribers.length > 2) {
      const unsub = this.eventUnsubscribers.pop();
      if (unsub) unsub();
    }
  }

  private cleanupEvents(): void {
    this.eventUnsubscribers.forEach((unsub) => unsub());
    this.eventUnsubscribers = [];
  }

  private async getClient(): Promise<any> {
    const sessionManager = GoogleCast.getSessionManager();
    const currentSession = await sessionManager.getCurrentCastSession();
    return currentSession?.client;
  }

  async connect(device: RemoteDevice): Promise<void> {
    if (!GoogleCast) {
      throw new Error('Google Cast not available');
    }

    const sessionManager = GoogleCast.getSessionManager();
    
    // End any existing session first
    const currentSession = await sessionManager.getCurrentCastSession();
    if (currentSession) {
      try {
        await sessionManager.endCurrentSession(true);
      } catch (e) {
        console.log('[CastPlayer] Could not end existing session:', e);
      }
    }

    return new Promise((resolve, reject) => {
      const subscriptions: { remove: () => void }[] = [];
      let resolved = false;
      
      const cleanup = () => {
        clearTimeout(timeoutId);
        subscriptions.forEach((sub) => sub.remove());
      };
      
      const timeoutId = setTimeout(() => {
        if (resolved) return;
        cleanup();
        reject(new Error('Connection to device timed out'));
      }, 30000);

      subscriptions.push(sessionManager.onSessionStarted(async () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        
        // Wait a bit for session to fully establish
        await new Promise(r => setTimeout(r, 500));
        
        const client = await this.getClient();
        if (client) {
          this.setupMediaEventListeners(client);
        }
        
        console.log('[CastPlayer] Connected to:', device.name);
        resolve();
      }));

      subscriptions.push(sessionManager.onSessionStartFailed((_: any, error: string) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        console.error('[CastPlayer] Connection failed:', error);
        reject(new Error(error));
      }));

      subscriptions.push(sessionManager.onSessionEnded(() => {
        if (resolved) return;
        resolved = true;
        cleanup();
        console.log('[CastPlayer] Session ended during connection');
        reject(new Error('Session ended'));
      }));

      sessionManager.startSession(device.id);
    });
  }

  async disconnect(): Promise<void> {
    this.stopProgressPoll();
    this.cleanupEvents();
    this.currentMediaId = null;
    
    const sessionManager = GoogleCast.getSessionManager();
    
    try {
      const client = await this.getClient();
      if (client) {
        await client.stop().catch(() => {});
      }
    } catch (e) {
      console.log('[CastPlayer] Error stopping during disconnect:', e);
    }
    
    try {
      await sessionManager.endCurrentSession(true);
    } catch (e) {
      console.log('[CastPlayer] Error ending session:', e);
    }
    
    console.log('[CastPlayer] Disconnected');
  }

  async play(): Promise<void> {
    const { currentTrack, setPlaybackState, setProgress, setCurrentTrack } = usePlayerStore.getState();
    
    if (!currentTrack) return;

    const client = await this.getClient();
    if (!client) return;

    if (this.currentMediaId === currentTrack.id) {
      await client.play();
      setPlaybackState('playing');
      this.startProgressPoll();
      return;
    }

    const { castQuality, castFormat } = useSettingsStore.getState();
    const streamUrl = await getStreamUrl(currentTrack.id, castQuality, castFormat);
    const coverArtUrl = currentTrack.coverArt
      ? await getCoverArtUrl(currentTrack.coverArt, 500)
      : undefined;

    setCurrentTrack(currentTrack);
    setPlaybackState('buffering');
    setProgress(0, currentTrack.duration);

    await client.loadMedia({
      mediaInfo: {
        contentUrl: streamUrl,
        contentType: 'audio/mpeg',
        streamType: 'buffered',
        metadata: {
          type: 'musicTrack',
          title: currentTrack.title,
          artist: getTrackArtistString(currentTrack),
          albumName: currentTrack.album || 'Unknown Album',
          images: coverArtUrl ? [
            { url: coverArtUrl, width: 1024, height: 1024 },
            { url: coverArtUrl, width: 500, height: 500 }
          ] : [],
          duration: currentTrack.duration,
        },
      },
    });

    this.currentMediaId = currentTrack.id;
    this.startProgressPoll();
    console.log('[CastPlayer] Playing:', currentTrack.title);
  }

  async pause(): Promise<void> {
    const client = await this.getClient();
    await client?.pause();
    usePlayerStore.getState().setPlaybackState('paused');
    this.stopProgressPoll();
    console.log('[CastPlayer] Paused');
  }

  async togglePlayPause(): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    
    const status = await client.getMediaStatus();
    
    if (status?.playerState === 'playing') {
      await client.pause();
      usePlayerStore.getState().setPlaybackState('paused');
      this.stopProgressPoll();
    } else {
      const { currentTrack } = usePlayerStore.getState();
      if (!status?.playerState && currentTrack) {
        await this.play();
      } else {
        await client.play();
        usePlayerStore.getState().setPlaybackState('playing');
        this.startProgressPoll();
      }
    }
  }

  async seekTo(position: number): Promise<void> {
    const client = await this.getClient();
    await client?.seek({ position });
    const { progress, setProgress } = usePlayerStore.getState();
    setProgress(position, progress.duration);
    console.log('[CastPlayer] Seeked to:', position);
  }

  async stop(): Promise<void> {
    const client = await this.getClient();
    await client?.stop();
    usePlayerStore.getState().setPlaybackState('stopped');
    this.stopProgressPoll();
    this.currentMediaId = null;
    console.log('[CastPlayer] Stopped');
  }

  async skipToNext(): Promise<void> {
    const { skipToNext, queue, currentIndex } = useQueueStore.getState();
    const { repeatMode } = usePlayerStore.getState();
    
    if (currentIndex >= queue.length - 1 && repeatMode !== 'queue') {
      console.log('[CastPlayer] End of queue');
      await this.stop();
      return;
    }
    
    const hasNext = skipToNext();
    if (!hasNext) {
      console.log('[CastPlayer] Could not skip to next');
      return;
    }
    
    // Get the new track from queue after skip
    const { queue: updatedQueue, currentIndex: newIndex } = useQueueStore.getState();
    const newTrack = updatedQueue[newIndex];
    
    if (newTrack) {
      usePlayerStore.getState().setCurrentTrack(newTrack);
      await this.play();
    }
  }

  async skipToPrevious(): Promise<void> {
    const { skipToPrevious } = useQueueStore.getState();
    const hasPrev = skipToPrevious();
    if (!hasPrev) {
      console.log('[CastPlayer] Could not skip to previous');
      return;
    }
    
    // Get the new track from queue after skip
    const { queue, currentIndex } = useQueueStore.getState();
    const newTrack = queue[currentIndex];
    
    if (newTrack) {
      usePlayerStore.getState().setCurrentTrack(newTrack);
      await this.play();
    }
  }

  async playTrack(index: number): Promise<void> {
    const { skipToTrack, queue } = useQueueStore.getState();
    skipToTrack(index);
    
    const newTrack = queue[index];
    if (newTrack) {
      usePlayerStore.getState().setCurrentTrack(newTrack);
      await this.play();
    }
  }

  async setVolume(volume: number): Promise<void> {
    const client = await this.getClient();
    await client?.setVolume(Math.max(0, Math.min(1, volume)));
  }

  async getVolume(): Promise<number> {
    const client = await this.getClient();
    return client?.getVolume?.() ?? 1;
  }

  async saveState(): Promise<{ position: number; isPlaying: boolean }> {
    const client = await this.getClient();
    if (!client) return { position: 0, isPlaying: false };

    try {
      const position = await client.getStreamPosition();
      const status = await client.getMediaStatus();
      return {
        position,
        isPlaying: status?.playerState === 'playing',
      };
    } catch (error) {
      console.error('[CastPlayer] Failed to save state:', error);
      return { position: 0, isPlaying: false };
    }
  }

  async destroy(): Promise<void> {
    this.stopProgressPoll();
    this.cleanupEvents();
    console.log('[CastPlayer] Destroyed');
  }
}

export const castPlayerService = new CastPlayerService();
