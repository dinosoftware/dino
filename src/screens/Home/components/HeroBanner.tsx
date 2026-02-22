/**
 * Dino Music App - Hero Banner
 * Auto-swiping banner with random songs
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { Play, Shuffle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { getRandomSongs } from '../../../api/opensubsonic/songs';
import { getSimilarSongs2 } from '../../../api/opensubsonic/radio';
import { useCoverArt } from '../../../hooks/api/useAlbums';
import { useNavigationStore } from '../../../stores/navigationStore';
import { HeroBannerSkeleton } from '../../../components/common';
import { useQueueStore } from '../../../stores/queueStore';
import { usePlayerStore } from '../../../stores/playerStore';
import { useServerStore } from '../../../stores/serverStore';
import { trackPlayerService } from '../../../services/player/TrackPlayerService';
import { useTheme } from '../../../hooks/useTheme';
import { Theme } from '../../../config/theme';
import { Track } from '../../../api/opensubsonic/types';

const BANNER_HEIGHT = 200;

export const HeroBanner: React.FC = () => {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const CARD_WIDTH = screenWidth - theme.spacing.lg * 2;
  const CARD_GAP = theme.spacing.md;
  const AUTO_SCROLL_INTERVAL = 5000;
  
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { currentServerId } = useServerStore();

  const styles = useMemo(() => createStyles(theme, CARD_WIDTH), [theme, CARD_WIDTH]);

  // Fetch random songs
  const { data: response, isLoading } = useQuery({
    queryKey: ['hero-random-songs', currentServerId],
    queryFn: async () => getRandomSongs(10),
    staleTime: 5 * 60 * 1000,
    enabled: !!currentServerId,
  });

  const tracks = response?.randomSongs?.song || [];

  // Auto-scroll logic
  useEffect(() => {
    if (tracks.length <= 1) return;

    const startAutoScroll = () => {
      autoScrollTimer.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % tracks.length;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * (CARD_WIDTH + CARD_GAP),
            animated: true,
          });
          return nextIndex;
        });
      }, AUTO_SCROLL_INTERVAL);
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [tracks.length, CARD_WIDTH, CARD_GAP]);

  // Handle manual scroll
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_GAP));
    setCurrentIndex(index);

    // Reset auto-scroll timer on manual scroll
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
  };

  const handleScrollEnd = () => {
    // Restart auto-scroll after manual interaction
    if (tracks.length > 1) {
      autoScrollTimer.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % tracks.length;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * (CARD_WIDTH + CARD_GAP),
            animated: true,
          });
          return nextIndex;
        });
      }, AUTO_SCROLL_INTERVAL);
    }
  };

  if (isLoading) {
    return <HeroBannerSkeleton />;
  }

  if (tracks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
      >
        {tracks.map((track) => (
          <HeroCard key={track.id} track={track} cardWidth={CARD_WIDTH} />
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      {tracks.length > 1 && (
        <View style={styles.pagination}>
          {tracks.map((_, index: number) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

interface HeroCardProps {
  track: Track;
  cardWidth: number;
}

const HeroCard: React.FC<HeroCardProps> = ({ track, cardWidth }) => {
  const theme = useTheme();
  const { data: coverArtUrl } = useCoverArt(track.coverArt, 500);
  const { navigate } = useNavigationStore();
  const { setQueue } = useQueueStore();
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);

  const styles = useMemo(() => createCardStyles(theme, cardWidth), [theme, cardWidth]);

  const handlePlay = async () => {
    try {
      // Get similar songs (instant mix)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await getSimilarSongs2(track.id);
      const similarTracks = response.similarSongs2?.song || [];
      
      if (similarTracks.length > 0) {
        // Start with the current track, then add similar tracks
        const mixTracks = [track, ...similarTracks];
        setQueue(mixTracks, 0);
        setCurrentTrack(mixTracks[0]);
        await trackPlayerService.play();
      } else {
        // No similar tracks, just play the current track
        setQueue([track], 0);
        setCurrentTrack(track);
        await trackPlayerService.play();
      }
    } catch (error) {
      console.error('Failed to start instant mix:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleShuffle = async () => {
    try {
      // Get similar songs and shuffle
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await getSimilarSongs2(track.id);
      const similarTracks = response.similarSongs2?.song || [];
      
      if (similarTracks.length > 0) {
        // Shuffle the similar tracks
        const shuffled = [...similarTracks].sort(() => Math.random() - 0.5);
        const mixTracks = [track, ...shuffled];
        setQueue(mixTracks, 0);
        setCurrentTrack(mixTracks[0]);
        await trackPlayerService.play();
      } else {
        // No similar tracks, just play the current track
        setQueue([track], 0);
        setCurrentTrack(track);
        await trackPlayerService.play();
      }
    } catch (error) {
      console.error('Failed to shuffle instant mix:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleCardPress = () => {
    // Navigate to the track's album
    if (track.albumId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigate({ name: 'album-detail', params: { albumId: track.albumId } });
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handleCardPress}
      activeOpacity={0.9}
    >
      <Image
        source={
          coverArtUrl
            ? { uri: coverArtUrl }
            : require('../../../../assets/images/album_art_placeholder.png')
        }
        style={styles.artwork}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      />
      <View style={styles.cardContent}>
        <View style={styles.textContainer}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {track.artist}
          </Text>
          {track.album && (
            <Text style={styles.albumName} numberOfLines={1}>{track.album}</Text>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.playButton} 
            onPress={(e) => {
              e.stopPropagation();
              handlePlay();
            }}
          >
            <Play size={24} color={theme.colors.accentForeground} fill={theme.colors.accentForeground} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.shuffleButton} 
            onPress={(e) => {
              e.stopPropagation();
              handleShuffle();
            }}
          >
            <Shuffle size={20} color={theme.colors.text.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme, cardWidth: number) => StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.background.elevated,
  },
  dotActive: {
    width: 20,
    backgroundColor: theme.colors.accent,
  },
});

const createCardStyles = (theme: Theme, cardWidth: number) => StyleSheet.create({
  card: {
    width: cardWidth,
    height: BANNER_HEIGHT,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    marginRight: 0,
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  cardContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  textContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  trackTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  artistName: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  albumName: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shuffleButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
