/**
 * Dino Music App - Playlists API
 * Playlist CRUD operations
 */

import { apiClient } from '../client';
import {
  GetPlaylistsResponse,
  GetPlaylistResponse,
} from './types';

/**
 * Get all playlists
 */
export const getPlaylists = async (): Promise<GetPlaylistsResponse> => {
  return await apiClient.get<GetPlaylistsResponse>('getPlaylists');
};

/**
 * Get playlist by ID with tracks
 */
export const getPlaylist = async (playlistId: string): Promise<GetPlaylistResponse> => {
  return await apiClient.get<GetPlaylistResponse>('getPlaylist', {
    id: playlistId,
  });
};

/**
 * Create new playlist
 */
export const createPlaylist = async (
  name: string,
  songIds?: string[]
): Promise<GetPlaylistResponse> => {
  return await apiClient.get<GetPlaylistResponse>('createPlaylist', {
    name,
    ...(songIds && { songId: songIds }),
  });
};

/**
 * Update playlist (add/remove tracks)
 */
export const updatePlaylist = async (
  playlistId: string,
  name?: string,
  comment?: string,
  publicPlaylist?: boolean,
  songIdsToAdd?: string[],
  songIndexesToRemove?: number[]
): Promise<void> => {
  const params: Record<string, any> = {
    playlistId,
  };
  
  if (name) params.name = name;
  if (comment) params.comment = comment;
  if (publicPlaylist !== undefined) params.public = publicPlaylist;
  
  // OpenSubsonic expects multiple params with same name for arrays
  // We'll build the params manually to handle this
  if (songIdsToAdd && songIdsToAdd.length > 0) {
    params.songIdToAdd = songIdsToAdd;
  }
  
  if (songIndexesToRemove && songIndexesToRemove.length > 0) {
    params.songIndexToRemove = songIndexesToRemove;
  }
  
  await apiClient.get('updatePlaylist', params);
};

/**
 * Delete playlist
 */
export const deletePlaylist = async (playlistId: string): Promise<void> => {
  await apiClient.get('deletePlaylist', {
    id: playlistId,
  });
};
