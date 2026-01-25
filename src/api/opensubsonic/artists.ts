/**
 * Dino Music App - Artists API
 * Artist browsing and retrieval endpoints
 */

import { apiClient } from '../client';
import {
  GetArtistsResponse,
  GetArtistResponse,
  GetArtistInfoResponse,
} from './types';

/**
 * Get all artists (ID3 tags)
 */
export const getArtists = async (): Promise<GetArtistsResponse> => {
  return await apiClient.get<GetArtistsResponse>('getArtists');
};

/**
 * Get artist by ID with albums
 */
export const getArtist = async (artistId: string): Promise<GetArtistResponse> => {
  return await apiClient.get<GetArtistResponse>('getArtist', {
    id: artistId,
  });
};

/**
 * Get artist info (bio, images, similar artists)
 */
export const getArtistInfo = async (
  artistId: string,
  count?: number,
  includeNotPresent?: boolean
): Promise<GetArtistInfoResponse> => {
  return await apiClient.get<GetArtistInfoResponse>('getArtistInfo2', {
    id: artistId,
    ...(count && { count }),
    ...(includeNotPresent !== undefined && { includeNotPresent }),
  });
};
