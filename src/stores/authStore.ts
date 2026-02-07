/**
 * Dino Music App - Auth Store
 * Authentication state management with Zustand
 * Uses Subsonic token authentication (MD5 hash) for security
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { STORAGE_KEYS } from '../config/constants';
import { apiClient } from '../api/client';
import { useServerStore } from './serverStore';
import { useUserStore } from './userStore';
import { getOpenSubsonicExtensions, supportsFormPost, supportsApiKeyAuth, supportsSongLyrics } from '../api/opensubsonic/extensions';

interface Credentials {
  [serverId: string]: {
    username?: string;
    token?: string;  // md5(password + salt)
    salt?: string;   // random salt for token generation
    apiKey?: string; // API key for apiKeyAuthentication extension
  };
}

interface AuthStore {
  credentials: Credentials;
  isAuthenticated: boolean;
  
  // Actions
  login: (serverId: string, username: string, password: string) => Promise<void>;
  loginWithToken: (serverId: string, username: string, token: string, salt: string) => Promise<void>;
  loginWithApiKey: (serverId: string, apiKey: string) => Promise<void>;
  logout: (deleteCredentials?: boolean) => Promise<void>;
  switchServer: (serverId: string) => boolean;
  checkAuth: (serverId: string) => boolean;
  getCurrentServerAuth: () => { username?: string; token?: string; salt?: string; apiKey?: string; serverUrl: string } | null;
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

    // Generate random salt
    const salt = Math.random().toString(36).substring(2, 15);
    
    // Generate token = md5(password + salt)
    const token = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.MD5,
      password + salt
    );

    // Test connection with token
    const success = await apiClient.ping(server.url, username, token, salt);
    if (!success) {
      throw new Error('Authentication failed');
    }

    // Save credentials (token + salt, NOT password)
    const credentials = {
      ...get().credentials,
      [serverId]: { username, token, salt },
    };
    
    await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
    
    // Set API client credentials
    apiClient.setCredentials({
      username,
      token,
      salt,
      serverUrl: server.url,
    });

    set({ credentials, isAuthenticated: true });
    console.log('[AuthStore.login] ✅ Login successful, credentials set, isAuthenticated=true');

    // Fetch user info in background
    useUserStore.getState().fetchUser().catch(err => {
      console.log('[AuthStore.login] Failed to fetch user info:', err);
    });

    // Fetch server capabilities in background
    console.log('[AuthStore.login] 🔍 Starting to fetch server capabilities for serverId:', serverId);
    console.log('[AuthStore.login] 🔍 Current API client has credentials?', apiClient.hasCredentials());
    
    // Use a self-executing async function to ensure proper error handling
    (async () => {
      try {
        console.log('[AuthStore.login] 🔍 Calling getOpenSubsonicExtensions()...');
        const extensions = await getOpenSubsonicExtensions();
        console.log('[AuthStore.login] ✅ Received extensions:', extensions);
        console.log('[AuthStore.login] 🔍 Extensions is array?', Array.isArray(extensions));
        console.log('[AuthStore.login] 🔍 Extensions length:', extensions?.length);
        
        const capabilities = {
          extensions,
          supportsFormPost: supportsFormPost(extensions),
          supportsApiKeyAuth: supportsApiKeyAuth(extensions),
          supportsSongLyrics: supportsSongLyrics(extensions),
          lastChecked: Date.now(),
        };
        
        console.log('[AuthStore.login] 🔍 Computed capabilities:', capabilities);
        useServerStore.getState().updateServerCapabilities(serverId, capabilities);
        console.log('[AuthStore.login] ✅ Server capabilities updated successfully');
      } catch (error) {
        console.error('[AuthStore.login] ❌ Failed to fetch server capabilities:', error);
        console.error('[AuthStore.login] ❌ Error details:', error instanceof Error ? error.message : String(error));
        console.error('[AuthStore.login] ❌ Error stack:', error instanceof Error ? error.stack : 'no stack');
      }
    })();
  },

  loginWithToken: async (serverId: string, username: string, token: string, salt: string) => {
    // Get server info
    const server = useServerStore.getState().servers.find((s) => s.id === serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    // Test connection with token
    const success = await apiClient.ping(server.url, username, token, salt);
    if (!success) {
      throw new Error('Authentication failed');
    }

    // Save credentials
    const credentials = {
      ...get().credentials,
      [serverId]: { username, token, salt },
    };
    
    await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
    
    // Set API client credentials
    apiClient.setCredentials({
      username,
      token,
      salt,
      serverUrl: server.url,
    });

    set({ credentials, isAuthenticated: true });
    console.log('[AuthStore.loginWithToken] ✅ Login successful');

    // Fetch user info in background
    useUserStore.getState().fetchUser().catch(err => {
      console.log('[AuthStore.loginWithToken] Failed to fetch user info:', err);
    });

    // Fetch server capabilities in background
    (async () => {
      try {
        console.log('[AuthStore.loginWithToken] 🔍 Fetching server capabilities...');
        const extensions = await getOpenSubsonicExtensions();
        console.log('[AuthStore.loginWithToken] ✅ Received extensions:', extensions);
        const capabilities = {
          extensions,
          supportsFormPost: supportsFormPost(extensions),
          supportsApiKeyAuth: supportsApiKeyAuth(extensions),
          supportsSongLyrics: supportsSongLyrics(extensions),
          lastChecked: Date.now(),
        };
        useServerStore.getState().updateServerCapabilities(serverId, capabilities);
        console.log('[AuthStore.loginWithToken] ✅ Server capabilities updated');
      } catch (error) {
        console.error('[AuthStore.loginWithToken] ❌ Failed to fetch server capabilities:', error);
      }
    })();
  },

  loginWithApiKey: async (serverId: string, apiKey: string) => {
    // Get server info
    const server = useServerStore.getState().servers.find((s) => s.id === serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    // Test connection with API key
    const success = await apiClient.ping(server.url, undefined, undefined, undefined, apiKey);
    if (!success) {
      throw new Error('Authentication failed');
    }

    // Save credentials (API key only)
    const credentials = {
      ...get().credentials,
      [serverId]: { apiKey },
    };
    
    await AsyncStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
    
    // Set API client credentials
    apiClient.setCredentials({
      apiKey,
      serverUrl: server.url,
    });

    set({ credentials, isAuthenticated: true });
    console.log('[AuthStore.loginWithApiKey] ✅ Login successful');

    // Fetch user info in background
    useUserStore.getState().fetchUser().catch(err => {
      console.log('[AuthStore.loginWithApiKey] Failed to fetch user info:', err);
    });

    // Fetch server capabilities in background
    (async () => {
      try {
        console.log('[AuthStore.loginWithApiKey] 🔍 Fetching server capabilities...');
        const extensions = await getOpenSubsonicExtensions();
        console.log('[AuthStore.loginWithApiKey] ✅ Received extensions:', extensions);
        const capabilities = {
          extensions,
          supportsFormPost: supportsFormPost(extensions),
          supportsApiKeyAuth: supportsApiKeyAuth(extensions),
          supportsSongLyrics: supportsSongLyrics(extensions),
          lastChecked: Date.now(),
        };
        useServerStore.getState().updateServerCapabilities(serverId, capabilities);
        console.log('[AuthStore.loginWithApiKey] ✅ Server capabilities updated');
      } catch (error) {
        console.error('[AuthStore.loginWithApiKey] ❌ Failed to fetch server capabilities:', error);
      }
    })();
  },

  logout: async (deleteCredentials: boolean = false) => {
    // Clear user info
    useUserStore.getState().clearUser();
    
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
      ...credentials,
      serverUrl: server.url,
    });

    // Set server capabilities if available
    if (server.capabilities) {
      console.log('[AuthStore] ⚙️  Setting API client capabilities for switched server');
      apiClient.setServerCapabilities({
        supportsFormPost: server.capabilities.supportsFormPost,
      });
    } else {
      console.log('[AuthStore] ⚠️  No capabilities for switched server');
    }

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
            token: creds.token,
            salt: creds.salt,
            apiKey: creds.apiKey,
            serverUrl: server.url,
          });
          
          // Set server capabilities if available
          if (server.capabilities) {
            console.log('[AuthStore] ⚙️  Setting API client capabilities from storage');
            apiClient.setServerCapabilities({
              supportsFormPost: server.capabilities.supportsFormPost,
            });
          } else {
            console.log('[AuthStore] ⚠️  No capabilities in storage');
          }
          
          // Fetch user info in background
          useUserStore.getState().fetchUser().catch(err => {
            console.log('[AuthStore] Failed to fetch user info on startup:', err);
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
