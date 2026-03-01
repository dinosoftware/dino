/**
 * Dino Music App - Remote Devices Sheet
 * Unified bottom sheet for all device types (Chromecast and UPNP/DLNA)
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import * as Haptics from 'expo-haptics';
import { Cast, Speaker, Smartphone, RefreshCw, X } from 'lucide-react-native';
import { useRemotePlaybackStore, RemoteDevice } from '../../stores/remotePlaybackStore';
import { playerRouter } from '../../services/player/PlayerRouter';
import { castPlayerService } from '../../services/cast/CastPlayerService';
import { upnpPlayerService } from '../../services/upnp/UpnpPlayerService';
import { useChromecastDiscovery } from '../../services/cast/useChromecastDiscovery';
import { useUpnpDiscovery } from '../../services/upnp/useUpnpDiscovery';
import { FEATURE_FLAGS } from '../../config/constants';

interface RemoteDevicesSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const RemoteDevicesSheet: React.FC<RemoteDevicesSheetProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const {
    chromecastDevices,
    upnpDevices,
    selectedDevice,
    activePlayerType,
    connectionError,
  } = useRemotePlaybackStore();

  const { refresh: refreshChromecast, isAvailable: chromecastAvailable } = useChromecastDiscovery();
  const { scan: scanUpnp, isScanning: isScanningUpnp } = useUpnpDiscovery();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (visible) {
      // Only scan if no devices found yet
      if (FEATURE_FLAGS.ENABLE_UPNP && upnpDevices.length === 0) {
        scanUpnp();
      }
    }
  }, [visible, scanUpnp, upnpDevices.length]);

  useEffect(() => {
    playerRouter.registerPlayer('chromecast', castPlayerService);
    playerRouter.registerPlayer('upnp', upnpPlayerService);
    castPlayerService.initialize().catch(() => {});
    upnpPlayerService.initialize().catch(() => {});
  }, []);

  const handleSelectDevice = useCallback(async (device: RemoteDevice | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsConnecting(true);

    try {
      if (device === null) {
        await playerRouter.disconnectFromDevice();
      } else {
        await playerRouter.connectToDevice(device);
      }
      onClose();
    } catch (error) {
      console.error('[RemoteDevicesSheet] Connection error:', error);
      useRemotePlaybackStore.getState().selectDevice(null);
      useRemotePlaybackStore.getState().setActivePlayerType('local');
      useRemotePlaybackStore.getState().setConnectionError(
        error instanceof Error ? error.message : 'Connection failed'
      );
    } finally {
      setIsConnecting(false);
    }
  }, [onClose]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (FEATURE_FLAGS.ENABLE_CHROMECAST && chromecastAvailable) {
      refreshChromecast();
    }
    if (FEATURE_FLAGS.ENABLE_UPNP) {
      scanUpnp();
    }
  }, [refreshChromecast, scanUpnp, chromecastAvailable]);

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    container: {
      backgroundColor: theme.colors.background.card,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingBottom: theme.spacing.xxl,
      maxHeight: '70%',
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
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    iconButton: {
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.background.elevated,
    },
    content: {
      padding: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    deviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.background.elevated,
    },
    deviceItemSelected: {
      backgroundColor: theme.colors.accent,
    },
    deviceIcon: {
      marginRight: theme.spacing.md,
    },
    deviceInfo: {
      flex: 1,
    },
    deviceName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
    },
    deviceNameSelected: {
      color: theme.colors.text.inverse,
    },
    deviceMeta: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      marginTop: 2,
    },
    deviceMetaSelected: {
      color: theme.colors.text.inverse,
      opacity: 0.8,
    },
    connectingIndicator: {
      marginLeft: theme.spacing.sm,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.error,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      paddingVertical: theme.spacing.lg,
    },
    scanningIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    scanningText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
    },
  }), [theme]);

  const renderDevice = useCallback((device: RemoteDevice) => {
    const isSelected = selectedDevice?.id === device.id;
    const Icon = device.type === 'chromecast' ? Cast : Speaker;

    return (
      <TouchableOpacity
        key={device.id}
        style={[styles.deviceItem, isSelected && styles.deviceItemSelected]}
        onPress={() => handleSelectDevice(device)}
        activeOpacity={0.7}
        disabled={isConnecting}
      >
        <Icon
          size={24}
          color={isSelected ? theme.colors.text.inverse : theme.colors.text.primary}
          style={styles.deviceIcon}
        />
        <View style={styles.deviceInfo}>
          <Text style={[styles.deviceName, isSelected && styles.deviceNameSelected]}>
            {device.name}
          </Text>
          {device.manufacturer && (
            <Text style={[styles.deviceMeta, isSelected && styles.deviceMetaSelected]}>
              {device.manufacturer}
            </Text>
          )}
        </View>
        {isConnecting && isSelected && (
          <ActivityIndicator size="small" color={theme.colors.text.inverse} />
        )}
      </TouchableOpacity>
    );
  }, [selectedDevice, isConnecting, handleSelectDevice, styles, theme]);

  const localItem = (
    <TouchableOpacity
      style={[styles.deviceItem, activePlayerType === 'local' && styles.deviceItemSelected]}
      onPress={() => handleSelectDevice(null)}
      activeOpacity={0.7}
      disabled={isConnecting}
    >
      <Smartphone
        size={24}
        color={activePlayerType === 'local' ? theme.colors.text.inverse : theme.colors.text.primary}
        style={styles.deviceIcon}
      />
      <View style={styles.deviceInfo}>
        <Text style={[styles.deviceName, activePlayerType === 'local' && styles.deviceNameSelected]}>
          This device
        </Text>
        <Text style={[styles.deviceMeta, activePlayerType === 'local' && styles.deviceMetaSelected]}>
          Play on phone
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Cast to Device</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.iconButton} onPress={handleRefresh}>
                <RefreshCw size={20} color={theme.colors.text.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={onClose}>
                <X size={20} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.content}>
            {localItem}

            {FEATURE_FLAGS.ENABLE_CHROMECAST && chromecastDevices.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Cast size={16} color={theme.colors.text.secondary} />
                  <Text style={styles.sectionTitle}>Chromecast</Text>
                </View>
                {chromecastDevices.map(renderDevice)}
              </View>
            )}

            {FEATURE_FLAGS.ENABLE_UPNP && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Speaker size={16} color={theme.colors.text.secondary} />
                  <Text style={styles.sectionTitle}>UPNP / DLNA</Text>
                </View>
                {isScanningUpnp ? (
                  <View style={styles.scanningIndicator}>
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                    <Text style={styles.scanningText}>Scanning for devices...</Text>
                  </View>
                ) : upnpDevices.length > 0 ? (
                  upnpDevices.map(renderDevice)
                ) : (
                  <Text style={styles.emptyText}>No devices found</Text>
                )}
              </View>
            )}

            {connectionError && (
              <Text style={styles.errorText}>{connectionError}</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
