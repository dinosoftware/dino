/**
 * Dino Music App - Player Router
 * Abstracts player selection and delegates calls to active service
 */

import { PlayerService } from './types';
import { PlayerType, RemoteDevice, useRemotePlaybackStore } from '../../stores/remotePlaybackStore';
import { nitroPlayerService } from './NitroPlayerService';

class PlayerRouter {
  private players: Partial<Record<PlayerType, PlayerService>> = {
    local: nitroPlayerService,
  };

  private get activePlayer(): PlayerService {
    const type = useRemotePlaybackStore.getState().activePlayerType;
    const player = this.players[type];
    if (!player) {
      console.warn('[PlayerRouter] Player not available:', type, ', falling back to local');
      return nitroPlayerService;
    }
    return player;
  }

  registerPlayer(type: PlayerType, service: PlayerService): void {
    this.players[type] = service;
    console.log('[PlayerRouter] Registered player:', type);
  }

  unregisterPlayer(type: PlayerType): void {
    delete this.players[type];
    console.log('[PlayerRouter] Unregistered player:', type);
  }

  getActivePlayerType(): PlayerType {
    return useRemotePlaybackStore.getState().activePlayerType;
  }

  async setActivePlayer(type: PlayerType): Promise<void> {
    console.log('[PlayerRouter] Setting active player:', type);
    useRemotePlaybackStore.getState().setActivePlayerType(type);
  }

  async play(): Promise<void> {
    return this.activePlayer.play();
  }

  async pause(): Promise<void> {
    return this.activePlayer.pause();
  }

  async togglePlayPause(): Promise<void> {
    return this.activePlayer.togglePlayPause();
  }

  async seekTo(position: number): Promise<void> {
    return this.activePlayer.seekTo(position);
  }

  async stop(): Promise<void> {
    return this.activePlayer.stop();
  }

  async skipToNext(): Promise<void> {
    return this.activePlayer.skipToNext();
  }

  async skipToPrevious(): Promise<void> {
    return this.activePlayer.skipToPrevious();
  }

  async playTrack(index: number): Promise<void> {
    return this.activePlayer.playTrack(index);
  }

  async setVolume(volume: number): Promise<void> {
    return this.activePlayer.setVolume(volume);
  }

  async getVolume(): Promise<number> {
    return this.activePlayer.getVolume();
  }

  async saveState(): Promise<{ position: number; isPlaying: boolean }> {
    return this.activePlayer.saveState();
  }

  async connectToDevice(device: RemoteDevice): Promise<void> {
    const player = this.players[device.type];
    if (!player || !player.connect) {
      throw new Error(`Player type ${device.type} does not support connection`);
    }

    const previousState = await nitroPlayerService.saveState();

    if (previousState.isPlaying) {
      await nitroPlayerService.pause();
    }

    try {
      await player.connect(device);
      
      useRemotePlaybackStore.getState().selectDevice(device);
      useRemotePlaybackStore.getState().setActivePlayerType(device.type);

      if (previousState.isPlaying) {
        console.log('[PlayerRouter] Resuming playback from', previousState.position);
        await player.play();
        if (previousState.position > 0) {
          await player.seekTo(previousState.position);
        }
      }
    } catch (error) {
      console.error('[PlayerRouter] Failed to connect to device:', error);
      useRemotePlaybackStore.getState().selectDevice(null);
      useRemotePlaybackStore.getState().setActivePlayerType('local');
      if (previousState.isPlaying) {
        await nitroPlayerService.play();
      }
      throw error;
    }
  }

  async disconnectFromDevice(): Promise<void> {
    const currentType = useRemotePlaybackStore.getState().activePlayerType;
    const player = this.players[currentType];

    // Reset state first
    useRemotePlaybackStore.getState().selectDevice(null);
    useRemotePlaybackStore.getState().setActivePlayerType('local');

    if (player && player.disconnect) {
      try {
        const state = await player.saveState();
        await player.disconnect();

        if (state.isPlaying) {
          console.log('[PlayerRouter] Resuming local playback from', state.position);
          await nitroPlayerService.play();
          await nitroPlayerService.seekTo(state.position);
        }
      } catch (error) {
        console.error('[PlayerRouter] Error during disconnect:', error);
      }
    }
  }
}

export const playerRouter = new PlayerRouter();
