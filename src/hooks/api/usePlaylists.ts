/**
 * Dino Music App - Playlists API Hooks
 * React Query hooks for playlist data
 */

import { useQuery } from '@tanstack/react-query';
import { getPlaylists, getPlaylist } from '../../api/opensubsonic/playlists';
import { useDownloadStore } from '../../stores/downloadStore';

export const usePlaylists = () => {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const response = await getPlaylists();
      return response.playlists.playlist || [];
    },
  });
};

export const usePlaylist = (playlistId: string) => {
  const { getDownloadedPlaylist } = useDownloadStore();
  
  return useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      // Check if playlist is downloaded (has offline metadata)
      const downloadedPlaylist = getDownloadedPlaylist(playlistId);
      if (downloadedPlaylist && downloadedPlaylist.metadata) {
        console.log('[usePlaylist] Using cached metadata for playlist:', playlistId);
        // Return the cached playlist metadata
        return downloadedPlaylist.metadata.playlist;
      }
      
      // Otherwise fetch from server
      console.log('[usePlaylist] Fetching from server for playlist:', playlistId);
      const response = await getPlaylist(playlistId);
      return response.playlist;
    },
    enabled: !!playlistId,
  });
};
