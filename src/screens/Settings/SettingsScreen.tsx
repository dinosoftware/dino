/**
 * Dino Music App - Settings Screen
 * Beautiful settings with QAM-style modals
 */

import * as Haptics from 'expo-haptics';
import { ArrowLeft, Check, ChevronRight, Edit3, Plus, Server as ServerIcon, Trash2 } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { apiClient } from '../../api/client';
import { Avatar } from '../../components/common';
import { ConfirmModal } from '../../components/Modals/ConfirmModal';
import { APP_VERSION } from '../../config/constants';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore, useServerStore, useSettingsStore } from '../../stores';
import { useNavigationStore } from '../../stores/navigationStore';
import { useToastStore } from '../../stores/toastStore';
import { useUserStore } from '../../stores/userStore';

interface SettingsScreenProps {
  onLogout: () => void;
}

type ModalType = 'quality-wifi' | 'quality-mobile' | 'format-wifi' | 'format-mobile' | 'lyrics-font' | 'servers' | 'max-downloads' | 'instant-mix' | 'storage-limit' | 'edit-credentials' | 'theme' | 'background-style' | null;

interface ConfirmDialog {
  visible: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  destructive?: boolean;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout }) => {
  const theme = useTheme();
  const { goBack } = useNavigationStore();
  const { showToast } = useToastStore();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    visible: false,
    title: '',
    message: '',
  });

  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [editServerName, setEditServerName] = useState('');
  const [editServerUrl, setEditServerUrl] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [editAuthMode, setEditAuthMode] = useState<'password' | 'apikey'>('password');

  const {
    servers,
    currentServerId,
    setCurrentServer,
    removeServer,
    updateServer
  } = useServerStore();

  const {
    streamingQualityWiFi,
    streamingQualityMobile,
    streamingFormatWiFi,
    streamingFormatMobile,
    lyricsFontSize,
    showLyricsTimestamps,
    enableScrobbling,
    autoSyncQueue,
    autoExtendQueue,
    gaplessPlayback,
    includeShareMessage,
    wifiOnlyDownloads,
    maxConcurrentDownloads,
    instantMixSize,
    storageLimit,
    usePostRequests,
    autoFocusSearch,
    themeMode,
    backgroundStyle,
    updateSettings,
  } = useSettingsStore();

  const currentServer = servers.find((s) => s.id === currentServerId);
  const getCurrentServerAuth = useAuthStore((state) => state.getCurrentServerAuth);
  const auth = getCurrentServerAuth();
  const { user } = useUserStore();

  const username = user?.username || auth?.username || 'Unknown';

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (user) {
      apiClient.buildAvatarUrl(user.username).then(setAvatarUrl);
    }
  }, [user]);

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
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
    },
    modalOverlayEnd: {
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
    serverActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    serverActionButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: theme.spacing.xs,
    },
    inputLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xs,
    },
    input: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md + 2,
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text.primary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    saveButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.lg,
    },
    saveButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
    authModeToggle: {
      flexDirection: 'row',
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.background.elevated,
      borderRadius: theme.borderRadius.md,
      padding: 4,
    },
    authToggleButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      borderRadius: theme.borderRadius.sm,
    },
    authToggleButtonActive: {
      backgroundColor: theme.colors.accent,
    },
    authToggleText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.secondary,
    },
    authToggleTextActive: {
      color: theme.colors.accentForeground,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    editCredentialsContainer: {
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.xl,
      marginHorizontal: theme.spacing.lg,
      maxWidth: 400,
      width: '90%',
      alignSelf: 'center',
    },
  }), [theme]);

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

  const maxDownloadsOptions = [
    { value: 1, label: '1', description: 'One at a time' },
    { value: 2, label: '2', description: 'Two concurrent downloads' },
    { value: 3, label: '3', description: 'Three concurrent downloads' },
    { value: 4, label: '4', description: 'Four concurrent downloads' },
    { value: 5, label: '5', description: 'Five concurrent downloads' },
  ];

  const instantMixOptions = [
    { value: 10, label: '10', description: '10 tracks in instant mix' },
    { value: 15, label: '15', description: '15 tracks in instant mix' },
    { value: 20, label: '20', description: '20 tracks in instant mix' },
    { value: 30, label: '30', description: '30 tracks in instant mix' },
    { value: 50, label: '50', description: '50 tracks in instant mix' },
  ];

  const storageLimitOptions = [
    { value: 1024, label: '1 GB', description: '1 GB storage limit' },
    { value: 2048, label: '2 GB', description: '2 GB storage limit' },
    { value: 5120, label: '5 GB', description: '5 GB storage limit' },
    { value: 10240, label: '10 GB', description: '10 GB storage limit' },
    { value: 20480, label: '20 GB', description: '20 GB storage limit' },
    { value: 51200, label: '50 GB', description: '50 GB storage limit' },
  ];

  const themeOptions = [
    { value: 'dark', label: 'Dark', description: 'Zinc-based dark theme' },
    { value: 'light', label: 'Light', description: 'Clean light theme' },
    { value: 'amoled', label: 'AMOLED', description: 'Pure black for OLED screens' },
  ];

  const backgroundStyleOptions = [
    { value: 'blur', label: 'Blurred Cover', description: 'Blurred album art background' },
    { value: 'solid', label: 'Solid Color', description: 'Theme-based solid background' },
    { value: 'gradient', label: 'Dynamic Gradient', description: 'Color gradient from cover art' },
    { value: 'dynamicColor', label: 'Dynamic Color', description: 'Solid color from cover art' },
  ];

  const getQualityLabel = (value: string) => {
    const option = qualityOptions.find(opt => opt.value === value);
    return option?.label || value;
  };

  const getFormatLabel = (value: string) => {
    const option = formatOptions.find(opt => opt.value === value);
    return option?.label || value;
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
      case 'max-downloads':
        updateSettings({ maxConcurrentDownloads: value });
        break;
      case 'instant-mix':
        updateSettings({ instantMixSize: value });
        break;
      case 'storage-limit':
        updateSettings({ storageLimit: value });
        break;
      case 'theme':
        updateSettings({ themeMode: value });
        break;
      case 'background-style':
        updateSettings({ backgroundStyle: value });
        break;
    }

    setActiveModal(null);
  };

  const handleSwitchServer = (serverId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { checkAuth, switchServer } = useAuthStore.getState();
    const hasCredentials = checkAuth(serverId);

    if (hasCredentials) {
      setConfirmDialog({
        visible: true,
        title: 'Switch Server',
        message: 'Switch to this server? You will stay logged in.',
        confirmText: 'Switch',
        destructive: false,
        onConfirm: () => {
          setCurrentServer(serverId);
          const success = switchServer(serverId);
          setActiveModal(null);

          if (success) {
            goBack();
          } else {
            onLogout();
          }
        },
      });
    } else {
      setConfirmDialog({
        visible: true,
        title: 'Switch Server',
        message: 'You need to log in to this server. Continue?',
        confirmText: 'Switch',
        destructive: false,
        onConfirm: () => {
          setCurrentServer(serverId);
          setActiveModal(null);
          onLogout();
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

  const handleEditCredentials = (serverId: string) => {
    const server = servers.find((s) => s.id === serverId);
    const auth = useAuthStore.getState().credentials[serverId];
    setEditingServerId(serverId);
    setEditServerName(server?.name || '');
    setEditServerUrl(server?.url || '');

    if (auth?.apiKey) {
      setEditAuthMode('apikey');
      setEditApiKey('');
      setEditUsername('');
      setEditPassword('');
    } else {
      setEditAuthMode('password');
      setEditUsername(auth?.username || '');
      setEditPassword('');
      setEditApiKey('');
    }

    setActiveModal('edit-credentials');
  };

  const handleSaveCredentials = async () => {
    if (!editingServerId) {
      return;
    }

    if (!editServerName.trim()) {
      showToast('Please enter a server name', 'error');
      return;
    }

    if (!editServerUrl.trim()) {
      showToast('Please enter a server URL', 'error');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      updateServer(editingServerId, editServerName.trim(), editServerUrl.trim());

      if (editAuthMode === 'apikey' && editApiKey.trim()) {
        await useAuthStore.getState().loginWithApiKey(editingServerId, editApiKey.trim());
        showToast('Server and API key updated successfully');
      } else if (editAuthMode === 'password' && editUsername.trim() && editPassword.trim()) {
        await useAuthStore.getState().login(editingServerId, editUsername.trim(), editPassword.trim());
        showToast('Server and credentials updated successfully');
      } else {
        showToast('Server updated successfully');
      }

      setActiveModal(null);
      setEditingServerId(null);
      setEditServerName('');
      setEditServerUrl('');
      setEditUsername('');
      setEditPassword('');
      setEditApiKey('');
      setEditAuthMode('password');
    } catch {
      showToast('Failed to update server. Please check your settings.', 'error');
    }
  };

  const renderOptionModal = (
    title: string,
    options: { value: string | number; label: string; description: string }[],
    currentValue: string | number,
    type: ModalType
  ) => (
    <Modal
      visible={activeModal === type}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => setActiveModal(null)}
    >
      <View style={styles.modalOverlayEnd}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        />
        <View style={styles.modalContainer}>
          <View style={styles.swipeIndicator}>
            <View style={styles.swipeHandle} />
          </View>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
          </View>

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
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.sectionCard}>
            <View style={styles.settingItem}>
              <Avatar username={username} avatarUrl={avatarUrl || undefined} size={48} />
              <View style={[styles.settingLeft, { marginLeft: theme.spacing.md }]}>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STREAMING</Text>
          <View style={styles.sectionCard}>
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
              onPress={() => setActiveModal('format-mobile')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Format (Mobile Data)</Text>
                <Text style={styles.settingValue}>{getFormatLabel(streamingFormatMobile)}</Text>
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

          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NETWORK</Text>
          <View style={styles.sectionCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Use POST Requests</Text>
                <Text style={styles.settingDescription}>
                  Use POST for API requests if server supports it
                </Text>
              </View>
              <Switch
                value={usePostRequests}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ usePostRequests: value });
                }}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DOWNLOADS</Text>
          <View style={styles.sectionCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>WiFi Only Downloads</Text>
                <Text style={styles.settingDescription}>Only download content when connected to WiFi</Text>
              </View>
              <Switch
                value={wifiOnlyDownloads}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ wifiOnlyDownloads: value });
                }}
                trackColor={{
                  false: 'rgba(120, 120, 128, 0.16)',
                  true: theme.colors.accent
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="rgba(120, 120, 128, 0.16)"
              />
            </View>

            <TouchableOpacity
              style={[styles.settingItem, styles.borderTop]}
              onPress={() => setActiveModal('max-downloads')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Max Concurrent Downloads</Text>
                <Text style={styles.settingValue}>{maxConcurrentDownloads}</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STORAGE</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setActiveModal('storage-limit')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Download Storage Limit</Text>
                <Text style={styles.settingValue}>{(storageLimit / 1024).toFixed(1)} GB</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

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

            <View style={[styles.settingItem, styles.borderTop]}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Gapless Playback</Text>
                <Text style={styles.settingDescription}>Seamless transitions between tracks</Text>
              </View>
              <Switch
                value={gaplessPlayback}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ gaplessPlayback: value });
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
                <Text style={styles.settingLabel}>Auto-Extend Queue</Text>
                <Text style={styles.settingDescription}>Add similar songs when queue is near end</Text>
              </View>
              <Switch
                value={autoExtendQueue}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ autoExtendQueue: value });
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
                <Text style={styles.settingLabel}>Include Share Message</Text>
                <Text style={styles.settingDescription}>Add &quot;Check out X&quot; when sharing content</Text>
              </View>
              <Switch
                value={includeShareMessage}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ includeShareMessage: value });
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RADIO</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setActiveModal('instant-mix')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Instant Mix Size</Text>
                <Text style={styles.settingDescription}>Number of similar tracks in instant mix</Text>
                <Text style={styles.settingValue}>{instantMixSize} tracks</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INTERFACE</Text>
          <View style={styles.sectionCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Auto-Focus Search</Text>
                <Text style={styles.settingDescription}>Focus search bar when opening search screen</Text>
              </View>
              <Switch
                value={autoFocusSearch}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ autoFocusSearch: value });
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APPEARANCE</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setActiveModal('theme')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Theme</Text>
                <Text style={styles.settingValue}>
                  {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.borderTop]}
              onPress={() => setActiveModal('background-style')}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Background Style</Text>
                <Text style={styles.settingDescription}>Player and detail screen backgrounds</Text>
                <Text style={styles.settingValue}>
                  {backgroundStyle === 'blur' ? 'Blurred Cover' : 
                   backgroundStyle === 'gradient' ? 'Dynamic Gradient' :
                   backgroundStyle === 'dynamicColor' ? 'Dynamic Color' : 'Solid Color'}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.sectionCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Version</Text>
                <Text style={styles.settingValue}>{APP_VERSION}</Text>
              </View>
            </View>
          </View>
        </View>

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

      {renderOptionModal('Streaming Quality (WiFi)', qualityOptions, streamingQualityWiFi, 'quality-wifi')}
      {renderOptionModal('Streaming Quality (Mobile)', qualityOptions, streamingQualityMobile, 'quality-mobile')}
      {renderOptionModal('Streaming Format (WiFi)', formatOptions, streamingFormatWiFi, 'format-wifi')}
      {renderOptionModal('Streaming Format (Mobile)', formatOptions, streamingFormatMobile, 'format-mobile')}
      {renderOptionModal('Lyrics Font Size', fontSizeOptions, lyricsFontSize, 'lyrics-font')}
      {renderOptionModal('Max Concurrent Downloads', maxDownloadsOptions, maxConcurrentDownloads, 'max-downloads')}
      {renderOptionModal('Instant Mix Size', instantMixOptions, instantMixSize, 'instant-mix')}
      {renderOptionModal('Download Storage Limit', storageLimitOptions, storageLimit, 'storage-limit')}
      {renderOptionModal('Theme', themeOptions, themeMode, 'theme')}
      {renderOptionModal('Background Style', backgroundStyleOptions, backgroundStyle, 'background-style')}

      <ConfirmModal
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onClose={() => setConfirmDialog({ ...confirmDialog, visible: false })}
        onConfirm={confirmDialog.onConfirm}
        confirmText={confirmDialog.confirmText}
        destructive={confirmDialog.destructive}
      />

      <Modal
        visible={activeModal === 'servers'}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlayEnd}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setActiveModal(null)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.swipeIndicator}>
              <View style={styles.swipeHandle} />
            </View>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Servers</Text>
              <TouchableOpacity onPress={handleAddServer} style={styles.addButton}>
                <Plus size={20} color={theme.colors.accent} strokeWidth={2} />
              </TouchableOpacity>
            </View>

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
                    <View style={styles.serverActions}>
                      <TouchableOpacity
                        style={styles.serverActionButton}
                        onPress={() => handleEditCredentials(server.id)}
                      >
                        <Edit3 size={18} color={theme.colors.text.secondary} strokeWidth={2} />
                      </TouchableOpacity>
                      {servers.length > 1 && (
                        <TouchableOpacity
                          style={styles.serverActionButton}
                          onPress={() => handleRemoveServer(server.id, server.name)}
                        >
                          <Trash2 size={18} color={theme.colors.error} strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeModal === 'edit-credentials'}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setActiveModal(null)}
          />
          <View style={styles.editCredentialsContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Server</Text>
            </View>

            <ScrollView style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md }}>
              <Text style={styles.inputLabel}>Server Name</Text>
              <TextInput
                style={styles.input}
                value={editServerName}
                onChangeText={setEditServerName}
                placeholder="My Music Server"
                placeholderTextColor={theme.colors.text.tertiary}
                autoCapitalize="words"
                autoCorrect={false}
              />

              <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Server URL</Text>
              <TextInput
                style={styles.input}
                value={editServerUrl}
                onChangeText={setEditServerUrl}
                placeholder="https://music.example.com"
                placeholderTextColor={theme.colors.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <Text style={[styles.inputLabel, { marginTop: theme.spacing.lg }]}>Authentication</Text>
              <View style={styles.authModeToggle}>
                <TouchableOpacity
                  style={[styles.authToggleButton, editAuthMode === 'password' && styles.authToggleButtonActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditAuthMode('password');
                  }}
                >
                  <Text style={[styles.authToggleText, editAuthMode === 'password' && styles.authToggleTextActive]}>
                    Password
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.authToggleButton, editAuthMode === 'apikey' && styles.authToggleButtonActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditAuthMode('apikey');
                  }}
                >
                  <Text style={[styles.authToggleText, editAuthMode === 'apikey' && styles.authToggleTextActive]}>
                    API Key
                  </Text>
                </TouchableOpacity>
              </View>

              {editAuthMode === 'password' ? (
                <>
                  <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Username</Text>
                  <TextInput
                    style={styles.input}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    placeholder="Username (optional)"
                    placeholderTextColor={theme.colors.text.tertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>Password</Text>
                  <TextInput
                    style={styles.input}
                    value={editPassword}
                    onChangeText={setEditPassword}
                    placeholder="New password (optional)"
                    placeholderTextColor={theme.colors.text.tertiary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.inputLabel, { marginTop: theme.spacing.md }]}>API Key</Text>
                  <TextInput
                    style={styles.input}
                    value={editApiKey}
                    onChangeText={setEditApiKey}
                    placeholder="Enter API key (optional)"
                    placeholderTextColor={theme.colors.text.tertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveCredentials}
                activeOpacity={0.7}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};
