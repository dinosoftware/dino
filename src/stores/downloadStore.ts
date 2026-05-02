/**
 * Dino Music App - Download Store
 * Sync cache layer on top of nitro DownloadManager
 * Keeps downloaded content data in memory for synchronous access
 */

import { create } from 'zustand';
import { Track, Album, Playlist } from '../api/opensubsonic/types';

export type DownloadType = 'track' | 'album' | 'playlist';

export interface CachedDownloadedTrack {
  track: Track;
  localUri: string;
  coverArtUri?: string;
  lyricsUri?: string;
  downloadedAt: number;
  size: number;
  bitRate?: number;
  suffix?: string;
}

export interface CachedDownloadedAlbum {
  album: Album;
  tracks: CachedDownloadedTrack[];
  coverArtUri?: string;
  downloadedAt: number;
  totalSize: number;
  metadata?: any;
}

export interface CachedDownloadedPlaylist {
  playlist: Playlist;
  tracks: CachedDownloadedTrack[];
  coverArtUri?: string;
  downloadedAt: number;
  totalSize: number;
  metadata?: any;
}

interface DownloadStore {
  downloadedTracks: Record<string, CachedDownloadedTrack>;
  downloadedAlbums: Record<string, CachedDownloadedAlbum>;
  downloadedPlaylists: Record<string, CachedDownloadedPlaylist>;
  totalStorageUsed: number;
  isHydrated: boolean;

  isTrackDownloaded: (trackId: string) => boolean;
  isAlbumDownloaded: (albumId: string) => boolean;
  isPlaylistDownloaded: (playlistId: string) => boolean;

  getDownloadedTrack: (trackId: string) => CachedDownloadedTrack | undefined;
  getDownloadedAlbum: (albumId: string) => CachedDownloadedAlbum | undefined;
  getDownloadedPlaylist: (playlistId: string) => CachedDownloadedPlaylist | undefined;

  getAllTracks: () => CachedDownloadedTrack[];
  getAllAlbums: () => CachedDownloadedAlbum[];
  getAllPlaylists: () => CachedDownloadedPlaylist[];

  upsertTrack: (track: CachedDownloadedTrack) => void;
  upsertAlbum: (album: CachedDownloadedAlbum) => void;
  upsertPlaylist: (playlist: CachedDownloadedPlaylist) => void;

  removeTrack: (trackId: string) => void;
  removeAlbum: (albumId: string) => void;
  removePlaylist: (playlistId: string) => void;

  setHydrated: (hydrated: boolean) => void;
  recalculateStorage: () => void;
  clearAll: () => void;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  downloadedTracks: {},
  downloadedAlbums: {},
  downloadedPlaylists: {},
  totalStorageUsed: 0,
  isHydrated: false,

  isTrackDownloaded: (trackId) => !!get().downloadedTracks[trackId],
  isAlbumDownloaded: (albumId) => !!get().downloadedAlbums[albumId],
  isPlaylistDownloaded: (playlistId) => !!get().downloadedPlaylists[playlistId],

  getDownloadedTrack: (trackId) => get().downloadedTracks[trackId],
  getDownloadedAlbum: (albumId) => get().downloadedAlbums[albumId],
  getDownloadedPlaylist: (playlistId) => get().downloadedPlaylists[playlistId],

  getAllTracks: () => Object.values(get().downloadedTracks),
  getAllAlbums: () => Object.values(get().downloadedAlbums),
  getAllPlaylists: () => Object.values(get().downloadedPlaylists),

  upsertTrack: (track) => {
    set((state) => ({
      downloadedTracks: {
        ...state.downloadedTracks,
        [track.track.id]: track,
      },
    }));
    get().recalculateStorage();
  },

  upsertAlbum: (album) => {
    set((state) => {
      const downloadedTracks = { ...state.downloadedTracks };
      album.tracks.forEach((t) => {
        downloadedTracks[t.track.id] = t;
      });
      return {
        downloadedAlbums: {
          ...state.downloadedAlbums,
          [album.album.id]: album,
        },
        downloadedTracks,
      };
    });
    get().recalculateStorage();
  },

  upsertPlaylist: (playlist) => {
    set((state) => {
      const downloadedTracks = { ...state.downloadedTracks };
      playlist.tracks.forEach((t) => {
        downloadedTracks[t.track.id] = t;
      });
      return {
        downloadedPlaylists: {
          ...state.downloadedPlaylists,
          [playlist.playlist.id]: playlist,
        },
        downloadedTracks,
      };
    });
    get().recalculateStorage();
  },

  removeTrack: (trackId) => {
    set((state) => {
      const downloadedTracks = { ...state.downloadedTracks };
      delete downloadedTracks[trackId];
      return { downloadedTracks };
    });
    get().recalculateStorage();
  },

  removeAlbum: (albumId) => {
    set((state) => {
      const album = state.downloadedAlbums[albumId];
      if (!album) return state;

      const albumTrackIds = new Set(album.tracks.map(t => t.track.id));

      const trackIdsInOtherGroups = new Set<string>();
      for (const [id, a] of Object.entries(state.downloadedAlbums)) {
        if (id === albumId) continue;
        a.tracks.forEach(t => trackIdsInOtherGroups.add(t.track.id));
      }
      for (const p of Object.values(state.downloadedPlaylists)) {
        p.tracks.forEach(t => trackIdsInOtherGroups.add(t.track.id));
      }

      const downloadedTracks = { ...state.downloadedTracks };
      for (const trackId of albumTrackIds) {
        if (!trackIdsInOtherGroups.has(trackId)) {
          delete downloadedTracks[trackId];
        }
      }

      const downloadedAlbums = { ...state.downloadedAlbums };
      delete downloadedAlbums[albumId];
      return { downloadedAlbums, downloadedTracks };
    });
    get().recalculateStorage();
  },

  removePlaylist: (playlistId) => {
    set((state) => {
      const playlist = state.downloadedPlaylists[playlistId];
      if (!playlist) return state;

      const playlistTrackIds = new Set(playlist.tracks.map(t => t.track.id));

      const trackIdsInOtherGroups = new Set<string>();
      for (const a of Object.values(state.downloadedAlbums)) {
        a.tracks.forEach(t => trackIdsInOtherGroups.add(t.track.id));
      }
      for (const [id, p] of Object.entries(state.downloadedPlaylists)) {
        if (id === playlistId) continue;
        p.tracks.forEach(t => trackIdsInOtherGroups.add(t.track.id));
      }

      const downloadedTracks = { ...state.downloadedTracks };
      for (const trackId of playlistTrackIds) {
        if (!trackIdsInOtherGroups.has(trackId)) {
          delete downloadedTracks[trackId];
        }
      }

      const downloadedPlaylists = { ...state.downloadedPlaylists };
      delete downloadedPlaylists[playlistId];
      return { downloadedPlaylists, downloadedTracks };
    });
    get().recalculateStorage();
  },

  setHydrated: (hydrated) => set({ isHydrated: hydrated }),

  recalculateStorage: () => {
    const state = get();
    const countedIds = new Set<string>();
    let total = 0;

    for (const album of Object.values(state.downloadedAlbums)) {
      for (const t of album.tracks) {
        if (!countedIds.has(t.track.id)) {
          countedIds.add(t.track.id);
          total += t.size;
        }
      }
      if (album.coverArtUri) total += 0;
    }

    for (const playlist of Object.values(state.downloadedPlaylists)) {
      for (const t of playlist.tracks) {
        if (!countedIds.has(t.track.id)) {
          countedIds.add(t.track.id);
          total += t.size;
        }
      }
    }

    for (const t of Object.values(state.downloadedTracks)) {
      if (!countedIds.has(t.track.id)) {
        countedIds.add(t.track.id);
        total += t.size;
      }
    }

    set({ totalStorageUsed: total });
  },

  clearAll: () => set({
    downloadedTracks: {},
    downloadedAlbums: {},
    downloadedPlaylists: {},
    totalStorageUsed: 0,
  }),
}));
