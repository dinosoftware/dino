/**
 * Dino Music App - Authentication API
 * OpenSubsonic authentication endpoints
 */

import { apiClient } from '../client';
import { PingResponse } from './types';

/**
 * Ping server to check connection and authentication
 */
export const ping = async (): Promise<PingResponse> => {
  return await apiClient.request<PingResponse>('ping');
};

/**
 * Test server connection with credentials
 */
export const testConnection = async (
  serverUrl: string,
  username: string,
  password: string
): Promise<boolean> => {
  return await apiClient.ping(serverUrl, username, password);
};
