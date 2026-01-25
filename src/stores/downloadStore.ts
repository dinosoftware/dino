/**
 * Dino Music App - Download Store
 * Download progress tracking with Zustand
 */

import { create } from 'zustand';

export interface DownloadProgress {
  id: string;
  trackId: string;
  progress: number; // 0-1
  totalBytes: number;
  downloadedBytes: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

interface DownloadStore {
  activeDownloads: Map<string, DownloadProgress>;
  completedDownloads: Set<string>; // Track IDs
  
  // Actions
  addDownload: (trackId: string, totalBytes: number) => string;
  updateProgress: (id: string, downloadedBytes: number) => void;
  completeDownload: (id: string, trackId: string) => void;
  failDownload: (id: string, error: string) => void;
  cancelDownload: (id: string) => void;
  isDownloaded: (trackId: string) => boolean;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  activeDownloads: new Map(),
  completedDownloads: new Set(),

  addDownload: (trackId, totalBytes) => {
    const id = `download_${Date.now()}_${trackId}`;
    const download: DownloadProgress = {
      id,
      trackId,
      progress: 0,
      totalBytes,
      downloadedBytes: 0,
      status: 'pending',
    };

    set((state) => {
      const activeDownloads = new Map(state.activeDownloads);
      activeDownloads.set(id, download);
      return { activeDownloads };
    });

    return id;
  },

  updateProgress: (id, downloadedBytes) => {
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
        });
      }
      
      return { activeDownloads };
    });
  },

  completeDownload: (id, trackId) => {
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
      
      const completedDownloads = new Set(state.completedDownloads);
      completedDownloads.add(trackId);
      
      return { activeDownloads, completedDownloads };
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

  isDownloaded: (trackId) => {
    return get().completedDownloads.has(trackId);
  },
}));
