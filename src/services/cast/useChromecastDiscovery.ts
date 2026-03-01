/**
 * Dino Music App - Chromecast Discovery Hook
 * Hook for discovering Chromecast devices
 */

import { useEffect, useCallback, useState } from 'react';
import GoogleCast, { useDevices } from 'react-native-google-cast';
import { useRemotePlaybackStore } from '../../stores/remotePlaybackStore';

export function useChromecastDiscovery() {
  const devices = useDevices();
  const { addChromecastDevice, clearChromecastDevices } = useRemotePlaybackStore();
  const [isScanning, setIsScanning] = useState(false);

  const isAvailable = !!GoogleCast;

  useEffect(() => {
    clearChromecastDevices();
    devices.forEach((device) => {
      addChromecastDevice({
        id: device.deviceId,
        name: device.friendlyName || 'Chromecast',
        type: 'chromecast',
      });
    });
  }, [devices, addChromecastDevice, clearChromecastDevices]);

  const startDiscovery = useCallback(() => {
    if (!GoogleCast) return;
    
    setIsScanning(true);
    try {
      const discoveryManager = GoogleCast.getDiscoveryManager();
      discoveryManager.startDiscovery();
    } catch (error) {
      console.error('[ChromecastDiscovery] Failed to start discovery:', error);
    }
  }, []);

  const refresh = useCallback(() => {
    if (!GoogleCast) return;
    
    setIsScanning(true);
    try {
      const discoveryManager = GoogleCast.getDiscoveryManager();
      discoveryManager.stopDiscovery();
      discoveryManager.startDiscovery();
    } catch (error) {
      console.error('[ChromecastDiscovery] Failed to refresh:', error);
    }
  }, []);

  useEffect(() => {
    if (isAvailable) {
      startDiscovery();
    }
  }, [isAvailable, startDiscovery]);

  useEffect(() => {
    if (devices.length > 0) {
      setIsScanning(false);
    }
  }, [devices]);

  return { devices, refresh, isAvailable, isScanning };
}
