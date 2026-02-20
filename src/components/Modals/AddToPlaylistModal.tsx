/**
 * Dino Music App - Add to Playlist Modal
 * Select a playlist to add songs to
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { X, Plus, ListMusic } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlaylists, updatePlaylist } from '../../api/opensubsonic/playlists';
import { CreatePlaylistModal } from './CreatePlaylistModal';
import { useTheme } from '../../hooks/useTheme';
import { Playlist } from '../../api/opensubsonic/types';

interface AddToPlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  songIds: string[];
  songTitle?: string;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  visible,
  onClose,
  songIds,
  songTitle,
}) => {
  const theme = useTheme();
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: theme.colors.background.card,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      maxHeight: '80%',
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
    createNewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    createNewIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accent + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    createNewText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.accent,
    },
    list: {
      maxHeight: 400,
    },
    loadingContainer: {
      paddingVertical: theme.spacing.xxl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      paddingVertical: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.md,
    },
    emptyHint: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xs,
    },
    playlistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    playlistInfo: {
      flex: 1,
    },
    playlistName: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    playlistDetails: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.secondary,
    },
  }), [theme]);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['playlists'],
    queryFn: getPlaylists,
    enabled: visible,
  });

  const playlists = response?.playlists?.playlist || [];

  useEffect(() => {
    if (visible) {
      refetch();
    }
  }, [visible, refetch]);

  const handleAddToPlaylist = async (playlist: Playlist) => {
    setAddingToPlaylist(playlist.id);

    try {
      await updatePlaylist(playlist.id, undefined, undefined, undefined, songIds);
      
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', playlist.id] });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Failed to add to playlist:', error);
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handleCreateSuccess = (playlistId: string, playlistName: string) => {
    setShowCreatePlaylist(false);
    queryClient.invalidateQueries({ queryKey: ['playlists'] });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Add to Playlist</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.createNewButton}
              onPress={() => setShowCreatePlaylist(true)}
            >
              <View style={styles.createNewIcon}>
                <Plus size={20} color={theme.colors.accent} strokeWidth={2.5} />
              </View>
              <Text style={styles.createNewText}>Create New Playlist</Text>
            </TouchableOpacity>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.colors.accent} size="large" />
              </View>
            ) : playlists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ListMusic size={48} color={theme.colors.text.tertiary} strokeWidth={1.5} />
                <Text style={styles.emptyText}>No playlists yet</Text>
                <Text style={styles.emptyHint}>Create one to get started</Text>
              </View>
            ) : (
              <FlatList
                data={playlists}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.playlistItem}
                    onPress={() => handleAddToPlaylist(item)}
                    disabled={addingToPlaylist !== null}
                    activeOpacity={0.7}
                  >
                    <View style={styles.playlistInfo}>
                      <Text style={styles.playlistName}>{item.name}</Text>
                      <Text style={styles.playlistDetails}>
                        {item.songCount || 0} {item.songCount === 1 ? 'song' : 'songs'}
                      </Text>
                    </View>
                    {addingToPlaylist === item.id && (
                      <ActivityIndicator color={theme.colors.accent} size="small" />
                    )}
                  </TouchableOpacity>
                )}
                style={styles.list}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      <CreatePlaylistModal
        visible={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
        onSuccess={handleCreateSuccess}
        songIdsToAdd={songIds}
      />
    </>
  );
};
