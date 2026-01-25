/**
 * Dino Music App - Search API
 * Unified search across tracks, albums, and artists
 */

import { apiClient } from '../client';
import { SearchResponse3 } from './types';

/**
 * Search for tracks, albums, and artists (ID3 tags)
 */
export const search3 = async (
  query: string,
  artistCount = 20,
  albumCount = 20,
  songCount = 50,
  artistOffset = 0,
  albumOffset = 0,
  songOffset = 0
): Promise<SearchResponse3> => {
  return await apiClient.get<SearchResponse3>('search3', {
    query,
    artistCount,
    albumCount,
    songCount,
    artistOffset,
    albumOffset,
    songOffset,
  });
};
