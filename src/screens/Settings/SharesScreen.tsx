/**
 * Dino Music App - Shares Screen
 * Manage all created shares
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Share as RNShare,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, ExternalLink, Copy, Trash2, Clock, Eye, Edit } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getShares, deleteShare, Share } from '../../api/opensubsonic/share';
import { useNavigationStore } from '../../stores/navigationStore';
import { LoadingSpinner, EmptyState, ErrorView } from '../../components/common';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { EditShareModal } from '../../components/Modals/EditShareModal';
import { useTheme } from '../../hooks/useTheme';

export const SharesScreen: React.FC = () => {
  const theme = useTheme();
  const { goBack } = useNavigationStore();
  const queryClient = useQueryClient();
  const [selectedShare, setSelectedShare] = useState<Share | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: shares, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['shares'],
    queryFn: getShares,
  });

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xxl + theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: theme.typography.fontSize.huge,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text.primary,
      letterSpacing: theme.typography.letterSpacing.tight,
    },
    list: {
      padding: theme.spacing.lg,
    },
    shareItem: {
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    shareItemExpired: {
      opacity: 0.5,
    },
    shareInfo: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    shareDescription: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    shareMeta: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
    },
    expiredText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
      fontFamily: theme.typography.fontFamily.semibold,
    },
    shareActions: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    actionButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background.elevated,
      borderRadius: theme.borderRadius.md,
    },
  }), [theme]);

  const handleCopyLink = async (url: string) => {
    try {
      await Clipboard.setStringAsync(url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShareLink = async (share: Share) => {
    try {
      await RNShare.share({
        message: `${share.description || 'Check this out'}\n\n${share.url}`,
        url: share.url,
        title: `Share: ${share.description || 'Music'}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedShare) return;

    try {
      await deleteShare(selectedShare.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDeleteConfirm(false);
      setSelectedShare(null);
      queryClient.invalidateQueries({ queryKey: ['shares'] });
    } catch (error) {
      console.error('Failed to delete share:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  interface ShareItemProps {
    share: Share;
    onCopyLink: (url: string) => void;
    onShareLink: (share: Share) => void;
    onEdit: () => void;
    onDelete: () => void;
  }

  const ShareItem: React.FC<ShareItemProps> = ({ share, onCopyLink, onShareLink, onEdit, onDelete }) => {
    const isExpired = share.expires && new Date(share.expires) < new Date();

    return (
      <View style={[styles.shareItem, isExpired && styles.shareItemExpired]}>
        <View style={styles.shareInfo}>
          <Text style={styles.shareDescription} numberOfLines={2}>
            {share.description || 'Shared content'}
          </Text>
          <View style={styles.shareMeta}>
            <View style={styles.metaItem}>
              <Clock size={14} color={theme.colors.text.tertiary} />
              <Text style={styles.metaText}>
                Created {formatDate(share.created)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Eye size={14} color={theme.colors.text.tertiary} />
              <Text style={styles.metaText}>
                {share.visitCount} {share.visitCount === 1 ? 'visit' : 'visits'}
              </Text>
            </View>
          </View>
          {isExpired && (
            <Text style={styles.expiredText}>Expired</Text>
          )}
        </View>

        <View style={styles.shareActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCopyLink(share.url);
            }}
          >
            <Copy size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onShareLink(share);
            }}
          >
            <ExternalLink size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEdit();
            }}
          >
            <Edit size={20} color={theme.colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onDelete();
            }}
          >
            <Trash2 size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && !isRefetching) {
    return <LoadingSpinner message="Loading shares..." />;
  }

  if (error && !shares) {
    return <ErrorView error="Failed to load shares" onRetry={() => refetch()} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Shares</Text>
        <View style={styles.backButton} />
      </View>

      {!shares || shares.length === 0 ? (
        <EmptyState
          title="No shares yet"
          message="Create a share by tapping Share on any track, album, or playlist"
        />
      ) : (
        <FlatList
          data={shares}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ShareItem
              share={item}
              onCopyLink={handleCopyLink}
              onShareLink={handleShareLink}
              onEdit={() => {
                setSelectedShare(item);
                setShowEditModal(true);
              }}
              onDelete={() => {
                setSelectedShare(item);
                setShowDeleteConfirm(true);
              }}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
            />
          }
        />
      )}

      <EditShareModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedShare(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['shares'] });
        }}
        share={selectedShare}
      />

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Share"
        message={`Are you sure you want to delete this share? The link will stop working.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedShare(null);
        }}
        destructive={true}
      />
    </View>
  );
};
