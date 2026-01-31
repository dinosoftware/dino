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
  itemId: string; // Track/Album/Playlist ID
  type: DownloadType;
  progress: number; // 0-1
  totalBytes: number;
  downloadedBytes: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  // For albums/playlists
  totalTracks?: number;
  completedTracks?: number;
  // Display metadata
  title?: string;
  artist?: string;
  coverArtUri?: string;
}

export interface DownloadedTrack {
  track: Track;
  localUri: string; // File path on device
  coverArtUri?: string; // Cached cover art
  lyricsUri?: string; // Cached lyrics
  downloadedAt: number;
  size: number; // bytes
}

export interface DownloadedAlbum {
  album: Album;
  tracks: DownloadedTrack[];
  coverArtUri?: string;
  downloadedAt: number;
  totalSize: number; // bytes
  // Full metadata for offline use
  metadata: any; // Full getAlbum response
}

export interface DownloadedPlaylist {
  playlist: Playlist;
  tracks: DownloadedTrack[];
  coverArtUri?: string;
  downloadedAt: number;
  totalSize: number; // bytes
  // Full metadata for offline use
  metadata: any; // Full getPlaylist response
}

interface DownloadStore {
  // Progress tracking
  activeDownloads: Map<string, DownloadProgress>;
  
  // Downloaded content
  downloadedTracks: Record<string, DownloadedTrack>; // trackId -> track
  downloadedAlbums: Record<string, DownloadedAlbum>; // albumId -> album
  downloadedPlaylists: Record<string, DownloadedPlaylist>; // playlistId -> playlist
  
  totalStorageUsed: number; // bytes
  
  // Progress actions
  addDownload: (itemId: string, type: DownloadType, totalBytes: number, totalTracks?: number) => string;
  updateProgress: (id: string, downloadedBytes: number, completedTracks?: number) => void;
  completeDownload: (id: string) => void;
  failDownload: (id: string, error: string) => void;
  cancelDownload: (id: string) => void;
  
  // Check download status
  isTrackDownloaded: (trackId: string) => boolean;
  isAlbumDownloaded: (albumId: string) => boolean;
  isPlaylistDownloaded: (playlistId: string) => boolean;
  
  // Track downloads
  markTrackDownloaded: (track: Track, localUri: string, size: number, coverArtUri?: string, lyricsUri?: string) => void;
  removeTrackDownload: (trackId: string) => Promise<void>;
  getDownloadedTrack: (trackId: string) => DownloadedTrack | undefined;
  
  // Album downloads
  markAlbumDownloaded: (album: Album, tracks: DownloadedTrack[], metadata: any, coverArtUri?: string) => void;
  removeAlbumDownload: (albumId: string) => Promise<void>;
  getDownloadedAlbum: (albumId: string) => DownloadedAlbum | undefined;
  
  // Playlist downloads
  markPlaylistDownloaded: (playlist: Playlist, tracks: DownloadedTrack[], metadata: any, coverArtUri?: string) => void;
  removePlaylistDownload: (playlistId: string) => Promise<void>;
  getDownloadedPlaylist: (playlistId: string) => DownloadedPlaylist | undefined;
  
  // Get all downloads
  getAllTracks: () => DownloadedTrack[];
  getAllAlbums: () => DownloadedAlbum[];
  getAllPlaylists: () => DownloadedPlaylist[];
  
  // Persistence
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => void;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  activeDownloads: new Map(),
  downloadedTracks: {},
  downloadedAlbums: {},
  downloadedPlaylists: {},
  totalStorageUsed: 0,

  // Progress tracking
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

    set((state) => {
      const activeDownloads = new Map(state.activeDownloads);
      activeDownloads.set(id, download);
      return { activeDownloads };
    });

    return id;
  },

  updateProgress: (id, downloadedBytes, completedTracks) => {
    set((state) => {
      const activeDownloads = new Map(state.activeDownloads);
      const download = activeDownloads.get(id);
      
      if (download) {
        const progress = download.totalBytes > 0 ? downloadedBytes / download.totalBytes : 0;
        activeDownloads.set(id, {
          ...download,
          downloadedBytes,
          progress,
          status: 'downloading',
          ...(completedTracks !== undefined && { completedTracks }),
        });
      }
      
      return { activeDownloads };
    });
  },

  completeDownload: (id) => {
    set((state) => {
      const activeDownloads = new Map(state.activeDownloads);
      const download = activeDownloads.get(id);
      
      if (download) {
        activeDownloads.set(id, {
          ...download,
          progress: 1,
          status: 'completed',
        });
      }
      
      return { activeDownloads };
    });
  },

  failDownload: (id, error) => {
    set((state) => {
      const activeDownloads = new Map(state.activeDownloads);
      const download = activeDownloads.get(id);
      
      if (download) {
        activeDownloads.set(id, {
          ...download,
          status: 'failed',
          error,
        });
      }
      
      return { activeDownloads };
    });
  },

  cancelDownload: (id) => {
    set((state) => {
      const activeDownloads = new Map(state.activeDownloads);
      const download = activeDownloads.get(id);
      
      if (download) {
        activeDownloads.set(id, {
          ...download,
          status: 'cancelled',
        });
      }
      
      return { activeDownloads };
    });
  },

  // Check status
  isTrackDownloaded: (trackId) => {
    return !!get().downloadedTracks[trackId];
  },

  isAlbumDownloaded: (albumId) => {
    return !!get().downloadedAlbums[albumId];
  },

  isPlaylistDownloaded: (playlistId) => {
    return !!get().downloadedPlaylists[playlistId];
  },

  // Track downloads
  markTrackDownloaded: (track, localUri, size, coverArtUri, lyricsUri) => {
    set((state) => {
      const downloadedTracks = {
        ...state.downloadedTracks,
        [track.id]: {
          track,
          localUri,
          coverArtUri,
          lyricsUri,
          downloadedAt: Date.now(),
          size,
        },
      };
      
      const totalStorageUsed = state.totalStorageUsed + size;
      
      return { downloadedTracks, totalStorageUsed };
    });
    
    get().saveToStorage();
  },

  removeTrackDownload: async (trackId) => {
    const downloadedTrack = get().downloadedTracks[trackId];
    
    if (!downloadedTrack) {
      return;
    }
    
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
      
      const totalStorageUsed = state.totalStorageUsed - downloadedTrack.size;
      
      return { downloadedTracks, totalStorageUsed };
    });
    
    get().saveToStorage();
  },

  getDownloadedTrack: (trackId) => {
    return get().downloadedTracks[trackId];
  },

  // Album downloads
  markAlbumDownloaded: (album, tracks, metadata, coverArtUri) => {
    const totalSize = tracks.reduce((sum, t) => sum + t.size, 0);
    
    set((state) => {
      const downloadedAlbums = {
        ...state.downloadedAlbums,
        [album.id]: {
          album,
          tracks,
          metadata,
          coverArtUri,
          downloadedAt: Date.now(),
          totalSize,
        },
      };
      
      // Also add individual tracks to track store
      const downloadedTracks = { ...state.downloadedTracks };
      tracks.forEach(t => {
        downloadedTracks[t.track.id] = t;
      });
      
      const totalStorageUsed = state.totalStorageUsed + totalSize;
      
      return { downloadedAlbums, downloadedTracks, totalStorageUsed };
    });
    
    get().saveToStorage();
  },

  removeAlbumDownload: async (albumId) => {
    const downloadedAlbum = get().downloadedAlbums[albumId];
    
    if (!downloadedAlbum) {
      return;
    }
    
    try {
      const FileSystem = await import('expo-file-system');
      
      // Delete all track files
      for (const track of downloadedAlbum.tracks) {
        await FileSystem.deleteAsync(track.localUri, { idempotent: true });
        if (track.coverArtUri) {
          await FileSystem.deleteAsync(track.coverArtUri, { idempotent: true });
        }
        if (track.lyricsUri) {
          await FileSystem.deleteAsync(track.lyricsUri, { idempotent: true });
        }
      }
      
      // Delete album cover
      if (downloadedAlbum.coverArtUri) {
        await FileSystem.deleteAsync(downloadedAlbum.coverArtUri, { idempotent: true });
      }
    } catch (error) {
      console.error('Failed to delete album files:', error);
    }
    
    set((state) => {
      const downloadedAlbums = { ...state.downloadedAlbums };
      delete downloadedAlbums[albumId];
      
      // Remove tracks from track store
      const downloadedTracks = { ...state.downloadedTracks };
      downloadedAlbum.tracks.forEach(t => {
        delete downloadedTracks[t.track.id];
      });
      
      const totalStorageUsed = state.totalStorageUsed - downloadedAlbum.totalSize;
      
      return { downloadedAlbums, downloadedTracks, totalStorageUsed };
    });
    
    get().saveToStorage();
  },

  getDownloadedAlbum: (albumId) => {
    return get().downloadedAlbums[albumId];
  },

  // Playlist downloads
  markPlaylistDownloaded: (playlist, tracks, metadata, coverArtUri) => {
    const totalSize = tracks.reduce((sum, t) => sum + t.size, 0);
    
    set((state) => {
      const downloadedPlaylists = {
        ...state.downloadedPlaylists,
        [playlist.id]: {
          playlist,
          tracks,
          metadata,
          coverArtUri,
          downloadedAt: Date.now(),
          totalSize,
        },
      };
      
      // Also add individual tracks to track store
      const downloadedTracks = { ...state.downloadedTracks };
      tracks.forEach(t => {
        downloadedTracks[t.track.id] = t;
      });
      
      const totalStorageUsed = state.totalStorageUsed + totalSize;
      
      return { downloadedPlaylists, downloadedTracks, totalStorageUsed };
    });
    
    get().saveToStorage();
  },

  removePlaylistDownload: async (playlistId) => {
    const downloadedPlaylist = get().downloadedPlaylists[playlistId];
    
    if (!downloadedPlaylist) {
      return;
    }
    
    try {
      const FileSystem = await import('expo-file-system');
      
      // Delete all track files
      for (const track of downloadedPlaylist.tracks) {
        await FileSystem.deleteAsync(track.localUri, { idempotent: true });
        if (track.coverArtUri) {
          await FileSystem.deleteAsync(track.coverArtUri, { idempotent: true });
        }
        if (track.lyricsUri) {
          await FileSystem.deleteAsync(track.lyricsUri, { idempotent: true });
        }
      }
      
      // Delete playlist cover
      if (downloadedPlaylist.coverArtUri) {
        await FileSystem.deleteAsync(downloadedPlaylist.coverArtUri, { idempotent: true });
      }
    } catch (error) {
      console.error('Failed to delete playlist files:', error);
    }
    
    set((state) => {
      const downloadedPlaylists = { ...state.downloadedPlaylists };
      delete downloadedPlaylists[playlistId];
      
      // Note: Don't remove tracks from track store as they might be in other playlists/albums
      
      const totalStorageUsed = state.totalStorageUsed - downloadedPlaylist.totalSize;
      
      return { downloadedPlaylists, totalStorageUsed };
    });
    
    get().saveToStorage();
  },

  getDownloadedPlaylist: (playlistId) => {
    return get().downloadedPlaylists[playlistId];
  },

  // Get all
  getAllTracks: () => {
    return Object.values(get().downloadedTracks);
  },

  getAllAlbums: () => {
    return Object.values(get().downloadedAlbums);
  },

  getAllPlaylists: () => {
    return Object.values(get().downloadedPlaylists);
  },

  // Persistence
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
      
      // Calculate total storage
      let totalStorageUsed = 0;
      Object.values(tracks).forEach((t: any) => totalStorageUsed += t.size || 0);
      Object.values(albums).forEach((a: any) => totalStorageUsed += a.totalSize || 0);
      Object.values(playlists).forEach((p: any) => totalStorageUsed += p.totalSize || 0);
      
      set({
        downloadedTracks: tracks,
        downloadedAlbums: albums,
        downloadedPlaylists: playlists,
        totalStorageUsed,
      });
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
    ]).catch((error) => {
      console.error('Failed to save downloads to storage:', error);
    });
  },
}));
