/**
 * Dino Music App - Lyrics API
 * Fetch synchronized and unsynchronized lyrics
 */

import { apiClient } from '../client';
import { GetLyricsResponse } from './types';

/**
 * Get lyrics for a track by song ID
 * Attempts the request regardless of extension support since many servers
 * support getLyricsBySongId without advertising the songLyrics extension.
 */
export const getLyricsBySongId = async (trackId: string): Promise<GetLyricsResponse> => {
  return await apiClient.request<GetLyricsResponse>('getLyricsBySongId', {
    id: trackId,
  });
};
