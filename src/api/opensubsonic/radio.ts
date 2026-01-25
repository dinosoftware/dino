/**
 * Dino Music App - Radio API
 * Get similar songs for instant mix / radio feature
 */

import { apiClient } from '../client';
import { GetSimilarSongs2Response } from './types';

/**
 * Get similar songs for a track (ID3 tags)
 */
export const getSimilarSongs2 = async (
  trackId: string,
  count = 50
): Promise<GetSimilarSongs2Response> => {
  return await apiClient.get<GetSimilarSongs2Response>('getSimilarSongs2', {
    id: trackId,
    count,
  });
};
