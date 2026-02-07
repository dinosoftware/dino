/**
 * Dino Music App - Most Played Albums Component
 * Displays most frequently played albums
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { getAlbumList2 } from '../../../api/opensubsonic/albums';
import { useCoverArt } from '../../../hooks/api/useAlbums';
import { useNavigationStore } from '../../../stores/navigationStore';
import { useServerStore } from '../../../stores/serverStore';
import { useAlbumMenuState } from '../../../hooks/useAlbumMenuState';
import { AlbumMenuWrapper } from '../../../components/Menus';
import { theme } from '../../../config';
import { Album } from '../../../api/opensubsonic/types';
import { HorizontalAlbumListSkeleton } from '../../../components/common';

export const MostPlayedAlbums: React.FC = () => {
  const { currentServerId } = useServerStore();
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['most-played-albums', currentServerId],
    queryFn: async () => getAlbumList2('frequent', 20),
    staleTime: 5 * 60 * 1000,
    enabled: !!currentServerId,
  });

  const albums = response?.albumList2?.album || [];

  if (isLoading) {
    return <HorizontalAlbumListSkeleton />;
  }

  if (albums.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Most Played</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            refetch();
          }}
        >
          <RefreshCw size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlbumCard album={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

interface AlbumCardProps {
  album: Album;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album }) => {
  const { data: coverArtUrl } = useCoverArt(album.coverArt, 300);
  const { navigate } = useNavigationStore();
  const albumMenuState = useAlbumMenuState();

  const handlePress = () => {
    navigate({ name: 'album-detail', params: { albumId: album.id } });
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    albumMenuState.openAlbumMenu(album);
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.card} 
        onPress={handlePress}
        onLongPress={handleLongPress}
      >
        <Image
          source={
            coverArtUrl
              ? { uri: coverArtUrl }
              : require('../../../../assets/images/icon.png')
          }
          style={styles.artwork}
          resizeMode="cover"
        />
        <Text style={styles.albumName} numberOfLines={1}>
          {album.name}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {album.artist}
        </Text>
      </TouchableOpacity>
      <AlbumMenuWrapper
        visible={albumMenuState.showAlbumMenu}
        onClose={albumMenuState.closeAlbumMenu}
        album={albumMenuState.selectedAlbum}
        showAlbumInfo={albumMenuState.showAlbumInfo}
        setShowAlbumInfo={albumMenuState.setShowAlbumInfo}
        showAddToPlaylist={albumMenuState.showAddToPlaylist}
        setShowAddToPlaylist={albumMenuState.setShowAddToPlaylist}
      />
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    width: 150,
    marginRight: theme.spacing.md,
  },
  artwork: {
    width: 150,
    height: 150,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background.card,
  },
  albumName: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  artistName: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
});
