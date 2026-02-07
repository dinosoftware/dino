/**
 * Dino Music App - System API
 * System operations like scanning library
 */

import { apiClient } from '../client';

/**
 * Start a scan of the media library
 */
export const startScan = async (): Promise<void> => {
  await apiClient.request('startScan');
};

/**
 * Get scan status
 */
export const getScanStatus = async (): Promise<{ scanning: boolean; count?: number }> => {
  const response = await apiClient.request<{ scanStatus: { scanning: boolean; count?: number } }>('getScanStatus');
  return response.scanStatus;
};
