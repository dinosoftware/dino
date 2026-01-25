/**
 * Dino Music App - Artist Detail Screen
 * Artist profile with albums
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { User, Play, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useArtist } from '../../hooks/api/useArtists';
import { useCoverArt } from '../../hooks/api/useAlbums';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { useNavigationStore } from '../../stores/navigationStore';
import { theme } from '../../config/theme';
import { AlbumCard } from '../../components/Cards/AlbumCard';
import { AlbumMenuWrapper } from '../../components/Menus';
import { useAlbumMenuState } from '../../hooks/useAlbumMenuState';
import { ArtistDetailSkeleton } from '../../components/Skeletons';
import { ErrorView } from '../../components/common/ErrorView';
import { Album } from '../../api/opensubsonic/types';

interface ArtistDetailScreenProps {
  artistId: string;
}

export default function ArtistDetailScreen({ artistId }: ArtistDetailScreenProps) {
  const { data: artist, isLoading, error, refetch } = useArtist(artistId);
  const { data: coverArtUrl } = useCoverArt(artist?.coverArt, 500);
  const artistColors = useAlbumColors(coverArtUrl || undefined);
  const { navigate, goBack } = useNavigationStore();

  if (isLoading) {
    return <ArtistDetailSkeleton />;
  }

  if (error || !artist) {
    return (
      <ErrorView
        error={error?.message || 'Failed to load artist'}
        onRetry={refetch}
      />
    );
  }

  const albums = artist.album || [];

  return (
    <View style={styles.container}>
      {/* Blurred background - top half only */}
      {coverArtUrl && (
        <View style={styles.blurredTopContainer}>
          <Image
            source={{ uri: coverArtUrl }}
            style={styles.blurredTopImage}
            blurRadius={60}
          />
          <LinearGradient
            colors={['rgba(9, 9, 11, 0.4)', 'rgba(9, 9, 11, 0.8)', theme.colors.background.primary]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => goBack()}
        activeOpacity={0.7}
      >
        <ChevronLeft size={28} color={theme.colors.text.primary} strokeWidth={2.5} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Artist Header */}
        <LinearGradient
          colors={[artistColors.primary + '60', artistColors.background + '40', 'transparent']}
          locations={[0, 0.5, 1]}
          style={styles.header}
        >
          <View style={styles.avatarContainer}>
            {coverArtUrl ? (
              <Image source={{ uri: coverArtUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <User size={80} color={theme.colors.text.tertiary} />
              </View>
            )}
          </View>
          
          <Text style={styles.name} numberOfLines={2}>
            {artist.name}
          </Text>
          
          {artist.albumCount !== undefined && (
            <Text style={styles.albumCount}>
              {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
            </Text>
          )}
        </LinearGradient>

        {/* Albums Section */}
        <View style={styles.albumsSection}>
          <Text style={styles.sectionTitle}>Albums</Text>
          
          {albums.length > 0 ? (
            <FlatList
              data={albums}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ArtistAlbumItem album={item} />}
              contentContainerStyle={styles.albumsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No albums available</Text>
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// Helper component for album items with menu
const ArtistAlbumItem: React.FC<{ album: Album }> = ({ album }) => {
  const { navigate } = useNavigationStore();
  const albumMenuState = useAlbumMenuState();
  const { data: coverArtUrl } = useCoverArt(album.coverArt, 300);

  return (
    <>
      <View style={styles.albumContainer}>
        <AlbumCard
          album={album}
          coverArtUrl={coverArtUrl || undefined}
          onPress={() => {
            navigate({ name: 'album-detail', params: { albumId: album.id } });
          }}
          onLongPress={() => albumMenuState.openAlbumMenu(album)}
        />
      </View>
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
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  blurredTopContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
    overflow: 'hidden',
  },
  blurredTopImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: theme.spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    paddingTop: 60,
    gap: theme.spacing.sm,
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: theme.typography.fontSize.xxxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  albumCount: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  albumsSection: {
    paddingTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.semibold,
    color: theme.colors.text.primary,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  albumsList: {
    paddingHorizontal: theme.spacing.md,
  },
  albumContainer: {
    flex: 1,
    margin: theme.spacing.sm,
    maxWidth: '50%',
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
});
