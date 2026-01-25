/**
 * Dino Music App - Albums API Hooks
 * React Query hooks for album data
 */

import { useQuery } from '@tanstack/react-query';
import { getAlbum, getAlbumList2 } from '../../api/opensubsonic/albums';
import { getCoverArtUrl } from '../../api/opensubsonic/streaming';
import { useServerStore } from '../../stores/serverStore';

export const useAlbums = (
  type: 'random' | 'newest' | 'frequent' | 'recent' = 'newest',
  size = 20
) => {
  const { currentServerId } = useServerStore();
  return useQuery({
    queryKey: ['albums', type, size, currentServerId],
    queryFn: async () => {
      const response = await getAlbumList2(type, size);
      return response.albumList2.album || [];
    },
    enabled: !!currentServerId,
  });
};

export const useAlbum = (albumId: string) => {
  return useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      const response = await getAlbum(albumId);
      return response.album;
    },
    enabled: !!albumId,
  });
};

export const useCoverArt = (coverArtId: string | undefined, size = 300) => {
  return useQuery({
    queryKey: ['coverArt', coverArtId, size],
    queryFn: async () => {
      if (!coverArtId) return null;
      return await getCoverArtUrl(coverArtId, size);
    },
    enabled: !!coverArtId,
    staleTime: Infinity, // Cover art URLs don't change
  });
};
