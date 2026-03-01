/**
 * Dino Music App - Player Service Types
 * Shared interface that all player services must implement
 */

import { RemoteDevice } from '../../stores/remotePlaybackStore';

export interface PlayerService {
  isInitialized: boolean;

  initialize(): Promise<void>;
  destroy(): Promise<void>;

  play(): Promise<void>;
  pause(): Promise<void>;
  togglePlayPause(): Promise<void>;
  seekTo(positionSeconds: number): Promise<void>;
  stop(): Promise<void>;

  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;
  playTrack(index: number): Promise<void>;

  setVolume(volume: number): Promise<void>;
  getVolume(): Promise<number>;

  saveState(): Promise<{ position: number; isPlaying: boolean }>;

  connect?(device: RemoteDevice): Promise<void>;
  disconnect?(): Promise<void>;
}
