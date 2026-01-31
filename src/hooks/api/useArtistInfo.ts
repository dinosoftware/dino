/**
 * Dino Music App - Artist Info API Hook
 * React Query hook for fetching artist info (bio, images, similar artists)
 */

import { useQuery } from '@tanstack/react-query';
import { getArtistInfo } from '../../api/opensubsonic/artists';

export const useArtistInfo = (artistId: string | undefined, count: number = 10) => {
  return useQuery({
    queryKey: ['artistInfo', artistId, count],
    queryFn: async () => {
      if (!artistId) return null;
      const response = await getArtistInfo(artistId, count, false);
      // Return null instead of undefined to satisfy React Query
      return response.artistInfo2 ?? null;
    },
    enabled: !!artistId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
