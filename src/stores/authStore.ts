/**
 * Dino Music App - Auth Store
 * Authentication state management with Zustand
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';
import { apiClient } from '../api/client';
import { useServerStore } from './serverStore';

interface Credentials {
  [serverId: string]: {
    username: string;
    password: string;
  };
}

interface AuthStore {
  credentials: Credentials;
  isAuthenticated: boolean;
  
  // Actions
  login: (serverId: string, username: string, password: string) => Promise<void>;
  logout: (deleteCredentials?: boolean) => Promise<void>;
  switchServer: (serverId: string) => boolean;
  checkAuth: (serverId: string) => boolean;
  getCurrentServerAuth: () => { username: string; password: string; serverUrl: string } | null;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  credentials: {},
  isAuthenticated: false,

  login: async (serverId: string, username: string, password: string) => {
    // Get server info
    const server = useServerStore.getState().servers.find((s) => s.id === serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    // Test connection
    const success = await apiClient.ping(server.url, username, password);
    if (!success) {
      throw new Error('Authentication failed');
    }

    // Save credentials
    const credentials = {
      ...get().credentials,
      [serverId]: { username, password },
    };
    
    await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
    
    // Set API client credentials
    apiClient.setCredentials({
      username,
      password,
      serverUrl: server.url,
    });

    set({ credentials, isAuthenticated: true });
  },

  logout: async (deleteCredentials: boolean = false) => {
    if (deleteCredentials) {
      // ONLY delete credentials if explicitly requested (e.g., "Forget this server")
      await AsyncStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
      apiClient.clearCredentials();
      set({ credentials: {}, isAuthenticated: false });
    } else {
      // Normal logout - keep credentials but clear session
      // Just clear API client and set authenticated to false
      apiClient.clearCredentials();
      set({ isAuthenticated: false });
      console.log('[AuthStore] Logged out (credentials preserved)');
    }
  },

  switchServer: (serverId: string) => {
    const credentials = get().credentials[serverId];
    const server = useServerStore.getState().servers.find((s) => s.id === serverId);

    if (!credentials || !server) {
      // No credentials for this server
      console.log('[AuthStore] No credentials for server:', serverId);
      apiClient.clearCredentials();
      set({ isAuthenticated: false });
      return false;
    }

    // Has credentials - set them in API client
    console.log('[AuthStore] Switching to server:', server.url);
    apiClient.setCredentials({
      username: credentials.username,
      password: credentials.password,
      serverUrl: server.url,
    });

    set({ isAuthenticated: true });
    return true;
  },

  checkAuth: (serverId: string) => {
    return !!get().credentials[serverId];
  },

  getCurrentServerAuth: () => {
    const currentServerId = useServerStore.getState().currentServerId;
    if (!currentServerId) return null;

    const credentials = get().credentials[currentServerId];
    if (!credentials) return null;

    const server = useServerStore.getState().servers.find((s) => s.id === currentServerId);
    if (!server) return null;

    return {
      ...credentials,
      serverUrl: server.url,
    };
  },

  loadFromStorage: async () => {
    try {
      const credentialsJson = await AsyncStorage.getItem(STORAGE_KEYS.CREDENTIALS);
      const credentials = credentialsJson ? JSON.parse(credentialsJson) : {};

      console.log('[AuthStore] Loaded credentials from AsyncStorage:', Object.keys(credentials));

      // Get current server ID (should already be loaded by serverStore)
      const currentServerId = useServerStore.getState().currentServerId;
      
      console.log('[AuthStore] Current server ID:', currentServerId);
      console.log('[AuthStore] Has credentials for this server:', currentServerId ? !!credentials[currentServerId] : false);

      // Check if current server has credentials
      const isAuthenticated = currentServerId ? !!credentials[currentServerId] : false;

      // Set state - this is synchronous and immediate
      set({ credentials, isAuthenticated });

      console.log('[AuthStore] State set - isAuthenticated:', isAuthenticated);

      // Set API client credentials if authenticated
      if (isAuthenticated && currentServerId) {
        const creds = credentials[currentServerId];
        const server = useServerStore.getState().servers.find((s) => s.id === currentServerId);
        
        if (creds && server) {
          console.log('[AuthStore] Restoring API credentials for server:', server.url);
          apiClient.setCredentials({
            username: creds.username,
            password: creds.password,
            serverUrl: server.url,
          });
        } else {
          console.log('[AuthStore] Could not find server or credentials');
        }
      } else {
        console.log('[AuthStore] Not authenticated - no valid credentials');
      }
    } catch (error) {
      console.error('Failed to load auth data from storage:', error);
      set({ credentials: {}, isAuthenticated: false });
    }
  },
}));
