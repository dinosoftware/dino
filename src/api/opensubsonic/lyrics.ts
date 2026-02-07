/**
 * Dino Music App - Lyrics API
 * Fetch synchronized and unsynchronized lyrics
 */

import { apiClient } from '../client';
import { GetLyricsResponse } from './types';
import { useServerStore } from '../../stores/serverStore';

/**
 * Get lyrics for a track by song ID
 * Checks if server supports songLyrics extension before making request
 */
export const getLyricsBySongId = async (trackId: string): Promise<GetLyricsResponse> => {
  // Check if server supports songLyrics extension
  const capabilities = useServerStore.getState().getCurrentServerCapabilities();
  if (capabilities && !capabilities.supportsSongLyrics) {
    throw new Error('Server does not support lyrics (songLyrics extension not available)');
  }

  return await apiClient.request<GetLyricsResponse>('getLyricsBySongId', {
    id: trackId,
  });
};
