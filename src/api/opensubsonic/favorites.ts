/**
 * Dino Music App - Favorites API
 * Star/unstar tracks, albums, and artists
 */

import { apiClient } from '../client';
import { GetStarredResponse2 } from './types';

/**
 * Star a track, album, or artist (uses POST when supported)
 */
export const star = async (
  trackId?: string,
  albumId?: string,
  artistId?: string
): Promise<void> => {
  await apiClient.request('star', {
    ...(trackId && { id: trackId }),
    ...(albumId && { albumId }),
    ...(artistId && { artistId }),
  });
};

/**
 * Unstar a track, album, or artist (uses POST when supported)
 */
export const unstar = async (
  trackId?: string,
  albumId?: string,
  artistId?: string
): Promise<void> => {
  await apiClient.request('unstar', {
    ...(trackId && { id: trackId }),
    ...(albumId && { albumId }),
    ...(artistId && { artistId }),
  });
};

/**
 * Get all starred content (ID3 tags)
 */
export const getStarred2 = async (): Promise<GetStarredResponse2> => {
  return await apiClient.request<GetStarredResponse2>('getStarred2');
};
