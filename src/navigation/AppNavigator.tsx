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
import { theme } from '../config';

export const AppNavigator: React.FC = () => {
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
  
  // Update local state and invalidate cache when auth/server changes
  useEffect(() => {
    if (!isLoading) {
      const hasServer = currentServerId !== null;
      const wasAuthenticated = isAuthenticated;
      const nowAuthenticated = authIsAuthenticated && hasServer;
      
      setIsAuthenticated(nowAuthenticated);
      
      // If server changed while authenticated, invalidate all queries
      if (nowAuthenticated && wasAuthenticated) {
        console.log('[AppNavigator] Server changed - invalidating queries');
        queryClient.invalidateQueries();
      }
    }
  }, [authIsAuthenticated, currentServerId, isLoading]);

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
        
        // Load starred items if authenticated
        if (isAuth) {
          console.log('[AppNavigator] Loading starred items...');
          try {
            await useFavoritesStore.getState().loadStarred();
            console.log('[AppNavigator] Starred items loaded');
          } catch (error) {
            console.error('[AppNavigator] Failed to load starred items:', error);
          }
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
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
      <View style={styles.loadingContainer}>
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
    backgroundColor: theme.colors.background.primary,
  },
});
