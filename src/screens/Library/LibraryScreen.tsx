/**
 * Dino Music App - Library Screen
 * Library tabs container (Albums, Artists, Playlists)
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlbumsTab } from './AlbumsTab';
import { ArtistsTab } from './ArtistsTab';
import { PlaylistsTab } from './PlaylistsTab';
import { FavoritesTab } from './FavoritesTab';
import { UserSettingsMenu, AppInfoSheet } from '../../components/Menus';
import { Avatar } from '../../components/common';
import { useAuthStore, useServerStore, useUserStore } from '../../stores';
import { theme } from '../../config';

const queryClient = new QueryClient();

type Tab = 'albums' | 'artists' | 'playlists' | 'favorites';

interface LibraryScreenProps {
  onLogout: () => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('albums');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAppInfo, setShowAppInfo] = useState(false);
  
  // Get credentials and current server separately to avoid re-renders
  const credentials = useAuthStore((state) => state.credentials);
  const currentServerId = useServerStore((state) => state.currentServerId);
  const user = useUserStore((state) => state.user);
  
  // Calculate username with useMemo - prefer userStore (works for API key), fallback to credentials
  const username = useMemo(() => {
    if (!currentServerId) return 'User';
    // Try userStore first (works for both password and API key auth)
    if (user?.username) return user.username;
    // Fallback to credentials (password auth)
    const creds = credentials[currentServerId];
    return creds?.username || 'User';
  }, [credentials, currentServerId, user]);

  const renderTab = () => {
    switch (activeTab) {
      case 'albums':
        return <AlbumsTab />;
      case 'artists':
        return <ArtistsTab />;
      case 'playlists':
        return <PlaylistsTab />;
      case 'favorites':
        return <FavoritesTab />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Library</Text>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => setShowUserMenu(true)}
          >
            <Avatar username={username} size={40} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'albums' && styles.tabActive]}
            onPress={() => setActiveTab('albums')}
          >
            <Text
              style={[styles.tabText, activeTab === 'albums' && styles.tabTextActive]}
            >
              Albums
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'artists' && styles.tabActive]}
            onPress={() => setActiveTab('artists')}
          >
            <Text
              style={[styles.tabText, activeTab === 'artists' && styles.tabTextActive]}
            >
              Artists
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'playlists' && styles.tabActive]}
            onPress={() => setActiveTab('playlists')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'playlists' && styles.tabTextActive,
              ]}
            >
              Playlists
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
            onPress={() => setActiveTab('favorites')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'favorites' && styles.tabTextActive,
              ]}
            >
              Favorites
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.content}>{renderTab()}</View>

        {/* User Settings Menu */}
        <UserSettingsMenu
          visible={showUserMenu}
          onClose={() => setShowUserMenu(false)}
          onLogout={onLogout}
          onOpenAppInfo={() => setShowAppInfo(true)}
        />

        {/* App Info Sheet */}
        <AppInfoSheet
          visible={showAppInfo}
          onClose={() => setShowAppInfo(false)}
        />
      </View>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  title: {
    fontSize: theme.typography.fontSize.huge,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
  },
  tab: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.lg,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
  },
  tabText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  tabTextActive: {
    color: theme.colors.accent,
  },
  content: {
    flex: 1,
  },
});
