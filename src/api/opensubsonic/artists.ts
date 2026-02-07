/**
 * Dino Music App - Artists API
 * Artist browsing and retrieval endpoints
 */

import { apiClient } from '../client';
import {
  GetArtistsResponse,
  GetArtistResponse,
  GetArtistInfoResponse,
  GetTopSongsResponse,
} from './types';

/**
 * Get all artists (ID3 tags)
 */
export const getArtists = async (): Promise<GetArtistsResponse> => {
  return await apiClient.request<GetArtistsResponse>('getArtists');
};

/**
 * Get artist by ID with albums
 */
export const getArtist = async (artistId: string): Promise<GetArtistResponse> => {
  return await apiClient.request<GetArtistResponse>('getArtist', {
    id: artistId,
  });
};

/**
 * Get artist info (bio, images, similar artists)
 * Note: Uses getArtistInfo2 for ID3 mode (v1.8.0+) - some servers may not support this endpoint
 */
export const getArtistInfo = async (
  artistId: string,
  count?: number,
  includeNotPresent?: boolean
): Promise<GetArtistInfoResponse> => {
  try {
    return await apiClient.request<GetArtistInfoResponse>('getArtistInfo2', {
      id: artistId,
      ...(count && { count }),
      ...(includeNotPresent !== undefined && { includeNotPresent }),
    });
  } catch (error) {
    console.log('getArtistInfo2 not supported by server or no data available:', error);
    // Return empty artistInfo2 if endpoint not supported
    return { artistInfo2: {} as any };
  }
};

/**
 * Get top songs for an artist
 * Uses Last.fm data to return popular songs
 */
export const getTopSongs = async (
  artistName: string,
  count: number = 50
): Promise<GetTopSongsResponse> => {
  return await apiClient.request<GetTopSongsResponse>('getTopSongs', {
    artist: artistName,
    count,
  });
};
