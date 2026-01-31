/**
 * Dino Music App - Albums API Hooks
 * React Query hooks for album data
 */

import { useQuery } from '@tanstack/react-query';
import { getAlbum, getAlbumList2 } from '../../api/opensubsonic/albums';
import { getCoverArtUrl } from '../../api/opensubsonic/streaming';
import { useServerStore } from '../../stores/serverStore';
import { useDownloadStore } from '../../stores/downloadStore';

export const useAlbums = (
  type: 'random' | 'newest' | 'frequent' | 'recent' | 'starred' | 'alphabeticalByName' | 'alphabeticalByArtist' = 'newest',
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
  const { getDownloadedAlbum } = useDownloadStore();
  
  return useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      // Check if album is downloaded (has offline metadata)
      const downloadedAlbum = getDownloadedAlbum(albumId);
      if (downloadedAlbum && downloadedAlbum.metadata) {
        console.log('[useAlbum] Using cached metadata for album:', albumId);
        // Return the cached album metadata
        return downloadedAlbum.metadata.album;
      }
      
      // Otherwise fetch from server
      console.log('[useAlbum] Fetching from server for album:', albumId);
      const response = await getAlbum(albumId);
      return response.album;
    },
    enabled: !!albumId,
  });
};

export const useCoverArt = (coverArtId: string | undefined, size = 300) => {
  const { downloadedAlbums, downloadedPlaylists, downloadedTracks } = useDownloadStore();
  
  return useQuery({
    queryKey: ['coverArt', coverArtId, size],
    queryFn: async () => {
      if (!coverArtId) return null;
      
      // Check if we have a downloaded version with cached cover art
      // Check albums first
      const album = Object.values(downloadedAlbums).find(a => a.album.coverArt === coverArtId);
      if (album && album.coverArtUri) {
        console.log('[useCoverArt] Using cached cover art for album');
        return album.coverArtUri;
      }
      
      // Check playlists
      const playlist = Object.values(downloadedPlaylists).find(p => p.playlist.coverArt === coverArtId);
      if (playlist && playlist.coverArtUri) {
        console.log('[useCoverArt] Using cached cover art for playlist');
        return playlist.coverArtUri;
      }
      
      // Check tracks
      const track = Object.values(downloadedTracks).find(t => t.track.coverArt === coverArtId);
      if (track && track.coverArtUri) {
        console.log('[useCoverArt] Using cached cover art for track');
        return track.coverArtUri;
      }
      
      // Otherwise fetch from server
      return await getCoverArtUrl(coverArtId, size);
    },
    enabled: !!coverArtId,
    staleTime: Infinity, // Cover art URLs don't change
  });
};
