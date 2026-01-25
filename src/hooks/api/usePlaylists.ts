/**
 * Dino Music App - Playlists API Hooks
 * React Query hooks for playlist data
 */

import { useQuery } from '@tanstack/react-query';
import { getPlaylists, getPlaylist } from '../../api/opensubsonic/playlists';

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
  return useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      const response = await getPlaylist(playlistId);
      return response.playlist;
    },
    enabled: !!playlistId,
  });
};
