/**
 * Dino Music App - Artist Songs Modal
 * Modal to display all songs for an artist (top songs or all album songs)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { X, Play, Shuffle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Track } from '../../api/opensubsonic/types';
import { theme } from '../../config';
import { TrackRow } from '../Cards/TrackRow';

interface ArtistSongsModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  tracks: Track[];
  isLoading?: boolean;
  onTrackPress: (track: Track, index: number) => void;
  onTrackLongPress: (track: Track) => void;
  onTrackMenuPress: (track: Track) => void;
  onPlayAll: () => void;
  onShuffle: () => void;
}

export const ArtistSongsModal: React.FC<ArtistSongsModalProps> = ({
  visible,
  onClose,
  title,
  tracks,
  isLoading = false,
  onTrackPress,
  onTrackLongPress,
  onTrackMenuPress,
  onPlayAll,
  onShuffle,
}) => {
  const handlePlayAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPlayAll();
  };

  const handleShuffle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShuffle();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePlayAll}
              activeOpacity={0.7}
              disabled={tracks.length === 0}
            >
              <Play size={18} color={theme.colors.text.primary} fill={theme.colors.text.primary} />
              <Text style={styles.actionButtonText}>Play All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShuffle}
              activeOpacity={0.7}
              disabled={tracks.length === 0}
            >
              <Shuffle size={18} color={theme.colors.text.primary} />
              <Text style={styles.actionButtonText}>Shuffle</Text>
            </TouchableOpacity>
          </View>

          {/* Track count */}
          <Text style={styles.trackCount}>
            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
          </Text>

          {/* Songs List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading songs...</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              <FlatList
                data={tracks}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={({ item, index }) => (
                  <TrackRow
                    track={item}
                    onPress={() => onTrackPress(item, index)}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onTrackLongPress(item);
                    }}
                    showArtwork={true}
                    showMenu={true}
                    onMenuPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onTrackMenuPress(item);
                    }}
                  />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No songs available</Text>
                  </View>
                }
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    height: '85%',
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.muted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  trackCount: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
});
