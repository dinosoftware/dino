/**
 * Dino Music App - Song Info Modal
 * Displays detailed information about a track
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Track } from '../../api/opensubsonic/types';
import { theme } from '../../config';
import { useCoverArt } from '../../hooks/api';

interface SongInfoModalProps {
  visible: boolean;
  onClose: () => void;
  track: Track | null;
}

export const SongInfoModal: React.FC<SongInfoModalProps> = ({ visible, onClose, track }) => {
  const { data: coverArtUrl } = useCoverArt(track?.coverArt, 300);

  if (!track) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const infoRows = [
    { label: 'Title', value: track.title },
    { label: 'Artist', value: track.artist || 'Unknown' },
    { label: 'Album', value: track.album || 'Unknown' },
    { label: 'Album Artist', value: track.artist || 'Unknown' },
    { label: 'Year', value: track.year?.toString() || 'Unknown' },
    { label: 'Genre', value: track.genre || 'Unknown' },
    { label: 'Track Number', value: track.track?.toString() || 'Unknown' },
    { label: 'Duration', value: formatDuration(track.duration) },
    { label: 'Bitrate', value: track.bitRate ? `${track.bitRate} kbps` : 'Unknown' },
    { label: 'File Format', value: track.suffix?.toUpperCase() || 'Unknown' },
    { label: 'File Size', value: formatFileSize(track.size) },
    { label: 'Content Type', value: track.contentType || 'Unknown' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Song Info</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Album Art */}
            {coverArtUrl && (
              <View style={styles.artworkContainer}>
                <Image source={{ uri: coverArtUrl }} style={styles.artwork} />
              </View>
            )}

            {/* Info Rows */}
            <View style={styles.infoContainer}>
              {infoRows.map((row, index) => (
                <View key={index} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.lg,
  },
  artworkContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  artwork: {
    width: 200,
    height: 200,
    borderRadius: theme.borderRadius.lg,
  },
  infoContainer: {
    gap: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
});
