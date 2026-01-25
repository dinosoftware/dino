/**
 * Dino Music App - Lyrics API
 * Fetch synchronized and unsynchronized lyrics
 */

import { apiClient } from '../client';
import { GetLyricsResponse } from './types';

/**
 * Get lyrics for a track by song ID
 */
export const getLyricsBySongId = async (trackId: string): Promise<GetLyricsResponse> => {
  return await apiClient.get<GetLyricsResponse>('getLyricsBySongId', {
    id: trackId,
  });
};
