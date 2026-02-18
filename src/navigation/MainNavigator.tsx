/**
 * Dino Music App - Main Navigator
 * Main app navigation with bottom tabs
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, BackHandler } from 'react-native';
import { Home, Search, Music2, Download } from 'lucide-react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { SearchScreen } from '../screens/Home/SearchScreen';
import { LibraryScreen } from '../screens/Library/LibraryScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { SharesScreen } from '../screens/Settings/SharesScreen';
import { DownloadsScreen } from '../screens/Downloads/DownloadsScreen';
import AlbumDetailScreen from '../screens/Detail/AlbumDetailScreen';
import ArtistDetailScreen from '../screens/Detail/ArtistDetailScreen';
import PlaylistDetailScreen from '../screens/Detail/PlaylistDetailScreen';
import { MiniPlayer } from '../components/Player/MiniPlayer';
import { FullPlayer } from '../components/Player/FullPlayer';
import { ToastContainer } from '../components/common/ToastContainer';
import { OfflineBanner } from '../components/common';
import { usePlayerStore } from '../stores';
import { useNavigationStore } from '../stores/navigationStore';
import { trackPlayerService } from '../services/player/TrackPlayerService';
import { theme } from '../config';

const queryClient = new QueryClient();

interface MainNavigatorProps {
  onLogout: () => void;
}

const SettingsScreenComponent = ({ onLogout }: { onLogout: () => void }) => (
  <View style={styles.screen}>
    <Text style={styles.screenText}>Settings Screen</Text>
    <Text style={styles.subtitleText}>Coming soon...</Text>
    <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
      <Text style={styles.logoutButtonText}>Logout</Text>
    </TouchableOpacity>
  </View>
);

export const MainNavigator: React.FC<MainNavigatorProps> = ({ onLogout }) => {
  const { currentTrack } = usePlayerStore();
  const { currentScreen, navigate, goBack, canGoBack, showFullPlayer, setShowFullPlayer, isPlayerOverlayOpen, closePlayerOverlay } = useNavigationStore();
  
  const activeTab = currentScreen.name === 'album-detail' || 
    currentScreen.name === 'artist-detail' || 
    currentScreen.name === 'playlist-detail' ||
    currentScreen.name === 'shares'
    ? 'library'  // Keep library tab active for detail screens and shares
    : currentScreen.name;

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // If queue or lyrics overlay is open, let them handle it (return false)
      if (useNavigationStore.getState().isPlayerOverlayOpen()) {
        return false;
      }
      
      if (showFullPlayer) {
        setShowFullPlayer(false);
        return true;
      }
      
      if (canGoBack()) {
        goBack();
        return true;
      }
      
      // On home screen, allow default behavior (exit app)
      return false;
    });

    return () => backHandler.remove();
  }, [showFullPlayer, canGoBack, goBack]);

  // Initialize TrackPlayer on mount
  useEffect(() => {
    trackPlayerService.initialize().catch((error) => {
      console.error('Failed to initialize TrackPlayer:', error);
    });

    return () => {
      // Cleanup on unmount
      trackPlayerService.destroy();
    };
  }, []);

  const renderScreen = () => {
    switch (currentScreen.name) {
      case 'home':
        return <HomeScreen onLogout={onLogout} />;
      case 'search':
        return (
          <QueryClientProvider client={queryClient}>
            <SearchScreen />
          </QueryClientProvider>
        );
      case 'library':
        return <LibraryScreen onLogout={onLogout} />;
      case 'downloads':
        return <DownloadsScreen />;
      case 'settings':
        return <SettingsScreen onLogout={onLogout} />;
      case 'shares':
        return <SharesScreen />;
      case 'album-detail':
        return <AlbumDetailScreen albumId={currentScreen.params.albumId} />;
      case 'artist-detail':
        return <ArtistDetailScreen artistId={currentScreen.params.artistId} />;
      case 'playlist-detail':
        return <PlaylistDetailScreen playlistId={currentScreen.params.playlistId} />;
      default:
        return <HomeScreen onLogout={onLogout} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      <OfflineBanner />
      
      {/* Screen Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Mini Player - ABOVE tab bar */}
      {currentTrack && (
        <MiniPlayer onPress={() => setShowFullPlayer(true)} />
      )}

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigate({ name: 'home' })}
        >
          <Home 
            size={22} 
            color={activeTab === 'home' ? theme.colors.accent : theme.colors.text.secondary}
            strokeWidth={2}
          />
          <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigate({ name: 'search' })}
        >
          <Search 
            size={22} 
            color={activeTab === 'search' ? theme.colors.accent : theme.colors.text.secondary}
            strokeWidth={2}
          />
          <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
            Search
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigate({ name: 'library' })}
        >
          <Music2 
            size={22} 
            color={activeTab === 'library' ? theme.colors.accent : theme.colors.text.secondary}
            strokeWidth={2}
          />
          <Text style={[styles.tabText, activeTab === 'library' && styles.tabTextActive]}>
            Library
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigate({ name: 'downloads' })}
        >
          <Download 
            size={22} 
            color={activeTab === 'downloads' ? theme.colors.accent : theme.colors.text.secondary}
            strokeWidth={2}
          />
          <Text style={[styles.tabText, activeTab === 'downloads' && styles.tabTextActive]}>
            Downloads
          </Text>
        </TouchableOpacity>
      </View>

      {/* Full Player Modal - Renders on top of everything */}
      <Modal
        visible={showFullPlayer}
        animationType="none"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          if (isPlayerOverlayOpen()) {
            closePlayerOverlay();
          } else {
            setShowFullPlayer(false);
          }
        }}
        transparent={true}
      >
        <FullPlayer onClose={() => setShowFullPlayer(false)} />
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  content: {
    flex: 1,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  screenText: {
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  subtitleText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.secondary,
  },
  placeholderText: {
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  placeholderSubtext: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  logoutButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: 20, // Extra padding for Android nav bar
    paddingTop: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 0,
    gap: 2,
  },
  tabText: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.medium,
  },
  tabTextActive: {
    color: theme.colors.accent,
  },
});
