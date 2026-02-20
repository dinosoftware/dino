/**
 * Dino Music App - Download Store
 * Download progress tracking with Zustand - supports tracks, albums, and playlists
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track, Album, Playlist } from '../api/opensubsonic/types';
import { STORAGE_KEYS } from '../config/constants';

export type DownloadType = 'track' | 'album' | 'playlist';

export interface DownloadProgress {
  id: string;
  itemId: string;
  type: DownloadType;
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  totalTracks?: number;
  completedTracks?: number;
  title?: string;
  artist?: string;
  coverArtUri?: string;
}

export interface DownloadedTrack {
  track: Track;
  localUri: string;
  coverArtUri?: string;
  lyricsUri?: string;
  downloadedAt: number;
  size: number;
}

export interface DownloadedAlbum {
  album: Album;
  tracks: DownloadedTrack[];
  coverArtUri?: string;
  downloadedAt: number;
  totalSize: number;
  metadata: any;
}

export interface DownloadedPlaylist {
  playlist: Playlist;
  tracks: DownloadedTrack[];
  coverArtUri?: string;
  downloadedAt: number;
  totalSize: number;
  metadata: any;
}

interface DownloadStore {
  activeDownloads: Record<string, DownloadProgress>;
  downloadedTracks: Record<string, DownloadedTrack>;
  downloadedAlbums: Record<string, DownloadedAlbum>;
  downloadedPlaylists: Record<string, DownloadedPlaylist>;
  totalStorageUsed: number;
  
  addDownload: (itemId: string, type: DownloadType, totalBytes: number, totalTracks?: number) => string;
  updateProgress: (id: string, downloadedBytes: number, completedTracks?: number, totalBytes?: number) => void;
  updateDownloadMeta: (id: string, meta: { title?: string; artist?: string; coverArtUri?: string }) => void;
  completeDownload: (id: string) => void;
  failDownload: (id: string, error: string) => void;
  cancelDownload: (id: string) => void;
  
  isTrackDownloaded: (trackId: string) => boolean;
  isAlbumDownloaded: (albumId: string) => boolean;
  isPlaylistDownloaded: (playlistId: string) => boolean;
  
  markTrackDownloaded: (track: Track, localUri: string, size: number, coverArtUri?: string, lyricsUri?: string) => void;
  removeTrackDownload: (trackId: string) => Promise<void>;
  getDownloadedTrack: (trackId: string) => DownloadedTrack | undefined;
  
  markAlbumDownloaded: (album: Album, tracks: DownloadedTrack[], metadata: any, coverArtUri?: string) => void;
  removeAlbumDownload: (albumId: string) => Promise<void>;
  getDownloadedAlbum: (albumId: string) => DownloadedAlbum | undefined;
  
  markPlaylistDownloaded: (playlist: Playlist, tracks: DownloadedTrack[], metadata: any, coverArtUri?: string) => void;
  removePlaylistDownload: (playlistId: string) => Promise<void>;
  getDownloadedPlaylist: (playlistId: string) => DownloadedPlaylist | undefined;
  
  getAllTracks: () => DownloadedTrack[];
  getAllAlbums: () => DownloadedAlbum[];
  getAllPlaylists: () => DownloadedPlaylist[];
  
  clearCompletedDownloads: () => void;
  
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => void;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  activeDownloads: {},
  downloadedTracks: {},
  downloadedAlbums: {},
  downloadedPlaylists: {},
  totalStorageUsed: 0,

  addDownload: (itemId, type, totalBytes, totalTracks) => {
    const id = `download_${Date.now()}_${itemId}`;
    const download: DownloadProgress = {
      id,
      itemId,
      type,
      progress: 0,
      totalBytes,
      downloadedBytes: 0,
      status: 'pending',
      totalTracks,
      completedTracks: 0,
    };

    set((state) => ({
      activeDownloads: { ...state.activeDownloads, [id]: download },
    }));

    return id;
  },

  updateProgress: (id, downloadedBytes, completedTracks, totalBytes) => {
    set((state) => {
      const download = state.activeDownloads[id];
      if (!download) return state;

      const finalTotalBytes = totalBytes ?? download.totalBytes;
      let progress = 0;
      
      if (download.totalTracks && download.totalTracks > 0 && completedTracks !== undefined) {
        progress = completedTracks / download.totalTracks;
      } else if (finalTotalBytes > 0) {
        progress = downloadedBytes / finalTotalBytes;
      }
      
      return {
        activeDownloads: {
          ...state.activeDownloads,
          [id]: {
            ...download,
            downloadedBytes,
            totalBytes: finalTotalBytes,
            progress,
            status: 'downloading',
            ...(completedTracks !== undefined && { completedTracks }),
          },
        },
      };
    });
  },

  updateDownloadMeta: (id, meta) => {
    set((state) => {
      const download = state.activeDownloads[id];
      if (!download) return state;

      return {
        activeDownloads: {
          ...state.activeDownloads,
          [id]: { ...download, ...meta },
        },
      };
    });
  },

  completeDownload: (id) => {
    set((state) => {
      const download = state.activeDownloads[id];
      if (!download) return state;

      return {
        activeDownloads: {
          ...state.activeDownloads,
          [id]: { ...download, progress: 1, status: 'completed' },
        },
      };
    });
  },

  failDownload: (id, error) => {
    set((state) => {
      const download = state.activeDownloads[id];
      if (!download) return state;

      return {
        activeDownloads: {
          ...state.activeDownloads,
          [id]: { ...download, status: 'failed', error },
        },
      };
    });
  },

  cancelDownload: (id) => {
    set((state) => {
      const download = state.activeDownloads[id];
      if (!download) return state;

      return {
        activeDownloads: {
          ...state.activeDownloads,
          [id]: { ...download, status: 'cancelled' },
        },
      };
    });
  },

  isTrackDownloaded: (trackId) => !!get().downloadedTracks[trackId],
  isAlbumDownloaded: (albumId) => !!get().downloadedAlbums[albumId],
  isPlaylistDownloaded: (playlistId) => !!get().downloadedPlaylists[playlistId],

  markTrackDownloaded: (track, localUri, size, coverArtUri, lyricsUri) => {
    set((state) => ({
      downloadedTracks: {
        ...state.downloadedTracks,
        [track.id]: {
          track,
          localUri,
          coverArtUri,
          lyricsUri,
          downloadedAt: Date.now(),
          size,
        },
      },
      totalStorageUsed: state.totalStorageUsed + size,
    }));
    get().saveToStorage();
  },

  removeTrackDownload: async (trackId) => {
    const downloadedTrack = get().downloadedTracks[trackId];
    if (!downloadedTrack) return;

    try {
      const FileSystem = await import('expo-file-system');
      await FileSystem.deleteAsync(downloadedTrack.localUri, { idempotent: true });
      if (downloadedTrack.coverArtUri) {
        await FileSystem.deleteAsync(downloadedTrack.coverArtUri, { idempotent: true });
      }
      if (downloadedTrack.lyricsUri) {
        await FileSystem.deleteAsync(downloadedTrack.lyricsUri, { idempotent: true });
      }
    } catch (error) {
      console.error('Failed to delete track files:', error);
    }

    set((state) => {
      const downloadedTracks = { ...state.downloadedTracks };
      delete downloadedTracks[trackId];
      return { downloadedTracks, totalStorageUsed: state.totalStorageUsed - downloadedTrack.size };
    });
    get().saveToStorage();
  },

  getDownloadedTrack: (trackId) => get().downloadedTracks[trackId],

  markAlbumDownloaded: (album, tracks, metadata, coverArtUri) => {
    const totalSize = tracks.reduce((sum, t) => sum + t.size, 0);
    
    set((state) => {
      const downloadedTracks = { ...state.downloadedTracks };
      tracks.forEach(t => {
        downloadedTracks[t.track.id] = t;
      });

      return {
        downloadedAlbums: {
          ...state.downloadedAlbums,
          [album.id]: {
            album,
            tracks,
            metadata,
            coverArtUri,
            downloadedAt: Date.now(),
            totalSize,
          },
        },
        downloadedTracks,
        totalStorageUsed: state.totalStorageUsed + totalSize,
      };
    });
    get().saveToStorage();
  },

  removeAlbumDownload: async (albumId) => {
    const downloadedAlbum = get().downloadedAlbums[albumId];
    if (!downloadedAlbum) return;

    try {
      const FileSystem = await import('expo-file-system');
      for (const track of downloadedAlbum.tracks) {
        await FileSystem.deleteAsync(track.localUri, { idempotent: true });
        if (track.coverArtUri) await FileSystem.deleteAsync(track.coverArtUri, { idempotent: true });
        if (track.lyricsUri) await FileSystem.deleteAsync(track.lyricsUri, { idempotent: true });
      }
      if (downloadedAlbum.coverArtUri) {
        await FileSystem.deleteAsync(downloadedAlbum.coverArtUri, { idempotent: true });
      }
    } catch (error) {
      console.error('Failed to delete album files:', error);
    }

    set((state) => {
      const downloadedAlbums = { ...state.downloadedAlbums };
      delete downloadedAlbums[albumId];
      const downloadedTracks = { ...state.downloadedTracks };
      downloadedAlbum.tracks.forEach(t => delete downloadedTracks[t.track.id]);
      return { downloadedAlbums, downloadedTracks, totalStorageUsed: state.totalStorageUsed - downloadedAlbum.totalSize };
    });
    get().saveToStorage();
  },

  getDownloadedAlbum: (albumId) => get().downloadedAlbums[albumId],

  markPlaylistDownloaded: (playlist, tracks, metadata, coverArtUri) => {
    const totalSize = tracks.reduce((sum, t) => sum + t.size, 0);
    
    set((state) => {
      const downloadedTracks = { ...state.downloadedTracks };
      tracks.forEach(t => {
        downloadedTracks[t.track.id] = t;
      });

      return {
        downloadedPlaylists: {
          ...state.downloadedPlaylists,
          [playlist.id]: {
            playlist,
            tracks,
            metadata,
            coverArtUri,
            downloadedAt: Date.now(),
            totalSize,
          },
        },
        downloadedTracks,
        totalStorageUsed: state.totalStorageUsed + totalSize,
      };
    });
    get().saveToStorage();
  },

  removePlaylistDownload: async (playlistId) => {
    const downloadedPlaylist = get().downloadedPlaylists[playlistId];
    if (!downloadedPlaylist) return;

    try {
      const FileSystem = await import('expo-file-system');
      for (const track of downloadedPlaylist.tracks) {
        await FileSystem.deleteAsync(track.localUri, { idempotent: true });
        if (track.coverArtUri) await FileSystem.deleteAsync(track.coverArtUri, { idempotent: true });
        if (track.lyricsUri) await FileSystem.deleteAsync(track.lyricsUri, { idempotent: true });
      }
      if (downloadedPlaylist.coverArtUri) {
        await FileSystem.deleteAsync(downloadedPlaylist.coverArtUri, { idempotent: true });
      }
    } catch (error) {
      console.error('Failed to delete playlist files:', error);
    }

    set((state) => {
      const downloadedPlaylists = { ...state.downloadedPlaylists };
      delete downloadedPlaylists[playlistId];
      return { downloadedPlaylists, totalStorageUsed: state.totalStorageUsed - downloadedPlaylist.totalSize };
    });
    get().saveToStorage();
  },

  getDownloadedPlaylist: (playlistId) => get().downloadedPlaylists[playlistId],

  getAllTracks: () => Object.values(get().downloadedTracks),
  getAllAlbums: () => Object.values(get().downloadedAlbums),
  getAllPlaylists: () => Object.values(get().downloadedPlaylists),

  clearCompletedDownloads: () => {
    set((state) => {
      const activeDownloads = { ...state.activeDownloads };
      Object.keys(activeDownloads).forEach(id => {
        const download = activeDownloads[id];
        if (download.status === 'completed' || download.status === 'failed' || download.status === 'cancelled') {
          delete activeDownloads[id];
        }
      });
      return { activeDownloads };
    });
  },

  loadFromStorage: async () => {
    try {
      const [tracksData, albumsData, playlistsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_TRACKS),
        AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_ALBUMS),
        AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_PLAYLISTS),
      ]);
      
      const tracks = tracksData ? JSON.parse(tracksData) : {};
      const albums = albumsData ? JSON.parse(albumsData) : {};
      const playlists = playlistsData ? JSON.parse(playlistsData) : {};
      
      let totalStorageUsed = 0;
      Object.values(tracks).forEach((t: any) => totalStorageUsed += t.size || 0);
      Object.values(albums).forEach((a: any) => totalStorageUsed += a.totalSize || 0);
      Object.values(playlists).forEach((p: any) => totalStorageUsed += p.totalSize || 0);
      
      set({ downloadedTracks: tracks, downloadedAlbums: albums, downloadedPlaylists: playlists, totalStorageUsed });
    } catch (error) {
      console.error('Failed to load downloads from storage:', error);
    }
  },

  saveToStorage: () => {
    const state = get();
    Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_TRACKS, JSON.stringify(state.downloadedTracks)),
      AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_ALBUMS, JSON.stringify(state.downloadedAlbums)),
      AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_PLAYLISTS, JSON.stringify(state.downloadedPlaylists)),
    ]).catch((error) => console.error('Failed to save downloads to storage:', error));
  },
}));
