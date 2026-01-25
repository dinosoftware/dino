/**
 * Dino Music App - Settings Screen
 * Beautiful settings with QAM-style modals
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
} from 'react-native';
import { ArrowLeft, ChevronRight, Check, Server as ServerIcon, Plus, Trash2 } from 'lucide-react-native';
import { useAuthStore, useServerStore, useSettingsStore } from '../../stores';
import { useNavigationStore } from '../../stores/navigationStore';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { theme } from '../../config';
import * as Haptics from 'expo-haptics';

interface SettingsScreenProps {
  onLogout: () => void;
}

type ModalType = 'quality-wifi' | 'quality-mobile' | 'format-wifi' | 'format-mobile' | 'lyrics-font' | 'servers' | null;

interface ConfirmDialog {
  visible: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  destructive?: boolean;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout }) => {
  const { goBack } = useNavigationStore();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    visible: false,
    title: '',
    message: '',
  });

  const { 
    servers, 
    currentServerId, 
    setCurrentServer, 
    removeServer 
  } = useServerStore();
  
  const currentServer = servers.find((s) => s.id === currentServerId);
  const getCurrentServerAuth = useAuthStore((state) => state.getCurrentServerAuth);
  const auth = getCurrentServerAuth();
  const username = auth?.username || 'Unknown';
  
  const {
    streamingQualityWiFi,
    streamingQualityMobile,
    streamingFormatWiFi,
    streamingFormatMobile,
    lyricsFontSize,
    showLyricsTimestamps,
    enableScrobbling,
    autoSyncQueue,
    updateSettings,
  } = useSettingsStore();

  const qualityOptions = [
    { value: '0', label: 'Original', description: 'Highest quality, no transcoding' },
    { value: '320', label: '320 kbps', description: 'Very High' },
    { value: '256', label: '256 kbps', description: 'High' },
    { value: '192', label: '192 kbps', description: 'Medium' },
    { value: '128', label: '128 kbps', description: 'Standard' },
    { value: '96', label: '96 kbps', description: 'Low' },
    { value: '64', label: '64 kbps', description: 'Very Low' },
  ];

  const formatOptions = [
    { value: 'original', label: 'Original', description: 'Keep original format' },
    { value: 'mp3', label: 'MP3', description: 'Universal compatibility' },
    { value: 'opus', label: 'Opus', description: 'Better quality at lower bitrates' },
    { value: 'aac', label: 'AAC', description: 'Good quality, efficient' },
    { value: 'flac', label: 'FLAC', description: 'Lossless compression' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small', description: 'Compact lyrics display' },
    { value: 'medium', label: 'Medium', description: 'Balanced size' },
    { value: 'large', label: 'Large', description: 'Easy to read' },
  ];

  const getQualityLabel = (value: string) => {
    const option = qualityOptions.find(opt => opt.value === value);
    return option?.label || value;
  };

  const getFormatLabel = (value: string) => {
    const option = formatOptions.find(opt => opt.value === value);
    return option?.label.toUpperCase() || value.toUpperCase();
  };

  const handleSelectOption = (type: ModalType, value: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    switch (type) {
      case 'quality-wifi':
        updateSettings({ streamingQualityWiFi: value });
        break;
      case 'quality-mobile':
        updateSettings({ streamingQualityMobile: value });
        break;
      case 'format-wifi':
        updateSettings({ streamingFormatWiFi: value });
        break;
      case 'format-mobile':
        updateSettings({ streamingFormatMobile: value });
        break;
      case 'lyrics-font':
        updateSettings({ lyricsFontSize: value });
        break;
    }
    
    setActiveModal(null);
  };

  const handleSwitchServer = (serverId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { checkAuth, switchServer } = useAuthStore.getState();
    const hasCredentials = checkAuth(serverId);

    if (hasCredentials) {
      // Has saved credentials for this server - switch directly
      setConfirmDialog({
        visible: true,
        title: 'Switch Server',
        message: 'Switch to this server? You will stay logged in.',
        confirmText: 'Switch',
        destructive: false,
        onConfirm: () => {
          // Set new current server in server store
          setCurrentServer(serverId);
          
          // Switch server in auth store (loads credentials into API client)
          const success = switchServer(serverId);
          
          setActiveModal(null);
          
          if (success) {
            // Successfully switched - navigate to home and refresh
            goBack(); // Go back to previous screen
          } else {
            // Failed to switch (shouldn't happen since we checked credentials)
            onLogout();
          }
        },
      });
    } else {
      // No credentials - need to log in
      setConfirmDialog({
        visible: true,
        title: 'Switch Server',
        message: 'You need to log in to this server. Continue?',
        confirmText: 'Switch',
        destructive: false,
        onConfirm: () => {
          setCurrentServer(serverId);
          setActiveModal(null);
          onLogout(); // Will show login screen
        },
      });
    }
  };

  const handleRemoveServer = (serverId: string, serverName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmDialog({
      visible: true,
      title: 'Remove Server',
      message: `Are you sure you want to remove "${serverName}"? This action cannot be undone.`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: () => {
        removeServer(serverId);
        if (serverId === currentServerId && servers.length > 1) {
          onLogout();
        }
      },
    });
  };

  const handleAddServer = () => {
    setConfirmDialog({
      visible: true,
      title: 'Add Server',
      message: 'To add a new server, please log out and use the "Add New Server" button on the server selection screen.',
      confirmText: 'Log Out Now',
      onConfirm: () => {
        onLogout();
      },
    });
  };

  const renderOptionModal = (
    title: string,
    options: { value: string; label: string; description: string }[],
    currentValue: string,
    type: ModalType
  ) => (
    <Modal
        visible={activeModal === type}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setActiveModal(null)}
      >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        />
        <View style={styles.modalContainer}>
            {/* Swipe Handle */}
            <View style={styles.swipeIndicator}>
              <View style={styles.swipeHandle} />
            </View>

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
            </View>

            {/* Options */}
            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const isSelected = option.value === currentValue;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.optionItem}
                    onPress={() => handleSelectOption(type, option.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionInfo}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {option.label}
                      </Text>
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    </View>
                    {isSelected && (
                      <Check size={20} color={theme.colors.accent} strokeWidth={3} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.sectionCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Username</Text>
                <Text style={styles.settingValue}>{username}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.settingItem, styles.borderTop]}
              onPress={() => setActiveModal('servers')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Current Server</Text>
                <Text style={styles.settingValue} numberOfLines={1}>
                  {currentServer?.name || 'No server'}
                </Text>
                {currentServer?.url && (
                  <Text style={styles.settingSubtitle} numberOfLines={1}>
                    {currentServer.url}
                  </Text>
                )}
              </View>
              <ChevronRight size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Streaming Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STREAMING</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setActiveModal('quality-wifi')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Quality (WiFi)</Text>
                <Text style={styles.settingValue}>{getQualityLabel(streamingQualityWiFi)}</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingItem, styles.borderTop]}
              onPress={() => setActiveModal('quality-mobile')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Quality (Mobile Data)</Text>
                <Text style={styles.settingValue}>{getQualityLabel(streamingQualityMobile)}</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingItem, styles.borderTop]}
              onPress={() => setActiveModal('format-wifi')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Format (WiFi)</Text>
                <Text style={styles.settingValue}>{getFormatLabel(streamingFormatWiFi)}</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingItem, styles.borderTop]}
              onPress={() => setActiveModal('format-mobile')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Format (Mobile Data)</Text>
                <Text style={styles.settingValue}>{getFormatLabel(streamingFormatMobile)}</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Playback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PLAYBACK</Text>
          <View style={styles.sectionCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Scrobbling</Text>
                <Text style={styles.settingDescription}>Track play counts and listening history</Text>
              </View>
              <Switch
                value={enableScrobbling}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ enableScrobbling: value });
                }}
                trackColor={{ 
                  false: 'rgba(120, 120, 128, 0.16)', 
                  true: theme.colors.accent 
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="rgba(120, 120, 128, 0.16)"
              />
            </View>

            <View style={[styles.settingItem, styles.borderTop]}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Server Queue Sync</Text>
                <Text style={styles.settingDescription}>Continue playback across devices</Text>
              </View>
              <Switch
                value={autoSyncQueue}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ autoSyncQueue: value });
                }}
                trackColor={{ 
                  false: 'rgba(120, 120, 128, 0.16)', 
                  true: theme.colors.accent 
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="rgba(120, 120, 128, 0.16)"
              />
            </View>
          </View>
        </View>

        {/* Lyrics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LYRICS</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setActiveModal('lyrics-font')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Font Size</Text>
                <Text style={styles.settingValue}>
                  {lyricsFontSize.charAt(0).toUpperCase() + lyricsFontSize.slice(1)}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>

            <View style={[styles.settingItem, styles.borderTop]}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Show Timestamps</Text>
              </View>
              <Switch
                value={showLyricsTimestamps}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ showLyricsTimestamps: value });
                }}
                trackColor={{ 
                  false: 'rgba(120, 120, 128, 0.16)', 
                  true: theme.colors.accent 
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="rgba(120, 120, 128, 0.16)"
              />
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.sectionCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Version</Text>
                <Text style={styles.settingValue}>1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onLogout();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Option Modals */}
      {renderOptionModal('Streaming Quality (WiFi)', qualityOptions, streamingQualityWiFi, 'quality-wifi')}
      {renderOptionModal('Streaming Quality (Mobile)', qualityOptions, streamingQualityMobile, 'quality-mobile')}
      {renderOptionModal('Streaming Format (WiFi)', formatOptions, streamingFormatWiFi, 'format-wifi')}
      {renderOptionModal('Streaming Format (Mobile)', formatOptions, streamingFormatMobile, 'format-mobile')}
      {renderOptionModal('Lyrics Font Size', fontSizeOptions, lyricsFontSize, 'lyrics-font')}

      {/* Confirm Dialog */}
      <ConfirmModal
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onClose={() => setConfirmDialog({ ...confirmDialog, visible: false })}
        onConfirm={confirmDialog.onConfirm}
        confirmText={confirmDialog.confirmText}
        destructive={confirmDialog.destructive}
      />

      {/* Server Management Modal */}
      <Modal
        visible={activeModal === 'servers'}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={() => setActiveModal(null)}
          />
          <View style={styles.modalContainer}>
              {/* Swipe Handle */}
              <View style={styles.swipeIndicator}>
                <View style={styles.swipeHandle} />
              </View>

              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Servers</Text>
                <TouchableOpacity onPress={handleAddServer} style={styles.addButton}>
                  <Plus size={20} color={theme.colors.accent} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Server List */}
              <ScrollView 
                style={styles.modalContent}
                contentContainerStyle={styles.modalContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {servers.map((server) => {
                  const isSelected = server.id === currentServerId;
                  return (
                    <View key={server.id} style={styles.serverItem}>
                      <TouchableOpacity
                        style={styles.serverInfo}
                        onPress={() => !isSelected && handleSwitchServer(server.id)}
                        activeOpacity={isSelected ? 1 : 0.7}
                      >
                        <View style={styles.serverIconContainer}>
                          <ServerIcon size={20} color={isSelected ? theme.colors.accent : theme.colors.text.secondary} strokeWidth={2} />
                        </View>
                        <View style={styles.serverDetails}>
                          <Text style={[styles.serverName, isSelected && styles.serverNameSelected]}>
                            {server.name}
                          </Text>
                          <Text style={styles.serverUrl} numberOfLines={1}>
                            {server.url}
                          </Text>
                        </View>
                        {isSelected && (
                          <Check size={20} color={theme.colors.accent} strokeWidth={3} />
                        )}
                      </TouchableOpacity>
                      {servers.length > 1 && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleRemoveServer(server.id, server.name)}
                        >
                          <Trash2 size={18} color={theme.colors.error} strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionCard: {
    backgroundColor: theme.colors.background.card,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 56,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  settingLeft: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  settingSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: theme.colors.error,
    marginHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  logoutButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },

  // Modal Styles (QAM-style)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContainer: {
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  swipeIndicator: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  swipeHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.text.tertiary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    flex: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingVertical: theme.spacing.md,
  },
  modalContentContainer: {
    paddingBottom: 40,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 64,
  },
  optionInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  optionLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: theme.colors.accent,
  },
  optionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },

  // Server Management Styles
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 72,
  },
  serverInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serverIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  serverDetails: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  serverName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  serverNameSelected: {
    color: theme.colors.accent,
  },
  serverUrl: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
});
