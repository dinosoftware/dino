/**
 * Dino Music App - Radio API
 * Get similar songs for instant mix / radio feature
 */

import { apiClient } from '../client';
import { GetSimilarSongs2Response } from './types';

/**
 * Get similar songs for a track (ID3 tags)
 * Uses instantMixSize from settings if count not provided
 */
export const getSimilarSongs2 = async (
  trackId: string,
  count?: number
): Promise<GetSimilarSongs2Response> => {
  // Use setting if count not provided
  if (!count) {
    const { useSettingsStore } = await import('../../stores/settingsStore');
    count = useSettingsStore.getState().instantMixSize;
  }
  
  return await apiClient.request<GetSimilarSongs2Response>('getSimilarSongs2', {
    id: trackId,
    count,
  });
};
