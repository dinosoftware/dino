/**
 * Dino Music App - Server Store
 * Multi-server management with Zustand
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';

export interface Server {
  id: string;
  name: string;
  url: string;
  createdAt: number;
}

interface ServerStore {
  servers: Server[];
  currentServerId: string | null;
  hasCompletedSetup: boolean;
  
  // Actions
  addServer: (name: string, url: string) => Server;
  removeServer: (id: string) => void;
  updateServer: (id: string, name: string, url: string) => void;
  setCurrentServer: (id: string) => void;
  getCurrentServer: () => Server | null;
  completeFirstTimeSetup: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  currentServerId: null,
  hasCompletedSetup: false,

  addServer: (name: string, url: string) => {
    const newServer: Server = {
      id: `server_${Date.now()}`,
      name,
      url: url.replace(/\/$/, ''), // Remove trailing slash
      createdAt: Date.now(),
    };

    set((state) => {
      const servers = [...state.servers, newServer];
      AsyncStorage.setItem(STORAGE_KEYS.SERVERS, JSON.stringify(servers));
      return { servers };
    });

    // Always set newly added server as current (user is adding it to use it)
    get().setCurrentServer(newServer.id);

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

  setCurrentServer: (id: string) => {
    set({ currentServerId: id });
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SERVER_ID, id);
  },

  getCurrentServer: () => {
    const state = get();
    return state.servers.find((s) => s.id === state.currentServerId) || null;
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
