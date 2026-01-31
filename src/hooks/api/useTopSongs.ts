/**
 * Dino Music App - Top Songs API Hook
 * React Query hook for fetching artist top songs
 */

import { useQuery } from '@tanstack/react-query';
import { getTopSongs } from '../../api/opensubsonic/artists';

export const useTopSongs = (artistName: string | undefined, count: number = 50) => {
  return useQuery({
    queryKey: ['topSongs', artistName, count],
    queryFn: async () => {
      if (!artistName) return [];
      const response = await getTopSongs(artistName, count);
      return response.topSongs?.song || [];
    },
    enabled: !!artistName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
