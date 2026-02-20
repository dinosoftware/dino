/**
 * Dino Music App - App Navigator
 * Root navigator with auth check
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useServerStore, useAuthStore, useSettingsStore, useQueueStore } from '../stores';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useDownloadStore } from '../stores/downloadStore';
import { trackPlayerService } from '../services/player/TrackPlayerService';
import { queueSyncManager } from '../services/player/QueueSyncManager';
import { getOpenSubsonicExtensions, supportsFormPost, supportsApiKeyAuth, supportsSongLyrics } from '../api/opensubsonic/extensions';
import { apiClient } from '../api/client';
import { useTheme } from '../hooks/useTheme';

export const AppNavigator: React.FC = () => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Create QueryClient instance (will be recreated when server changes)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }));
  
  // Subscribe to auth and server changes
  const authIsAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentServerId = useServerStore((state) => state.currentServerId);
  
  // Track previous server ID to detect changes
  const [previousServerId, setPreviousServerId] = useState<string | null>(null);
  
  // Update local state and invalidate cache when auth/server changes
  useEffect(() => {
    if (!isLoading) {
      const hasServer = currentServerId !== null;
      const wasAuthenticated = isAuthenticated;
      const nowAuthenticated = authIsAuthenticated && hasServer;
      
      setIsAuthenticated(nowAuthenticated);
      
      // If server changed while authenticated, clear queue and invalidate all queries
      if (nowAuthenticated && wasAuthenticated && previousServerId !== null && previousServerId !== currentServerId) {
        console.log('[AppNavigator] Server changed - clearing local queue and loading new server queue');
        
        // Clear local queue WITHOUT clearing server queue (we're switching servers)
        useQueueStore.getState().clearQueue(false).then(() => {
          // Load queue from new server after clearing
          console.log('[AppNavigator] Loading queue from new server...');
          queueSyncManager.loadFromServer().then((loaded) => {
            if (loaded) {
              console.log('[AppNavigator] Loaded queue from new server');
              // Queue is now available, user can press play when ready
            } else {
              console.log('[AppNavigator] No queue on new server');
            }
          }).catch((error) => {
            console.error('[AppNavigator] Failed to load queue from new server:', error);
          });
        });
        
        // Invalidate all cached data
        queryClient.invalidateQueries();
      }
      
      // Update previous server ID
      if (currentServerId !== previousServerId) {
        setPreviousServerId(currentServerId);
      }
    }
  }, [authIsAuthenticated, currentServerId, isLoading, isAuthenticated, previousServerId]);

  useEffect(() => {
    // Load data from storage on app launch
    const initializeApp = async () => {
      try {
        // Load serverStore FIRST - authStore depends on currentServerId
        console.log('[AppNavigator] Loading server store...');
        await useServerStore.getState().loadFromStorage();
        
        // Now load auth (depends on serverStore) and other stores in parallel
        console.log('[AppNavigator] Loading auth and other stores...');
        await Promise.all([
          useAuthStore.getState().loadFromStorage(),
          useSettingsStore.getState().loadFromStorage(),
          useDownloadStore.getState().loadFromStorage(),
        ]);
        console.log('[AppNavigator] Stores loaded');
        
        // Initialize TrackPlayer (which will also initialize QueueManager)
        console.log('[AppNavigator] Initializing TrackPlayer...');
        await trackPlayerService.initialize();
        console.log('[AppNavigator] TrackPlayer initialized');

        // Get fresh state directly from stores
        const serverState = useServerStore.getState();
        const authState = useAuthStore.getState();

        console.log('[AppNavigator] Reading final state...');
        console.log('[AppNavigator] Server state:', {
          hasCompletedSetup: serverState.hasCompletedSetup,
          currentServerId: serverState.currentServerId,
          serversCount: serverState.servers.length,
        });
        console.log('[AppNavigator] Auth state:', {
          isAuthenticated: authState.isAuthenticated,
          credentialsKeys: Object.keys(authState.credentials),
        });

        const hasSetup = serverState.hasCompletedSetup;
        const hasAuth = authState.isAuthenticated;
        const hasServer = serverState.currentServerId !== null;

        console.log('[AppNavigator] Init complete:', { hasSetup, hasAuth, hasServer });

        const isAuth = hasSetup && hasAuth && hasServer;
        setIsAuthenticated(isAuth);
        
        // Mark loading as complete - show app immediately
        setIsLoading(false);
        
        // Set API client capabilities AFTER loading completes
        if (isAuth && serverState.currentServerId) {
          const currentServer = serverState.getCurrentServer();
          if (currentServer?.capabilities) {
            console.log('[AppNavigator] ⚙️  Setting API client capabilities on startup:', currentServer.capabilities);
            apiClient.setServerCapabilities({
              supportsFormPost: currentServer.capabilities.supportsFormPost,
            });
          } else {
            console.log('[AppNavigator] ⚠️  No capabilities found for current server!');
          }
        }
        
        // Load starred items and check server capabilities in background if authenticated (non-blocking)
        if (isAuth) {
          console.log('[AppNavigator] Loading starred items in background...');
          // Don't await - let it load in background
          Promise.race([
            useFavoritesStore.getState().loadStarred(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]).then(() => {
            console.log('[AppNavigator] Starred items loaded');
          }).catch((error) => {
            console.log('[AppNavigator] Skipping starred items (server may be unreachable):', error);
          });

          // Check and fetch server capabilities if missing, stale (>24h), or empty
          const currentServer = serverState.getCurrentServer();
          const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          const isStale = currentServer?.capabilities && 
                         (Date.now() - currentServer.capabilities.lastChecked) > ONE_DAY;
          const isEmpty = currentServer?.capabilities && 
                         (!currentServer.capabilities.extensions || currentServer.capabilities.extensions.length === 0);
          const needsRefresh = !currentServer?.capabilities || isStale || isEmpty;

          if (currentServer && needsRefresh) {
            if (!currentServer.capabilities) {
              console.log('[AppNavigator] 🔍 Server capabilities missing, fetching in background...');
            } else if (isEmpty) {
              console.log('[AppNavigator] 🔍 Server capabilities empty (bug?), forcing refresh...');
            } else {
              console.log('[AppNavigator] 🔍 Server capabilities stale, refreshing in background...');
            }
            
            (async () => {
              try {
                console.log('[AppNavigator] 🔍 Calling getOpenSubsonicExtensions()...');
                const extensions = await getOpenSubsonicExtensions();
                console.log('[AppNavigator] ✅ Received extensions:', extensions);
                console.log('[AppNavigator] 🔍 Extensions count:', extensions?.length || 0);
                
                const capabilities = {
                  extensions,
                  supportsFormPost: supportsFormPost(extensions),
                  supportsApiKeyAuth: supportsApiKeyAuth(extensions),
                  supportsSongLyrics: supportsSongLyrics(extensions),
                  lastChecked: Date.now(),
                };
                
                console.log('[AppNavigator] 🔍 Updating server capabilities:', capabilities);
                useServerStore.getState().updateServerCapabilities(currentServer.id, capabilities);
                console.log('[AppNavigator] ✅ Server capabilities updated successfully');
              } catch (error) {
                console.error('[AppNavigator] ❌ Failed to fetch server capabilities:', error);
              }
            })();
          } else if (currentServer?.capabilities) {
            console.log('[AppNavigator] ✅ Server capabilities already cached and fresh:', currentServer.capabilities);
          }
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsAuthenticated(false);
        setIsLoading(false); // Always stop loading even on error
      }
    };

    initializeApp();
  }, []);

  const handleAuthComplete = () => {
    useServerStore.getState().completeFirstTimeSetup();
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    // Logout WITHOUT deleting credentials (so user can quickly log back in)
    useAuthStore.getState().logout(false);
    
    // Set authenticated to false to show auth screens
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.primary }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {!isAuthenticated ? (
        <AuthNavigator onAuthComplete={handleAuthComplete} />
      ) : (
        <MainNavigator 
          key={currentServerId || 'no-server'} 
          onLogout={handleLogout} 
        />
      )}
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
