/**
 * Dino Music App - Albums API
 * Album browsing and retrieval endpoints
 */

import { apiClient } from '../client';
import {
  GetAlbumResponse,
  GetAlbumListResponse,
  GetAlbumList2Response,
} from './types';

/**
 * Get album by ID with tracks
 */
export const getAlbum = async (albumId: string): Promise<GetAlbumResponse> => {
  return await apiClient.get<GetAlbumResponse>('getAlbum', {
    id: albumId,
  });
};

/**
 * Get album list (ID3 tags)
 */
export const getAlbumList2 = async (
  type: 'random' | 'newest' | 'frequent' | 'recent' | 'starred' | 'alphabeticalByName' | 'alphabeticalByArtist',
  size = 20,
  offset = 0
): Promise<GetAlbumList2Response> => {
  return await apiClient.get<GetAlbumList2Response>('getAlbumList2', {
    type,
    size,
    offset,
  });
};

/**
 * Get album list (old format, for compatibility)
 */
export const getAlbumList = async (
  type: 'random' | 'newest' | 'highest' | 'frequent' | 'recent',
  size = 20,
  offset = 0
): Promise<GetAlbumListResponse> => {
  return await apiClient.get<GetAlbumListResponse>('getAlbumList', {
    type,
    size,
    offset,
  });
};
