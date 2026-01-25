/**
 * Dino Music App - Favorites API
 * Star/unstar tracks, albums, and artists
 */

import { apiClient } from '../client';
import { GetStarredResponse2 } from './types';

/**
 * Star a track, album, or artist
 */
export const star = async (
  trackId?: string,
  albumId?: string,
  artistId?: string
): Promise<void> => {
  await apiClient.get('star', {
    ...(trackId && { id: trackId }),
    ...(albumId && { albumId }),
    ...(artistId && { artistId }),
  });
};

/**
 * Unstar a track, album, or artist
 */
export const unstar = async (
  trackId?: string,
  albumId?: string,
  artistId?: string
): Promise<void> => {
  await apiClient.get('unstar', {
    ...(trackId && { id: trackId }),
    ...(albumId && { albumId }),
    ...(artistId && { artistId }),
  });
};

/**
 * Get all starred content (ID3 tags)
 */
export const getStarred2 = async (): Promise<GetStarredResponse2> => {
  return await apiClient.get<GetStarredResponse2>('getStarred2');
};
