/**
 * Dino Music App - Streaming Settings Hook
 * Returns active streaming quality and format based on network type
 */

import { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useNetworkType } from './useNetworkType';

type StreamingQuality = '0' | '64' | '96' | '128' | '160' | '192' | '256' | '320';
type StreamingFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'original';

export interface ActiveStreamingSettings {
  quality: StreamingQuality;
  format: StreamingFormat;
  networkType: 'wifi' | 'mobile' | 'unknown';
  displayText: string; // e.g., "MAX" or "320 kbps MP3"
}

export const useStreamingSettings = (): ActiveStreamingSettings => {
  const { networkType } = useNetworkType();
  const {
    streamingQualityWiFi,
    streamingQualityMobile,
    streamingFormatWiFi,
    streamingFormatMobile,
  } = useSettingsStore();

  const [settings, setSettings] = useState<ActiveStreamingSettings>({
    quality: '0',
    format: 'original',
    networkType: 'unknown',
    displayText: 'MAX',
  });

  useEffect(() => {
    // Determine quality and format based on network type
    let quality: StreamingQuality;
    let format: StreamingFormat;
    
    if (networkType === 'wifi') {
      quality = streamingQualityWiFi;
      format = streamingFormatWiFi;
    } else if (networkType === 'mobile') {
      quality = streamingQualityMobile;
      format = streamingFormatMobile;
    } else {
      // Default to mobile quality for unknown network
      quality = streamingQualityMobile;
      format = streamingFormatMobile;
    }

    // Generate display text (like TIDAL)
    let displayText: string;
    if (quality === '0' || format === 'original') {
      displayText = 'MAX'; // Original quality
    } else {
      const formatUpper = format.toUpperCase();
      displayText = `${quality} kbps ${formatUpper}`;
    }

    setSettings({
      quality,
      format,
      networkType,
      displayText,
    });
  }, [networkType, streamingQualityWiFi, streamingQualityMobile, streamingFormatWiFi, streamingFormatMobile]);

  return settings;
};
