/**
 * Dino Music App - Artist Detail Screen
 * Artist profile with albums, top songs, and similar artists
 */

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, ExternalLink, MoreVertical, Play, Shuffle } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAlbum } from '../../api/opensubsonic/albums';
import { Album, Track } from '../../api/opensubsonic/types';
import { AlbumCard } from '../../components/Cards/AlbumCard';
import { ArtistCard } from '../../components/Cards/ArtistCard';
import { TrackRow } from '../../components/Cards/TrackRow';
import { AlbumMenuWrapper } from '../../components/Menus';
import { ArtistMenu } from '../../components/Menus/ArtistMenu';
import { AddToPlaylistModal } from '../../components/Modals/AddToPlaylistModal';
import { ArtistSelectionModal } from '../../components/Modals/ArtistSelectionModal';
import { ArtistSongsModal } from '../../components/Modals/ArtistSongsModal';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { SongInfoModal } from '../../components/Modals/SongInfoModal';
import { TrackMenu } from '../../components/Player/TrackMenu';
import { ArtistDetailSkeleton } from '../../components/Skeletons';
import { ErrorView, ArtistArtImage } from '../../components/common';
import { useTheme, useBackgroundStyle } from '../../hooks/useTheme';
import { useCoverArt } from '../../hooks/api/useAlbums';
import { useArtistInfo } from '../../hooks/api/useArtistInfo';
import { useArtist } from '../../hooks/api/useArtists';
import { useTopSongs } from '../../hooks/api/useTopSongs';
import { useAlbumColors } from '../../hooks/useAlbumColors';
import { useAlbumMenuState } from '../../hooks/useAlbumMenuState';
import { useTrackMenuState } from '../../hooks/useTrackMenuState';
import { trackPlayerService } from '../../services/player/TrackPlayerService';
import { useNavigationStore } from '../../stores/navigationStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useQueueStore } from '../../stores/queueStore';

interface ArtistDetailScreenProps {
  artistId: string;
}

const cleanBiography = (bio: string): string => {
  if (!bio) return '';

  let cleaned = bio.replace(/<a\s+href="[^"]*">Read more on Last\.fm<\/a>\.?/gi, '');
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');

  return cleaned.trim();
};

export default function ArtistDetailScreen({ artistId }: ArtistDetailScreenProps) {
  const theme = useTheme();
  const backgroundStyle = useBackgroundStyle();
  const { data: artist, isLoading, error, refetch } = useArtist(artistId);
  const { data: coverArtUrl } = useCoverArt(artist?.coverArt, 500);
  const artistColors = useAlbumColors(coverArtUrl || undefined);
  const { navigate, goBack } = useNavigationStore();
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const { setQueue } = useQueueStore();

  const { data: topSongs } = useTopSongs(artist?.name);
  const { data: artistInfo } = useArtistInfo(artistId);

  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [showArtistMenu, setShowArtistMenu] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [showSongsModal, setShowSongsModal] = useState(false);
  const [allAlbumSongs, setAllAlbumSongs] = useState<Track[]>([]);
  const [isLoadingAllSongs, setIsLoadingAllSongs] = useState(false);

  const trackMenuState = useTrackMenuState();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    headerSection: {
      position: 'relative',
      overflow: 'hidden',
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
    avatar: {
      width: 160,
      height: 160,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
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
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    playButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
      height: 44,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
    },
    playButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.semibold,
    },
    shuffleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      height: 44,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
    },
    shuffleButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text.primary,
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
    },
    topSongsSection: {
      paddingTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    seeAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.accent + '20',
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      borderColor: theme.colors.accent + '40',
    },
    seeAllText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.accent,
    },
    topSongsList: {
      paddingHorizontal: theme.spacing.sm,
    },
    noTopSongsHint: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    noTopSongsText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.muted,
    },
    albumsSection: {
      paddingTop: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text.primary,
    },
    sectionTitleWithPadding: {
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
    similarArtistsSection: {
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    similarArtistsContent: {
      paddingHorizontal: theme.spacing.lg,
    },
    similarArtistCard: {
      marginRight: theme.spacing.md,
    },
    biographySection: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    biographyTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    biographyText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.secondary,
      lineHeight: 22,
    },
    readMoreText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.accent,
      marginTop: theme.spacing.xs,
    },
    lastFmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.accent + '20',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.accent + '40',
      alignSelf: 'flex-start',
      marginTop: theme.spacing.sm,
    },
    lastFmButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.accent,
    },
  }), [theme]);

  const getAllArtistTracks = async (): Promise<Track[]> => {
    if (!artist?.album || artist.album.length === 0) return [];

    const allTracks: Track[] = [];
    for (const album of artist.album) {
      try {
        const albumResponse = await getAlbum(album.id);
        if (albumResponse.album.song) {
          allTracks.push(...albumResponse.album.song);
        }
      } catch (err) {
        console.error(`Failed to fetch album ${album.id}:`, err);
      }
    }
    return allTracks;
  };

  const handlePlayAll = async () => {
    if (topSongs && topSongs.length > 0) {
      setQueue(topSongs, 0);
      setCurrentTrack(topSongs[0]);
      await trackPlayerService.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    setIsLoadingTracks(true);
    try {
      const tracks = await getAllArtistTracks();
      if (tracks.length === 0) return;

      setQueue(tracks, 0);
      setCurrentTrack(tracks[0]);
      await trackPlayerService.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Failed to play all:', err);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const handleShuffle = async () => {
    let tracks: Track[] = [];

    if (topSongs && topSongs.length > 0) {
      tracks = [...topSongs];
    } else {
      setIsLoadingTracks(true);
      try {
        tracks = await getAllArtistTracks();
      } catch (err) {
        console.error('Failed to get tracks:', err);
        setIsLoadingTracks(false);
        return;
      }
      setIsLoadingTracks(false);
    }

    if (tracks.length === 0) return;

    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setQueue(shuffled, 0);
    setCurrentTrack(shuffled[0]);
    await trackPlayerService.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleTrackPress = async (track: Track, index: number) => {
    if (!topSongs) return;

    setQueue(topSongs, index);
    setCurrentTrack(track);
    await trackPlayerService.play();
  };

  const handleOpenSongsModal = async () => {
    setShowSongsModal(true);

    const hasTopSongsAvailable = topSongs && topSongs.length > 0;
    if (!hasTopSongsAvailable && allAlbumSongs.length === 0 && !isLoadingAllSongs) {
      setIsLoadingAllSongs(true);
      try {
        const tracks = await getAllArtistTracks();
        setAllAlbumSongs(tracks);
      } catch (err) {
        console.error('Failed to load all songs:', err);
      } finally {
        setIsLoadingAllSongs(false);
      }
    }
  };

  const getModalSongs = (): Track[] => {
    if (topSongs && topSongs.length > 0) return topSongs;
    return allAlbumSongs;
  };

  const handleModalTrackPress = async (track: Track, index: number) => {
    const songs = getModalSongs();
    if (songs.length === 0) return;

    setQueue(songs, index);
    setCurrentTrack(track);
    await trackPlayerService.play();
  };

  const handleModalPlayAll = async () => {
    const songs = getModalSongs();
    if (songs.length === 0) return;

    setQueue(songs, 0);
    setCurrentTrack(songs[0]);
    await trackPlayerService.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleModalShuffle = async () => {
    const songs = getModalSongs();
    if (songs.length === 0) return;

    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setQueue(shuffled, 0);
    setCurrentTrack(shuffled[0]);
    await trackPlayerService.play();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderHeaderBackground = () => {
    if (backgroundStyle === 'solid') {
      return null;
    }

    if (backgroundStyle === 'gradient' && coverArtUrl) {
      const isDark = theme.mode !== 'light';
      return (
        <LinearGradient
          colors={
            isDark
              ? [artistColors.primary + '50', artistColors.secondary + '70', theme.colors.background.primary]
              : [artistColors.primary + '30', artistColors.secondary + '40', theme.colors.background.primary]
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      );
    }

    if (backgroundStyle === 'blur' && coverArtUrl) {
      const isDark = theme.mode !== 'light';
      return (
        <>
          <Image
            source={{ uri: coverArtUrl }}
            style={StyleSheet.absoluteFill}
            blurRadius={60}
            resizeMode="cover"
          />
          <LinearGradient
            colors={
              isDark
                ? ['transparent', 'rgba(0, 0, 0, 0.6)', theme.colors.background.primary]
                : ['transparent', 'rgba(255, 255, 255, 0.6)', theme.colors.background.primary]
            }
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      );
    }

    return null;
  };

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
  const hasTopSongs = topSongs && topSongs.length > 0;
  const hasSimilarArtists = artistInfo?.similarArtist && artistInfo.similarArtist.length > 0;

  const cleanedBiography = artistInfo?.biography ? cleanBiography(artistInfo.biography) : '';

  console.log('Artist Detail - Top Songs:', topSongs?.length || 0);
  console.log('Artist Detail - All Album Songs:', allAlbumSongs.length);
  console.log('Artist Detail - Modal Songs:', getModalSongs().length);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => goBack()}
        activeOpacity={0.7}
      >
        <ChevronLeft size={28} color={theme.colors.text.primary} strokeWidth={2.5} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          {renderHeaderBackground()}
          <View style={styles.header}>
            <ArtistArtImage
              uri={coverArtUrl}
              style={styles.avatar}
            />

            <Text style={styles.name} numberOfLines={2}>
              {artist.name}
            </Text>

            {artist.albumCount !== undefined && (
              <Text style={styles.albumCount}>
                {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: artistColors.primary }]}
              onPress={handlePlayAll}
              activeOpacity={0.8}
              disabled={isLoadingTracks || (albums.length === 0 && !hasTopSongs)}
            >
              {isLoadingTracks ? (
                <ActivityIndicator size="small" color={artistColors.textColor} />
              ) : (
                <>
                  <Play size={24} color={artistColors.textColor} fill={artistColors.textColor} />
                  <Text style={[styles.playButtonText, { color: artistColors.textColor }]}>Play</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shuffleButton}
              onPress={handleShuffle}
              activeOpacity={0.8}
              disabled={isLoadingTracks || (albums.length === 0 && !hasTopSongs)}
            >
              <Shuffle size={20} color={theme.colors.text.primary} />
              <Text style={styles.shuffleButtonText}>Shuffle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowArtistMenu(true);
              }}
            >
              <MoreVertical size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {cleanedBiography && (
          <View style={styles.biographySection}>
            <Text style={styles.biographyTitle}>About</Text>
            <Text
              style={styles.biographyText}
              numberOfLines={bioExpanded ? undefined : 4}
            >
              {cleanedBiography}
            </Text>
            {cleanedBiography.length > 200 && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBioExpanded(!bioExpanded);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.readMoreText}>
                  {bioExpanded ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
            {artistInfo?.lastFmUrl && (
              <TouchableOpacity
                style={styles.lastFmButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL(artistInfo.lastFmUrl!);
                }}
                activeOpacity={0.7}
              >
                <ExternalLink size={16} color={theme.colors.accent} />
                <Text style={styles.lastFmButtonText}>View on Last.fm</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {(hasTopSongs || albums.length > 0) && (
          <View style={styles.topSongsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {hasTopSongs ? 'Top Songs' : 'Songs'}
              </Text>
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={handleOpenSongsModal}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight size={16} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>
            {hasTopSongs ? (
              <View style={styles.topSongsList}>
                {topSongs.slice(0, 5).map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    onPress={() => handleTrackPress(track, index)}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      trackMenuState.openTrackMenu(track);
                    }}
                    showArtwork={true}
                    showMenu={true}
                    onMenuPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      trackMenuState.openTrackMenu(track);
                    }}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.noTopSongsHint}>
                <Text style={styles.noTopSongsText}>
                  Tap &quot;See All&quot; to view all songs from this artist
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.albumsSection}>
          <Text style={styles.sectionTitleWithPadding}>Albums</Text>

          {albums.length > 0 ? (
            <FlatList
              data={albums}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={(item: Album) => item.id}
              renderItem={({ item }: { item: Album }) => (
                <ArtistAlbumItem album={item} />
              )}
              contentContainerStyle={styles.albumsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No albums available</Text>
            </View>
          )}
        </View>

        {hasSimilarArtists && (
          <View style={styles.similarArtistsSection}>
            <Text style={styles.sectionTitleWithPadding}>Similar Artists</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarArtistsContent}
            >
              {artistInfo!.similarArtist!.map((similarArtist) => (
                <View key={similarArtist.id} style={styles.similarArtistCard}>
                  <ArtistCard
                    artist={similarArtist}
                    width={120}
                    onPress={() => {
                      navigate({ name: 'artist-detail', params: { artistId: similarArtist.id } });
                    }}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TrackMenu
        visible={trackMenuState.showTrackMenu}
        onClose={trackMenuState.closeTrackMenu}
        track={trackMenuState.selectedTrack}
        onShowInfo={trackMenuState.handleShowInfo}
        onShowAddToPlaylist={trackMenuState.handleShowAddToPlaylist}
        onShowConfirm={trackMenuState.handleShowConfirm}
        onGoToArtist={trackMenuState.handleGoToArtist}
      />

      <SongInfoModal
        visible={trackMenuState.showSongInfo}
        onClose={() => trackMenuState.setShowSongInfo(false)}
        track={trackMenuState.selectedTrack}
      />

      <AddToPlaylistModal
        visible={trackMenuState.showAddToPlaylist}
        onClose={() => trackMenuState.setShowAddToPlaylist(false)}
        songIds={trackMenuState.selectedTrack ? [trackMenuState.selectedTrack.id] : []}
        songTitle={trackMenuState.selectedTrack?.title}
      />

      <ConfirmModal
        visible={trackMenuState.showConfirm}
        title={trackMenuState.confirmMessage.title}
        message={trackMenuState.confirmMessage.message}
        onClose={() => trackMenuState.setShowConfirm(false)}
      />

      <ArtistSelectionModal
        visible={trackMenuState.showArtistSelection}
        onClose={() => trackMenuState.setShowArtistSelection(false)}
        artists={trackMenuState.artistsToSelect}
        onSelectArtist={(artistId: string) => {
          navigate({ name: 'artist-detail', params: { artistId } });
        }}
      />

      <ArtistMenu
        visible={showArtistMenu}
        onClose={() => setShowArtistMenu(false)}
        artist={artist}
        coverArtUrl={coverArtUrl || undefined}
      />

      <ArtistSongsModal
        visible={showSongsModal}
        onClose={() => setShowSongsModal(false)}
        title={hasTopSongs ? 'Top Songs' : `Songs by ${artist.name}`}
        tracks={getModalSongs()}
        isLoading={isLoadingAllSongs}
        onTrackPress={handleModalTrackPress}
        onTrackLongPress={(track: Track) => trackMenuState.openTrackMenu(track)}
        onTrackMenuPress={(track: Track) => trackMenuState.openTrackMenu(track)}
        onPlayAll={handleModalPlayAll}
        onShuffle={handleModalShuffle}
      />
    </View>
  );
}

const ArtistAlbumItem: React.FC<{ album: Album }> = ({ album }) => {
  const theme = useTheme();
  const { navigate } = useNavigationStore();
  const albumMenuState = useAlbumMenuState();
  const { data: coverArtUrl } = useCoverArt(album.coverArt, 300);

  const styles = useMemo(() => StyleSheet.create({
    albumContainer: {
      flex: 1,
      margin: theme.spacing.sm,
      maxWidth: '50%',
    },
  }), [theme]);

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
