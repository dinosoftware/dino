/**
 * Dino Music App - Home Screen
 * shadcn/ui-inspired home with clean layout and modern spacing
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { HeroBanner } from './components/HeroBanner';
import { RecentlyPlayed } from './components/RecentlyPlayed';
import { RandomAlbums } from './components/RandomAlbums';
import { MostPlayedAlbums } from './components/MostPlayedAlbums';
import { RecommendedAlbums } from './components/RecommendedAlbums';
import { UserSettingsMenu } from '../../components/Menus';
import { Avatar } from '../../components/common';
import { useAuthStore, useServerStore, useUserStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';

const queryClient = new QueryClient();

interface HomeScreenProps {
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
    return (
        <QueryClientProvider client={queryClient}>
            <HomeScreenContent onLogout={onLogout} />
        </QueryClientProvider>
    );
};

const HomeScreenContent: React.FC<HomeScreenProps> = ({ onLogout }) => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const credentials = useAuthStore((state) => state.credentials);
    const currentServerId = useServerStore((state) => state.currentServerId);
    const user = useUserStore((state) => state.user);

    const username = useMemo(() => {
        if (!currentServerId) return 'User';
        if (user?.username) return user.username;
        const creds = credentials[currentServerId];
        return creds?.username || 'User';
    }, [credentials, currentServerId, user]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        queryClient.invalidateQueries().then(() => {
            setTimeout(() => setRefreshing(false), 500);
        });
    }, [queryClient]);

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
        branding: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
        },
        logo: {
            width: 36,
            height: 36,
        },
        brandText: {
            fontSize: theme.typography.fontSize.xl,
            fontFamily: theme.typography.fontFamily.bold,
            color: theme.colors.text.primary,
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
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.colors.text.primary}
                        colors={['#999999']}
                        progressViewOffset={80}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.branding}>
                        <Image
                            source={require('../../../assets/images/icon-circle.png')}
                            style={styles.logo}
                        />
                        <Text style={styles.brandText}>Dino</Text>
                    </View>
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
            />
        </View>
    );
};
