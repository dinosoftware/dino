/**
 * Dino Music App - Settings Store
 * User preferences and app settings with Zustand
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../config/constants';
import * as Network from 'expo-network';

type StreamingQuality = '0' | '64' | '96' | '128' | '160' | '192' | '256' | '320';
type StreamingFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'original';
type LyricsFontSize = 'small' | 'medium' | 'large';

interface Settings {
  // Streaming
  streamingQualityWiFi: StreamingQuality;
  streamingQualityMobile: StreamingQuality;
  streamingFormatWiFi: StreamingFormat;
  streamingFormatMobile: StreamingFormat;
  
  // Downloads
  wifiOnlyDownloads: boolean;
  maxConcurrentDownloads: number;
  
  // Playback
  crossfadeDuration: number;
  gaplessPlayback: boolean;
  normalizeVolume: boolean;
  
  // Radio
  radioQueueSize: number;
  
  // Storage
  storageLimit: number; // in MB
  streamCacheSize: number; // in MB
  
  // Chromecast
  autoCastOnConnect: boolean;
  
  // Lyrics
  lyricsFontSize: LyricsFontSize;
  autoScrollLyrics: boolean;
  showLyricsTimestamps: boolean;
  
  // Queue Sync
  autoSyncQueue: boolean;
  queueSyncInterval: number; // in milliseconds
  
  // Scrobbling
  enableScrobbling: boolean;
  scrobbleProgressInterval: number; // in milliseconds
  
  // Sharing
  includeShareMessage: boolean; // "Check out X" in share messages
}

interface SettingsStore extends Settings {
  // Actions
  updateSettings: (settings: Partial<Settings>) => void;
  resetToDefaults: () => void;
  getActiveStreamingQuality: () => Promise<StreamingQuality>;
  loadFromStorage: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,

  updateSettings: (settings: Partial<Settings>) => {
    set((state) => {
      const newSettings = { ...state, ...settings };
      // Save to storage (exclude actions)
      const { updateSettings, resetToDefaults, getActiveStreamingQuality, loadFromStorage, ...settingsToSave } = newSettings;
      AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsToSave));
      return newSettings;
    });
  },

  resetToDefaults: () => {
    set(DEFAULT_SETTINGS);
    const { updateSettings, resetToDefaults, getActiveStreamingQuality, loadFromStorage, ...settingsToSave } = DEFAULT_SETTINGS as any;
    AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsToSave));
  },

  getActiveStreamingQuality: async (): Promise<StreamingQuality> => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const isWiFi = networkState.type === Network.NetworkStateType.WIFI;
      return isWiFi ? get().streamingQualityWiFi : get().streamingQualityMobile;
    } catch (error) {
      console.error('Failed to get network state:', error);
      return get().streamingQualityMobile; // Fallback to mobile quality
    }
  },

  loadFromStorage: async () => {
    try {
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = settingsJson ? JSON.parse(settingsJson) : DEFAULT_SETTINGS;
      set(settings);
    } catch (error) {
      console.error('Failed to load settings from storage:', error);
      set(DEFAULT_SETTINGS);
    }
  },
}));
