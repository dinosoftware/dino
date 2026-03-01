/**
 * Dino Music App - UPNP Discovery Hook
 * Hook for discovering UPNP/DLNA devices
 */

import { useState, useCallback } from 'react';
import { discoverUpnpDevices } from './UpnpDiscovery';
import { useRemotePlaybackStore } from '../../stores/remotePlaybackStore';

export function useUpnpDiscovery() {
  const { setUpnpDevices, addUpnpDevice } = useRemotePlaybackStore();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    setUpnpDevices([]);

    try {
      const devices = await discoverUpnpDevices(5000, (device) => {
        addUpnpDevice(device);
      });
      setUpnpDevices(devices);
      console.log('[useUpnpDiscovery] Found', devices.length, 'devices');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useUpnpDiscovery] Discovery error:', err);
      setError(errorMessage);
    } finally {
      setIsScanning(false);
    }
  }, [setUpnpDevices, addUpnpDevice]);

  return { scan, isScanning, error };
}
