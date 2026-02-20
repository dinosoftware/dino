/**
 * Dino Music App - Edit Share Modal
 * Modal for editing an existing share's description and expiration
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { X, Calendar } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Share, updateShare } from '../../api/opensubsonic/share';

interface EditShareModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  share: Share | null;
}

export const EditShareModal: React.FC<EditShareModalProps> = ({
  visible,
  onClose,
  onSuccess,
  share,
}) => {
  const theme = useTheme();
  const [description, setDescription] = useState('');
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState('30');
  const [isUpdating, setIsUpdating] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    modal: {
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.xl,
      width: '100%',
      maxWidth: 400,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.sm,
    },
    input: {
      backgroundColor: theme.colors.background.elevated,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    switchLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    switchLabel: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text.primary,
    },
    expirationContainer: {
      marginTop: theme.spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      paddingTop: 0,
    },
    button: {
      flex: 1,
      height: 48,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonPrimary: {
      backgroundColor: theme.colors.accent,
    },
    buttonSecondary: {
      backgroundColor: theme.colors.background.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonTextPrimary: {
      color: theme.colors.text.inverse,
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
    },
    buttonTextSecondary: {
      color: theme.colors.text.primary,
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
    },
  }), [theme]);

  useEffect(() => {
    if (share) {
      setDescription(share.description || '');
      setHasExpiration(!!share.expires);
      
      if (share.expires) {
        const expiresDate = new Date(share.expires);
        const now = new Date();
        const daysUntil = Math.max(1, Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        setExpirationDays(daysUntil.toString());
      } else {
        setExpirationDays('30');
      }
    }
  }, [share]);

  const handleUpdate = async () => {
    if (!share || !description.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsUpdating(true);

    try {
      let expiresTimestamp: number | undefined;
      
      if (hasExpiration) {
        const days = parseInt(expirationDays, 10);
        if (isNaN(days) || days < 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setIsUpdating(false);
          return;
        }
        const expiresDate = new Date();
        expiresDate.setDate(expiresDate.getDate() + days);
        expiresTimestamp = expiresDate.getTime();
      }

      await updateShare(share.id, description.trim(), expiresTimestamp);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update share:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
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
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Share</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isUpdating}
              style={styles.closeButton}
            >
              <X size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Share description"
              placeholderTextColor={theme.colors.text.tertiary}
              value={description}
              onChangeText={setDescription}
              editable={!isUpdating}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleUpdate}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Calendar size={20} color={theme.colors.text.secondary} />
                <Text style={styles.switchLabel}>Set Expiration</Text>
              </View>
              <Switch
                value={hasExpiration}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHasExpiration(value);
                }}
                disabled={isUpdating}
                trackColor={{
                  false: 'rgba(120, 120, 128, 0.16)',
                  true: theme.colors.accent
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="rgba(120, 120, 128, 0.16)"
              />
            </View>

            {hasExpiration && (
              <View style={styles.expirationContainer}>
                <Text style={styles.label}>Days Until Expiration</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={expirationDays}
                  onChangeText={setExpirationDays}
                  editable={!isUpdating}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleClose}
              disabled={isUpdating}
            >
              <Text style={styles.buttonTextSecondary}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleUpdate}
              disabled={isUpdating || !description.trim()}
            >
              {isUpdating ? (
                <ActivityIndicator color={theme.colors.text.inverse} size="small" />
              ) : (
                <Text style={styles.buttonTextPrimary}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
