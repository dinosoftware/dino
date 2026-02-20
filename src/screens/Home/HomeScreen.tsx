/**
 * Dino Music App - Home Screen
 * shadcn/ui-inspired home with clean layout and modern spacing
 */

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HeroBanner } from './components/HeroBanner';
import { RecentlyPlayed } from './components/RecentlyPlayed';
import { RandomAlbums } from './components/RandomAlbums';
import { MostPlayedAlbums } from './components/MostPlayedAlbums';
import { RecommendedAlbums } from './components/RecommendedAlbums';
import { UserSettingsMenu, AppInfoSheet } from '../../components/Menus';
import { Avatar } from '../../components/common';
import { useAuthStore, useServerStore, useUserStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';

const queryClient = new QueryClient();

interface HomeScreenProps {
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const theme = useTheme();
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

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xxl + theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.fontSize.huge,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text.primary,
      letterSpacing: theme.typography.letterSpacing.tight,
    },
    profileButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.background.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }), [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Home</Text>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => setShowUserMenu(true)}
            >
              <Avatar username={username} size={40} />
            </TouchableOpacity>
          </View>

          {/* Hero Banner */}
          <HeroBanner />

          {/* Recently Played Section */}
          <RecentlyPlayed />

          {/* Random Albums Section */}
          <RandomAlbums />

          {/* Most Played Albums Section */}
          <MostPlayedAlbums />

          {/* Recommended Albums Section */}
          <RecommendedAlbums />
        </ScrollView>

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
