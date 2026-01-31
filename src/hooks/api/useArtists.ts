/**
 * Dino Music App - Artists API Hooks
 * React Query hooks for artist data
 */

import { useQuery } from '@tanstack/react-query';
import { getArtists, getArtist } from '../../api/opensubsonic/artists';

export const useArtists = () => {
  return useQuery({
    queryKey: ['artists'],
    queryFn: async () => {
      const response = await getArtists();
      // Flatten the indexed artists
      const allArtists = response.artists.index?.flatMap((index) => index.artist) || [];
      return allArtists;
    },
  });
};

export const useArtist = (artistId: string | undefined) => {
  return useQuery({
    queryKey: ['artist', artistId],
    queryFn: async () => {
      if (!artistId) return null;
      const response = await getArtist(artistId);
      return response.artist ?? null;
    },
    enabled: !!artistId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
