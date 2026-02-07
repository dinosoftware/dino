/**
 * Dino Music App - OpenSubsonic Extensions API
 * Check server capabilities and extensions
 */

import axios from 'axios';
import { apiClient } from '../client';
import { API_VERSION, CLIENT_NAME, API_FORMAT } from '../../config/constants';
import { SubsonicResponse } from './types';

export interface OpenSubsonicExtension {
  name: string;
  versions: number[];
}

export interface OpenSubsonicExtensionsResponse {
  status: 'ok' | 'failed';
  version: string;
  type?: string;
  serverVersion?: string;
  openSubsonic?: boolean;
  openSubsonicExtensions?: OpenSubsonicExtension[];
}

/**
 * Get OpenSubsonic extensions supported by the server
 * Returns null if server doesn't support OpenSubsonic extensions
 * 
 * NOTE: This endpoint MUST be publicly accessible (no auth required per OpenSubsonic spec)
 */
export const getOpenSubsonicExtensions = async (): Promise<OpenSubsonicExtension[] | null> => {
  try {
    console.log('[Extensions] 🔍 Fetching OpenSubsonic extensions...');
    
    // Get server URL from API client
    const baseURL = apiClient['axiosInstance'].defaults.baseURL;
    if (!baseURL) {
      console.error('[Extensions] ❌ No baseURL set in API client');
      return null;
    }
    
    console.log('[Extensions] 🔍 Server URL:', baseURL);
    
    // Make direct request WITHOUT auth params (publicly accessible endpoint)
    const url = `${baseURL}/getOpenSubsonicExtensions.view`;
    const params = {
      v: API_VERSION,
      c: CLIENT_NAME,
      f: API_FORMAT,
    };
    
    console.log('[Extensions] 🔍 Making unauthenticated request to:', url);
    console.log('[Extensions] 🔍 Params:', params);
    
    const response = await axios.get<SubsonicResponse>(url, { params });
    
    console.log('[Extensions] ✅ Response received:', response.status);
    console.log('[Extensions] 🔍 Full response data:', JSON.stringify(response.data, null, 2));
    
    const subsonicResponse = response.data['subsonic-response'];
    console.log('[Extensions] 🔍 Subsonic response:', subsonicResponse);
    
    if (subsonicResponse.status !== 'ok') {
      console.error('[Extensions] ❌ Server returned error:', subsonicResponse.error);
      return null;
    }
    
    const extensions = (subsonicResponse as any).openSubsonicExtensions || [];
    console.log('[Extensions] ✅ Parsed extensions count:', extensions.length);
    console.log('[Extensions] ✅ Extensions:', JSON.stringify(extensions, null, 2));
    
    return extensions;
  } catch (error) {
    console.log('[Extensions] ⚠️  Server does not support OpenSubsonic extensions:', error);
    if (axios.isAxiosError(error)) {
      console.log('[Extensions] ⚠️  Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    return null;
  }
};

/**
 * Check if server supports a specific extension
 */
export const hasExtension = (extensions: OpenSubsonicExtension[] | null, name: string): boolean => {
  if (!extensions) return false;
  return extensions.some(ext => ext.name === name);
};

/**
 * Check if server supports formPost extension
 */
export const supportsFormPost = (extensions: OpenSubsonicExtension[] | null): boolean => {
  return hasExtension(extensions, 'formPost');
};

/**
 * Check if server supports apiKeyAuthentication extension
 */
export const supportsApiKeyAuth = (extensions: OpenSubsonicExtension[] | null): boolean => {
  return hasExtension(extensions, 'apiKeyAuthentication');
};

/**
 * Check if server supports songLyrics extension
 */
export const supportsSongLyrics = (extensions: OpenSubsonicExtension[] | null): boolean => {
  return hasExtension(extensions, 'songLyrics');
};
