/**
 * Dino Music App - Favorites Store
 * Track starred/favorited items locally for quick access
 */

import { create } from 'zustand';
import { star, unstar, getStarred2 } from '../api/opensubsonic/favorites';
import { Track, Album, Artist } from '../api/opensubsonic/types';

interface FavoritesStore {
  starredTracks: Set<string>;
  starredAlbums: Set<string>;
  starredArtists: Set<string>;
  starredTrackObjects: Track[];
  starredAlbumObjects: Album[];
  starredArtistObjects: Artist[];
  isLoading: boolean;

  // Actions
  toggleTrackStar: (trackId: string, currentlyStarred: boolean) => Promise<void>;
  toggleAlbumStar: (albumId: string, currentlyStarred: boolean) => Promise<void>;
  toggleArtistStar: (artistId: string, currentlyStarred: boolean) => Promise<void>;
  loadStarred: () => Promise<void>;
  isTrackStarred: (trackId: string) => boolean;
  isAlbumStarred: (albumId: string) => boolean;
  isArtistStarred: (artistId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  starredTracks: new Set(),
  starredAlbums: new Set(),
  starredArtists: new Set(),
  starredTrackObjects: [],
  starredAlbumObjects: [],
  starredArtistObjects: [],
  isLoading: false,

  toggleTrackStar: async (trackId: string, currentlyStarred: boolean) => {
    try {
      if (currentlyStarred) {
        // Unstar
        await unstar(trackId);
        set((state) => {
          const newStarred = new Set(state.starredTracks);
          newStarred.delete(trackId);
          return { starredTracks: newStarred };
        });
      } else {
        // Star
        await star(trackId);
        set((state) => {
          const newStarred = new Set(state.starredTracks);
          newStarred.add(trackId);
          return { starredTracks: newStarred };
        });
      }
    } catch (error) {
      console.error('[Favorites] Failed to toggle track star:', error);
      throw error;
    }
  },

  toggleAlbumStar: async (albumId: string, currentlyStarred: boolean) => {
    try {
      if (currentlyStarred) {
        await unstar(undefined, albumId);
        set((state) => {
          const newStarred = new Set(state.starredAlbums);
          newStarred.delete(albumId);
          return { starredAlbums: newStarred };
        });
      } else {
        await star(undefined, albumId);
        set((state) => {
          const newStarred = new Set(state.starredAlbums);
          newStarred.add(albumId);
          return { starredAlbums: newStarred };
        });
      }
    } catch (error) {
      console.error('[Favorites] Failed to toggle album star:', error);
      throw error;
    }
  },

  toggleArtistStar: async (artistId: string, currentlyStarred: boolean) => {
    try {
      if (currentlyStarred) {
        await unstar(undefined, undefined, artistId);
        set((state) => {
          const newStarred = new Set(state.starredArtists);
          newStarred.delete(artistId);
          return { starredArtists: newStarred };
        });
      } else {
        await star(undefined, undefined, artistId);
        set((state) => {
          const newStarred = new Set(state.starredArtists);
          newStarred.add(artistId);
          return { starredArtists: newStarred };
        });
      }
    } catch (error) {
      console.error('[Favorites] Failed to toggle artist star:', error);
      throw error;
    }
  },

  loadStarred: async () => {
    set({ isLoading: true });
    try {
      const response = await getStarred2();
      const starred = response.starred2;

      const tracks = new Set<string>();
      const albums = new Set<string>();
      const artists = new Set<string>();

      if (starred.song) {
        starred.song.forEach((song) => tracks.add(song.id));
      }

      if (starred.album) {
        starred.album.forEach((album) => albums.add(album.id));
      }

      if (starred.artist) {
        starred.artist.forEach((artist) => artists.add(artist.id));
      }

      set({
        starredTracks: tracks,
        starredAlbums: albums,
        starredArtists: artists,
        starredTrackObjects: starred.song || [],
        starredAlbumObjects: starred.album || [],
        starredArtistObjects: starred.artist || [],
        isLoading: false,
      });

      console.log('[Favorites] Loaded starred items:', {
        tracks: tracks.size,
        albums: albums.size,
        artists: artists.size,
      });
    } catch (error) {
      console.error('[Favorites] Failed to load starred items:', error);
      set({ isLoading: false });
    }
  },

  isTrackStarred: (trackId: string) => {
    return get().starredTracks.has(trackId);
  },

  isAlbumStarred: (albumId: string) => {
    return get().starredAlbums.has(albumId);
  },

  isArtistStarred: (artistId: string) => {
    return get().starredArtists.has(artistId);
  },
}));
