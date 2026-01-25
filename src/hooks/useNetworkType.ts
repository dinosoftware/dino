/**
 * Dino Music App - Network Type Hook
 * Detects whether user is on WiFi or mobile data
 */

import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

export type NetworkType = 'wifi' | 'mobile' | 'unknown';

export const useNetworkType = () => {
  const [networkType, setNetworkType] = useState<NetworkType>('unknown');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkNetworkType = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        
        if (!isMounted) return;

        if (networkState.type === Network.NetworkStateType.WIFI) {
          setNetworkType('wifi');
        } else if (networkState.type === Network.NetworkStateType.CELLULAR) {
          setNetworkType('mobile');
        } else {
          setNetworkType('unknown');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('[useNetworkType] Failed to get network state:', error);
        if (isMounted) {
          setNetworkType('unknown');
          setIsLoading(false);
        }
      }
    };

    checkNetworkType();

    // Check network type every 10 seconds
    const interval = setInterval(checkNetworkType, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { networkType, isLoading };
};
