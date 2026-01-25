/**
 * Dino Music App - Play Queue API
 * Save and retrieve play queue from server for cross-device sync
 */

import { apiClient } from '../client';
import { GetPlayQueueResponse } from './types';

/**
 * Save current play queue to server
 */
export const savePlayQueue = async (
  trackIds: string[],
  currentIndex?: number,
  position?: number
): Promise<void> => {
  await apiClient.get('savePlayQueue', {
    id: trackIds,
    ...(currentIndex !== undefined && { current: currentIndex }),
    ...(position !== undefined && { position: Math.floor(position) }),
  });
};

/**
 * Get play queue from server
 */
export const getPlayQueue = async (): Promise<GetPlayQueueResponse> => {
  return await apiClient.get<GetPlayQueueResponse>('getPlayQueue');
};
