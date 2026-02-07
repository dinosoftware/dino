/**
 * Dino Music App - Server Store
 * Multi-server management with Zustand
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';
import { OpenSubsonicExtension } from '../api/opensubsonic/extensions';
import { apiClient } from '../api/client';

export interface ServerCapabilities {
  extensions: OpenSubsonicExtension[] | null;
  supportsFormPost: boolean;
  supportsApiKeyAuth: boolean;
  supportsSongLyrics: boolean;
  lastChecked: number;
}

export interface Server {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  capabilities?: ServerCapabilities;
}

interface ServerStore {
  servers: Server[];
  currentServerId: string | null;
  hasCompletedSetup: boolean;
  
  // Actions
  addServer: (name: string, url: string, autoSwitch?: boolean) => Server;
  removeServer: (id: string) => void;
  updateServer: (id: string, name: string, url: string) => void;
  updateServerCapabilities: (id: string, capabilities: ServerCapabilities) => void;
  setCurrentServer: (id: string) => void;
  getCurrentServer: () => Server | null;
  getCurrentServerCapabilities: () => ServerCapabilities | null;
  completeFirstTimeSetup: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  currentServerId: null,
  hasCompletedSetup: false,

  addServer: (name: string, url: string, autoSwitch: boolean = false) => {
    const newServer: Server = {
      id: `server_${Date.now()}`,
      name,
      url: url.replace(/\/$/, ''), // Remove trailing slash
      createdAt: Date.now(),
    };

    set((state) => {
      const servers = [...state.servers, newServer];
      AsyncStorage.setItem(STORAGE_KEYS.SERVERS, JSON.stringify(servers));
      
      // Update currentServerId in the same state update to avoid race condition
      const currentServerId = autoSwitch ? newServer.id : state.currentServerId;
      if (autoSwitch) {
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SERVER_ID, newServer.id);
      }
      
      return { servers, currentServerId };
    });

    return newServer;
  },

  removeServer: (id: string) => {
    set((state) => {
      const servers = state.servers.filter((s) => s.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.SERVERS, JSON.stringify(servers));

      // If removing current server, switch to first available
      let currentServerId = state.currentServerId;
      if (currentServerId === id) {
        currentServerId = servers.length > 0 ? servers[0].id : null;
        if (currentServerId) {
          AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SERVER_ID, currentServerId);
        } else {
          AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SERVER_ID);
        }
      }

      return { servers, currentServerId };
    });
  },

  updateServer: (id: string, name: string, url: string) => {
    set((state) => {
      const servers = state.servers.map((s) =>
        s.id === id
          ? { ...s, name, url: url.replace(/\/$/, '') }
          : s
      );
      AsyncStorage.setItem(STORAGE_KEYS.SERVERS, JSON.stringify(servers));
      return { servers };
    });
  },

  updateServerCapabilities: (id: string, capabilities: ServerCapabilities) => {
    console.log('[ServerStore] Updating capabilities for server:', id);
    console.log('[ServerStore] New capabilities:', JSON.stringify(capabilities, null, 2));
    set((state) => {
      const servers = state.servers.map((s) =>
        s.id === id
          ? { ...s, capabilities }
          : s
      );
      AsyncStorage.setItem(STORAGE_KEYS.SERVERS, JSON.stringify(servers));
      console.log('[ServerStore] Server list after update:', servers.map(s => ({ 
        id: s.id, 
        name: s.name, 
        hasCapabilities: !!s.capabilities,
        extensionsCount: s.capabilities?.extensions?.length || 0
      })));
      
      // If this is the current server, update API client capabilities
      if (id === state.currentServerId) {
        console.log('[ServerStore] Updating API client with server capabilities');
        apiClient.setServerCapabilities({
          supportsFormPost: capabilities.supportsFormPost,
        });
      }
      
      return { servers };
    });
  },

  setCurrentServer: (id: string) => {
    set({ currentServerId: id });
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SERVER_ID, id);
  },

  getCurrentServer: () => {
    const state = get();
    return state.servers.find((s) => s.id === state.currentServerId) || null;
  },

  getCurrentServerCapabilities: () => {
    const currentServer = get().getCurrentServer();
    return currentServer?.capabilities || null;
  },

  completeFirstTimeSetup: () => {
    set({ hasCompletedSetup: true });
    AsyncStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_SETUP, 'true');
  },

  loadFromStorage: async () => {
    try {
      const serversJson = await AsyncStorage.getItem(STORAGE_KEYS.SERVERS);
      const servers = serversJson ? JSON.parse(serversJson) : [];
      
      const currentServerId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SERVER_ID) || null;
      const hasCompletedSetupStr = await AsyncStorage.getItem(STORAGE_KEYS.HAS_COMPLETED_SETUP);
      const hasCompletedSetup = hasCompletedSetupStr === 'true';

      console.log('[ServerStore] Loaded from AsyncStorage:', { 
        serversCount: servers.length, 
        currentServerId, 
        hasCompletedSetup 
      });

      set({ servers, currentServerId, hasCompletedSetup });
    } catch (error) {
      console.error('Failed to load server data from storage:', error);
    }
  },
}));
