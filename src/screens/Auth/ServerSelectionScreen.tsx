/**
 * Dino Music App - Server Selection Screen
 * Select from existing servers or add a new one
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { ChevronRight, Plus, Server as ServerIcon, Trash2 } from 'lucide-react-native';
import { useServerStore, useAuthStore } from '../../stores';
import { theme } from '../../config';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';

interface ServerSelectionScreenProps {
  onServerSelected: () => void; // Called when server selected WITH credentials
  onNeedsLogin: () => void; // Called when server selected WITHOUT credentials
  onAddNewServer: () => void;
}

export const ServerSelectionScreen: React.FC<ServerSelectionScreenProps> = ({
  onServerSelected,
  onNeedsLogin,
  onAddNewServer,
}) => {
  const { servers, currentServerId, setCurrentServer, removeServer } = useServerStore();
  const { checkAuth, switchServer } = useAuthStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);

  const handleSelectServer = (serverId: string) => {
    const hasCredentials = checkAuth(serverId);
    
    // Set as current server
    setCurrentServer(serverId);
    
    if (hasCredentials) {
      // Has saved credentials - switch directly and go to main app
      const success = switchServer(serverId);
      if (success) {
        console.log('[ServerSelection] Auto-login with saved credentials');
        onServerSelected(); // Go to main app
      } else {
        // Failed to load credentials (shouldn't happen)
        console.log('[ServerSelection] Failed to load credentials, showing login');
        onNeedsLogin(); // Go to login screen
      }
    } else {
      // No credentials - need to log in
      console.log('[ServerSelection] No credentials, showing login');
      onNeedsLogin(); // Go to login screen
    }
  };

  const handleDeleteServer = (serverId: string) => {
    setServerToDelete(serverId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (serverToDelete) {
      removeServer(serverToDelete);
      setServerToDelete(null);
    }
    setShowDeleteConfirm(false);
  };

  const serverToDeleteObj = servers.find((s) => s.id === serverToDelete);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Server</Text>
        <Text style={styles.subtitle}>
          Choose which server to connect to
        </Text>
      </View>

      {/* Server List */}
      <FlatList
        data={servers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.serverCard}>
            <TouchableOpacity
              style={styles.serverButton}
              onPress={() => handleSelectServer(item.id)}
            >
              <View style={styles.serverIconContainer}>
                <ServerIcon
                  size={20}
                  color={
                    item.id === currentServerId
                      ? theme.colors.accent
                      : theme.colors.text.secondary
                  }
                  strokeWidth={2}
                />
              </View>
              <View style={styles.serverInfo}>
                <Text style={styles.serverName}>{item.name}</Text>
                <Text style={styles.serverUrl}>{item.url}</Text>
              </View>
              <ChevronRight
                size={18}
                color={theme.colors.text.tertiary}
                strokeWidth={2}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteServer(item.id)}
            >
              <Trash2 size={18} color={theme.colors.error} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.addButton} onPress={onAddNewServer}>
              <Plus size={20} color={theme.colors.accent} strokeWidth={2.5} />
              <Text style={styles.addButtonText}>Add New Server</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Remove Server"
        message={`Are you sure you want to remove "${serverToDeleteObj?.name}"?`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onClose={() => {
          setShowDeleteConfirm(false);
          setServerToDelete(null);
        }}
        destructive
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.huge,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.fontSize.lg * theme.typography.lineHeight.relaxed,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  serverButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  serverIconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  serverInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  serverName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  serverUrl: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  deleteButton: {
    width: 44,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.muted,
  },
  separator: {
    height: theme.spacing.xs,
  },
  footer: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderStyle: 'dashed',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  addButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.accent,
    marginLeft: theme.spacing.sm,
  },
});
