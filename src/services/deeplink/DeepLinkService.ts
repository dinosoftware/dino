/**
 * Dino Music App - Deep Link Service
 * Handles deep linking for server setup and share links
 */

import * as Linking from 'expo-linking';
import { useServerStore } from '../../stores/serverStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { useToastStore } from '../../stores/toastStore';

class DeepLinkService {
  private isInitialized = false;

  /**
   * Initialize deep link handling
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[DeepLink] Already initialized');
      return;
    }

    console.log('[DeepLink] Initializing...');

    try {
      // Handle app opened from deep link (app was closed)
      const initialUrl = await Linking.getInitialURL();
      console.log('[DeepLink] Initial URL from getInitialURL:', initialUrl);
      
      if (initialUrl) {
        console.log('[DeepLink] Processing initial URL:', initialUrl);
        // Delay handling to ensure app is fully loaded
        setTimeout(() => {
          console.log('[DeepLink] Handling delayed initial URL');
          this.handleURL(initialUrl);
        }, 1500);
      }

      // Handle deep links while app is running
      const subscription = Linking.addEventListener('url', (event) => {
        console.log('[DeepLink] URL event received:', event);
        if (event && event.url) {
          console.log('[DeepLink] Processing URL from event:', event.url);
          this.handleURL(event.url);
        } else {
          console.error('[DeepLink] URL event missing url property:', event);
        }
      });

      this.isInitialized = true;
      console.log('[DeepLink] Initialized successfully');

      return () => {
        subscription.remove();
      };
    } catch (error) {
      console.error('[DeepLink] Initialization error:', error);
      this.isInitialized = true; // Mark as initialized anyway to prevent re-init
    }
  }

  /**
   * Parse and handle incoming deep link URL
   */
  async handleURL(url: string) {
    try {
      console.log('[DeepLink] Raw URL:', url);
      
      if (!url || typeof url !== 'string') {
        console.error('[DeepLink] Invalid URL - not a string:', url);
        return;
      }

      const parsed = Linking.parse(url);
      console.log('[DeepLink] Parsed URL:', {
        scheme: parsed.scheme,
        hostname: parsed.hostname,
        path: parsed.path,
        queryParams: parsed.queryParams,
      });

      // Handle notification click - open full player
      if (url.includes('notification.') || url.startsWith('notification:') || parsed.hostname === 'notification') {
        console.log('[DeepLink] Notification clicked - opening full player');
        useNavigationStore.getState().setShowFullPlayer(true);
        return;
      }

      // Only process deep link URLs with our scheme
      if (parsed.scheme !== 'dino') {
        console.log('[DeepLink] Ignoring non-dino scheme:', parsed.scheme);
        return;
      }

      if (!parsed.hostname) {
        console.error('[DeepLink] No hostname in parsed URL');
        return; // Silently ignore invalid formats
      }

      // Handle different deep link types
      const queryParams = parsed.queryParams || {};
      
      switch (parsed.hostname) {
        case 'add-server':
          await this.handleAddServer(queryParams);
          break;
        case 'share':
          await this.handleShare(queryParams);
          break;
        default:
          console.warn('[DeepLink] Unknown deep link hostname:', parsed.hostname);
          // Only show error for actual dino:// deep links, not random URLs
          if (parsed.scheme === 'dino') {
            useToastStore.getState().showToast(`Unknown deep link type: ${parsed.hostname}`, 'error');
          }
      }
    } catch (error) {
      console.error('[DeepLink] Error handling URL:', error);
      console.error('[DeepLink] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      useToastStore.getState().showToast('Failed to process deep link', 'error');
    }
  }

  /**
   * Handle add-server deep link
   * Formats:
   *   - With token: dino://add-server?url=...&name=...&user=...&token=...&salt=...
   *   - With password: dino://add-server?url=...&name=...&user=...&password=...
   *   - With API key: dino://add-server?url=...&name=...&apiKey=... (or apikey=...)
   */
  async handleAddServer(params: Record<string, any>) {
    console.log('[DeepLink] Handling add-server with params:', params);

    // Handle both apiKey (camelCase) and apikey (lowercase) for compatibility
    const { url, name, user, token, salt, password, apiKey, apikey } = params;

    // Validate required parameters
    if (!url) {
      console.error('[DeepLink] Missing required parameter: url');
      useToastStore.getState().showToast('Invalid server link: missing URL', 'error');
      return;
    }

    const serverUrl = Array.isArray(url) ? url[0] : url;
    const serverName = Array.isArray(name) ? name[0] : (name || 'New Server');
    const username = Array.isArray(user) ? user[0] : user;
    const authToken = Array.isArray(token) ? token[0] : token;
    const authSalt = Array.isArray(salt) ? salt[0] : salt;
    const authPassword = Array.isArray(password) ? password[0] : password;
    // Handle both camelCase and lowercase apiKey
    const rawApiKey = apiKey || apikey;
    const authApiKey = Array.isArray(rawApiKey) ? rawApiKey[0] : rawApiKey;

    // Check if server already exists
    const existingServer = useServerStore.getState().servers.find(
      s => s.url.toLowerCase() === serverUrl.toLowerCase()
    );

    if (existingServer) {
      console.log('[DeepLink] Server already exists:', existingServer.name);
      
      // Check if user has other servers (check before any operations)
      const hasOtherServers = useServerStore.getState().servers.length > 1;
      const isCurrentServer = existingServer.id === useServerStore.getState().currentServerId;
      
      // If credentials provided, update them
      if (authApiKey || (username && (authToken && authSalt || authPassword))) {
        try {
          if (hasOtherServers && !isCurrentServer) {
            // Has other servers AND this is NOT the current server
            // Just save credentials without logging in (which would switch API client)
            console.log('[DeepLink] Updating credentials without switching (other servers exist)');
            
            let credentialsToSave: { username?: string; token?: string; salt?: string; apiKey?: string };
            
            if (authApiKey) {
              // API key authentication
              const apiClient = await import('../../api/client');
              const valid = await apiClient.apiClient.ping(serverUrl, undefined, undefined, undefined, authApiKey);
              if (!valid) {
                throw new Error('Invalid API key');
              }
              credentialsToSave = { apiKey: authApiKey };
            } else if (authToken && authSalt) {
              // Token authentication
              const apiClient = await import('../../api/client');
              const valid = await apiClient.apiClient.ping(serverUrl, username, authToken, authSalt);
              if (!valid) {
                throw new Error('Invalid credentials');
              }
              credentialsToSave = { username, token: authToken, salt: authSalt };
            } else {
              // Password authentication - generate token
              const Crypto = await import('expo-crypto');
              const salt = Math.random().toString(36).substring(2, 15);
              const token = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.MD5,
                authPassword + salt
              );
              const apiClient = await import('../../api/client');
              const valid = await apiClient.apiClient.ping(serverUrl, username, token, salt);
              if (!valid) {
                throw new Error('Invalid credentials');
              }
              credentialsToSave = { username, token, salt };
            }
            
            // Save credentials WITHOUT logging in
            const authStore = useAuthStore.getState();
            const credentials = {
              ...authStore.credentials,
              [existingServer.id]: credentialsToSave,
            };
            
            const AsyncStorage = await import('@react-native-async-storage/async-storage');
            const { STORAGE_KEYS } = await import('../../config/constants');
            await AsyncStorage.default.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
            
            // Update auth store state (but don't set isAuthenticated - only for current server)
            useAuthStore.setState({ credentials });
            
            useToastStore.getState().showToast(`Credentials updated for ${existingServer.name}`);
            useNavigationStore.getState().navigate({ name: 'settings' });
          } else {
            // Either only one server OR this IS the current server - safe to login
            console.log('[DeepLink] Logging in to update credentials (safe to switch)');
            
            if (authApiKey) {
              await useAuthStore.getState().loginWithApiKey(existingServer.id, authApiKey);
            } else if (authToken && authSalt) {
              await useAuthStore.getState().loginWithToken(
                existingServer.id,
                username,
                authToken,
                authSalt
              );
            } else if (authPassword) {
              await useAuthStore.getState().login(
                existingServer.id,
                username,
                authPassword
              );
            }
            
            if (!isCurrentServer) {
              useServerStore.getState().setCurrentServer(existingServer.id);
              useAuthStore.getState().switchServer(existingServer.id);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            useToastStore.getState().showToast(`Credentials updated for ${existingServer.name}`);
            useNavigationStore.getState().navigate({ name: 'home' });
          }
        } catch (error) {
          console.error('[DeepLink] Failed to update credentials:', error);
          useToastStore.getState().showToast('Failed to update credentials. Please check username/password.', 'error');
        }
      } else {
        // No credentials - server already exists
        useToastStore.getState().showToast(`Server "${existingServer.name}" already exists`, 'info');
        
        // Check if user has other servers
        const hasOtherServers = useServerStore.getState().servers.length > 1;
        if (hasOtherServers) {
          // Navigate to settings so user can switch manually
          useNavigationStore.getState().navigate({ name: 'settings' });
        } else {
          // Only one server - check if they have credentials
          const hasCredentials = useAuthStore.getState().checkAuth(existingServer.id);
          if (hasCredentials) {
            useServerStore.getState().setCurrentServer(existingServer.id);
            useAuthStore.getState().switchServer(existingServer.id);
            useNavigationStore.getState().navigate({ name: 'home' });
          }
        }
      }
      return;
    }

    // Check if there were other servers BEFORE adding this one
    const hadOtherServers = useServerStore.getState().servers.length > 0;
    
    // Add new server (don't auto-switch, we'll handle that manually)
    useServerStore.getState().addServer(serverName, serverUrl, false);

    console.log('[DeepLink] Added new server:', { name: serverName, url: serverUrl });
    console.log('[DeepLink] Had other servers before adding:', hadOtherServers);
    
    // Get the newly added server (it will be the last one)
    const servers = useServerStore.getState().servers;
    const newServer = servers[servers.length - 1];
    const serverId = newServer.id;

    // If credentials provided, save them
    if (authApiKey || (username && (authToken && authSalt || authPassword))) {
      try {
        if (hadOtherServers) {
          // User has other servers - just save credentials without logging in/switching
          console.log('[DeepLink] Saving credentials without switching servers');
          
          let credentialsToSave: { username?: string; token?: string; salt?: string; apiKey?: string };
          
          if (authApiKey) {
            // API key authentication
            credentialsToSave = { apiKey: authApiKey };
          } else if (authToken && authSalt) {
            // Token provided - use it
            credentialsToSave = { username, token: authToken, salt: authSalt };
          } else {
            // Password provided - generate token
            const Crypto = await import('expo-crypto');
            const salt = Math.random().toString(36).substring(2, 15);
            const token = await Crypto.digestStringAsync(
              Crypto.CryptoDigestAlgorithm.MD5,
              authPassword + salt
            );
            credentialsToSave = { username, token, salt };
          }
          
          // Save credentials WITHOUT logging in (which would switch API client)
          const authStore = useAuthStore.getState();
          const credentials = {
            ...authStore.credentials,
            [serverId]: credentialsToSave,
          };
          
          const AsyncStorage = await import('@react-native-async-storage/async-storage');
          const { STORAGE_KEYS } = await import('../../config/constants');
          await AsyncStorage.default.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
          
          // Update auth store state (but don't set isAuthenticated - only for current server)
          useAuthStore.setState({ credentials });
          
          useToastStore.getState().showToast(`Server "${serverName}" added successfully!`);
          
          // Navigate to settings so they can switch manually
          await new Promise(resolve => setTimeout(resolve, 300));
          useNavigationStore.getState().navigate({ name: 'settings' });
        } else {
          // First/only server - safe to login and switch
          console.log('[DeepLink] First server - logging in and switching');
          
          if (authApiKey) {
            await useAuthStore.getState().loginWithApiKey(serverId, authApiKey);
          } else if (authToken && authSalt) {
            await useAuthStore.getState().loginWithToken(serverId, username, authToken, authSalt);
          } else if (authPassword) {
            await useAuthStore.getState().login(serverId, username, authPassword);
          }
          
          useServerStore.getState().setCurrentServer(serverId);
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          useToastStore.getState().showToast(`Connected to ${serverName}!`);
          useNavigationStore.getState().navigate({ name: 'home' });
        }
      } catch (error) {
        console.error('[DeepLink] Failed to login:', error);
        useToastStore.getState().showToast('Server added but login failed. Please check your credentials.', 'error');
        
        // Navigate to settings so user can see the new server and fix credentials
        if (hadOtherServers) {
          useNavigationStore.getState().navigate({ name: 'settings' });
        }
      }
    } else {
      // No credentials provided - server added but user needs to login
      useToastStore.getState().showToast(`Server "${serverName}" added. Please log in.`);
      
      // Navigate to settings so user can see the new server
      if (hadOtherServers) {
        useNavigationStore.getState().navigate({ name: 'settings' });
      }
    }
  }

  /**
   * Handle share deep link
   * Format: dino://share?id=...&server=...
   */
  async handleShare(params: Record<string, any>) {
    console.log('[DeepLink] Handling share with params:', params);

    const { id, server } = params;

    if (!id) {
      console.error('[DeepLink] Missing required parameter: id');
      useToastStore.getState().showToast('Invalid share link: missing ID', 'error');
      return;
    }

    const shareId = Array.isArray(id) ? id[0] : id;
    const serverUrl = Array.isArray(server) ? server[0] : server;

    // If server URL provided, try to switch to that server
    if (serverUrl) {
      const targetServer = useServerStore.getState().servers.find(
        s => s.url.toLowerCase().includes(serverUrl.toLowerCase())
      );

      if (targetServer) {
        useServerStore.getState().setCurrentServer(targetServer.id);
        useAuthStore.getState().switchServer(targetServer.id);
      } else {
        useToastStore.getState().showToast('Server not configured for this share', 'error');
        return;
      }
    }

    // Navigate to shares screen
    // TODO: Implement share detail viewing in SharesScreen
    useNavigationStore.getState().navigate({ name: 'shares' });
    
    useToastStore.getState().showToast(`Opening share: ${shareId}`);
  }

  /**
   * Generate add-server deep link
   */
  static generateAddServerLink(params: {
    url: string;
    name?: string;
    username?: string;
    token?: string;
    salt?: string;
    password?: string;
    apiKey?: string;
  }): string {
    const queryParams = new URLSearchParams();
    queryParams.set('url', params.url);
    
    if (params.name) queryParams.set('name', params.name);
    
    // Prefer API key, then token+salt, then password for security
    if (params.apiKey) {
      queryParams.set('apiKey', params.apiKey);
    } else if (params.token && params.salt) {
      if (params.username) queryParams.set('user', params.username);
      queryParams.set('token', params.token);
      queryParams.set('salt', params.salt);
    } else if (params.password) {
      if (params.username) queryParams.set('user', params.username);
      queryParams.set('password', params.password);
    }

    return `dino://add-server?${queryParams.toString()}`;
  }

  /**
   * Generate share deep link
   */
  static generateShareLink(shareId: string, serverUrl?: string): string {
    const queryParams = new URLSearchParams();
    queryParams.set('id', shareId);
    
    if (serverUrl) queryParams.set('server', serverUrl);

    return `dino://share?${queryParams.toString()}`;
  }
}

export const deepLinkService = new DeepLinkService();
