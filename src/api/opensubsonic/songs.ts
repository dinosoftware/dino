/**
 * Dino Music App - Songs API
 * Song/track browsing and retrieval endpoints
 */

import { apiClient } from '../client';
import { GetRandomSongsResponse } from './types';

/**
 * Get random songs
 */
export const getRandomSongs = async (
  size = 10,
  genre?: string,
  fromYear?: number,
  toYear?: number,
  musicFolderId?: string
): Promise<GetRandomSongsResponse> => {
  const params: Record<string, any> = { size };
  
  if (genre) params.genre = genre;
  if (fromYear) params.fromYear = fromYear;
  if (toYear) params.toYear = toYear;
  if (musicFolderId) params.musicFolderId = musicFolderId;
  
  return await apiClient.get<GetRandomSongsResponse>('getRandomSongs', params);
};
