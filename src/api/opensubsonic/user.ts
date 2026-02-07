/**
 * Dino Music App - User API
 * User information and management
 */

import { apiClient } from '../client';
import { useAuthStore } from '../../stores/authStore';

export interface User {
  username: string;
  email?: string;
  scrobblingEnabled?: boolean;
  adminRole?: boolean;
  settingsRole?: boolean;
  downloadRole?: boolean;
  uploadRole?: boolean;
  playlistRole?: boolean;
  coverArtRole?: boolean;
  commentRole?: boolean;
  podcastRole?: boolean;
  streamRole?: boolean;
  jukeboxRole?: boolean;
  shareRole?: boolean;
  avatarLastChanged?: string;
}

export interface GetUserResponse {
  user: User;
}

export interface TokenInfoResponse {
  tokenInfo: {
    username: string;
  };
}

/**
 * Get current user information
 * For API key auth: uses tokenInfo to get username, then getUser
 * For password auth: uses username from credentials
 */
export const getCurrentUser = async (): Promise<User> => {
  const auth = useAuthStore.getState().getCurrentServerAuth();
  
  // If using API key, get username from tokenInfo first
  if (auth?.apiKey) {
    console.log('[User API] Using API key auth, fetching tokenInfo...');
    const tokenInfo = await apiClient.request<TokenInfoResponse>('tokenInfo');
    const username = tokenInfo.tokenInfo.username;
    console.log('[User API] Got username from tokenInfo:', username);
    
    // Now get full user info with username
    const response = await apiClient.request<GetUserResponse>('getUser', {
      username,
    });
    return response.user;
  }
  
  // For password auth, use username from credentials
  if (auth?.username) {
    console.log('[User API] Using password auth, username:', auth.username);
    const response = await apiClient.request<GetUserResponse>('getUser', {
      username: auth.username,
    });
    return response.user;
  }
  
  throw new Error('No authentication credentials available');
};

/**
 * Get user information by username (requires admin role)
 */
export const getUser = async (username: string): Promise<User> => {
  const response = await apiClient.request<GetUserResponse>('getUser', {
    username,
  });
  return response.user;
};
