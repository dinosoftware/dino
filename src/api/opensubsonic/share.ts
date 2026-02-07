/**
 * Dino Music App - Share API
 * OpenSubsonic share endpoint for creating shareable links
 */

import { apiClient } from '../client';
import { SubsonicResponse } from './types';

export interface Share {
  id: string;
  url: string;
  description?: string;
  username: string;
  created: string;
  expires?: string;
  lastVisited?: string;
  visitCount: number;
  entry?: any[];
}

export interface CreateShareResponse extends SubsonicResponse {
  shares: {
    share: Share[];
  };
}

/**
 * Create a share for one or more media files/albums/playlists
 * Returns a shareable URL
 */
export const createShare = async (
  ids: string[],
  description?: string,
  expires?: number // Unix timestamp in milliseconds
): Promise<Share> => {
  const params: any = {
    id: ids,
  };

  if (description) {
    params.description = description;
  }

  if (expires) {
    params.expires = expires;
  }

  const response = await apiClient.request<CreateShareResponse>('createShare', params);
  
  if (!response.shares?.share || response.shares.share.length === 0) {
    throw new Error('Failed to create share');
  }

  return response.shares.share[0];
};

/**
 * Get all shares created by the current user
 */
export const getShares = async (): Promise<Share[]> => {
  const response = await apiClient.request<CreateShareResponse>('getShares');
  return response.shares?.share || [];
};

/**
 * Delete an existing share
 */
export const deleteShare = async (shareId: string): Promise<void> => {
  await apiClient.request('deleteShare', { id: shareId });
};

/**
 * Update an existing share
 */
export const updateShare = async (
  shareId: string,
  description?: string,
  expires?: number
): Promise<void> => {
  const params: any = {
    id: shareId,
  };

  if (description !== undefined) {
    params.description = description;
  }

  if (expires !== undefined) {
    params.expires = expires;
  }

  await apiClient.request('updateShare', params);
};
