/**
 * Dino Music App - Offline Store
 * Offline mode state management with Zustand
 */

import { create } from 'zustand';
import * as Network from 'expo-network';

interface OfflineStore {
  isOffline: boolean;
  downloadedTrackIds: Set<string>;
  downloadedAlbumIds: Set<string>;
  downloadedPlaylistIds: Set<string>;
  totalStorageUsed: number; // in bytes
  
  // Actions
  setOfflineMode: (offline: boolean) => void;
  refreshDownloadedContent: () => Promise<void>;
  addDownloadedTrack: (trackId: string, size: number) => void;
  addDownloadedAlbum: (albumId: string) => void;
  addDownloadedPlaylist: (playlistId: string) => void;
  checkNetworkStatus: () => Promise<boolean>;
}

export const useOfflineStore = create<OfflineStore>((set, get) => ({
  isOffline: false,
  downloadedTrackIds: new Set(),
  downloadedAlbumIds: new Set(),
  downloadedPlaylistIds: new Set(),
  totalStorageUsed: 0,

  setOfflineMode: (offline) => {
    set({ isOffline: offline });
  },

  refreshDownloadedContent: async () => {
    // TODO: Query SQLite database to get all downloaded content
    // For now, this is a placeholder
    console.log('Refreshing downloaded content from database...');
  },

  addDownloadedTrack: (trackId, size) => {
    set((state) => {
      const downloadedTrackIds = new Set(state.downloadedTrackIds);
      downloadedTrackIds.add(trackId);
      return {
        downloadedTrackIds,
        totalStorageUsed: state.totalStorageUsed + size,
      };
    });
  },

  addDownloadedAlbum: (albumId) => {
    set((state) => {
      const downloadedAlbumIds = new Set(state.downloadedAlbumIds);
      downloadedAlbumIds.add(albumId);
      return { downloadedAlbumIds };
    });
  },

  addDownloadedPlaylist: (playlistId) => {
    set((state) => {
      const downloadedPlaylistIds = new Set(state.downloadedPlaylistIds);
      downloadedPlaylistIds.add(playlistId);
      return { downloadedPlaylistIds };
    });
  },

  checkNetworkStatus: async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const isOffline = !networkState.isConnected || !networkState.isInternetReachable;
      get().setOfflineMode(isOffline);
      return !isOffline;
    } catch (error) {
      console.error('Failed to check network status:', error);
      return false;
    }
  },
}));
