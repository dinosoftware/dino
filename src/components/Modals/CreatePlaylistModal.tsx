/**
 * Dino Music App - Create Playlist Modal
 * Modal for creating a new playlist
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useToastStore } from '../../stores/toastStore';

interface CreatePlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (playlistId: string, playlistName: string) => void;
  songIdsToAdd?: string[];
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  visible,
  onClose,
  onSuccess,
  songIdsToAdd,
}) => {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToastStore();

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.xl,
      width: '85%',
      maxWidth: 400,
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
    content: {
      padding: theme.spacing.lg,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.sm,
    },
    input: {
      backgroundColor: theme.colors.background.primary,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.primary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    hint: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    button: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    cancelButton: {
      backgroundColor: theme.colors.background.muted,
    },
    cancelButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text.primary,
    },
    createButton: {
      backgroundColor: theme.colors.accent,
    },
    createButtonDisabled: {
      opacity: 0.5,
    },
    createButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.accentForeground,
    },
  }), [theme]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsCreating(true);

    try {
      const { createPlaylist } = await import('../../api/opensubsonic/playlists');
      const response = await createPlaylist(name.trim(), songIdsToAdd);
      
      const playlist = response.playlist;
      if (!playlist) {
        throw new Error('Failed to create playlist');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Playlist "${playlist.name}" created`);
      setName('');
      onSuccess(playlist.id, playlist.name);
      onClose();
    } catch (error) {
      console.error('Failed to create playlist:', error);
      showToast('Failed to create playlist', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Playlist</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isCreating}
              style={styles.closeButton}
            >
              <X size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Playlist Name</Text>
            <TextInput
              style={styles.input}
              placeholder="My Playlist"
              placeholderTextColor={theme.colors.text.tertiary}
              value={name}
              onChangeText={setName}
              autoFocus
              editable={!isCreating}
              maxLength={100}
            />

            {songIdsToAdd && songIdsToAdd.length > 0 && (
              <Text style={styles.hint}>
                {songIdsToAdd.length} {songIdsToAdd.length === 1 ? 'song' : 'songs'} will be added
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isCreating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.createButton,
                (!name.trim() || isCreating) && styles.createButtonDisabled,
              ]}
              onPress={handleCreate}
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color={theme.colors.accentForeground} size="small" />
              ) : (
                <Text style={styles.createButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
