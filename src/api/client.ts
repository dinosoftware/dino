/**
 * Dino Music App - API Client
 * Axios instance with interceptors for OpenSubsonic API
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import * as Crypto from 'expo-crypto';
import { API_FORMAT, API_VERSION, CLIENT_NAME, NETWORK_CONFIG } from '../config/constants';
import { SubsonicResponse } from './opensubsonic/types';

// Type for server credentials
export interface ServerCredentials {
  username: string;
  password: string;
  serverUrl: string;
}

class APIClient {
  private axiosInstance: AxiosInstance;
  private credentials: ServerCredentials | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: NETWORK_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set credentials for API requests
   */
  setCredentials(credentials: ServerCredentials) {
    this.credentials = credentials;
    this.axiosInstance.defaults.baseURL = `${credentials.serverUrl}/rest`;
  }

  /**
   * Clear credentials
   */
  clearCredentials() {
    this.credentials = null;
    this.axiosInstance.defaults.baseURL = undefined;
  }

  /**
   * Check if client has credentials
   */
  hasCredentials(): boolean {
    return this.credentials !== null;
  }

  /**
   * Generate authentication parameters (salt + token)
   */
  private async generateAuthParams() {
    if (!this.credentials) {
      throw new Error('No credentials set');
    }

    // Generate random salt
    const salt = Math.random().toString(36).substring(2, 15);

    // Generate token (MD5 hash of password + salt)
    const token = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.MD5,
      this.credentials.password + salt
    );

    return {
      u: this.credentials.username,
      s: salt,
      t: token,
      v: API_VERSION,
      c: CLIENT_NAME,
      f: API_FORMAT,
    };
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors() {
    // Request interceptor - add auth params
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        if (this.credentials) {
          const authParams = await this.generateAuthParams();
          config.params = {
            ...config.params,
            ...authParams,
          };
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle Subsonic errors
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const data = response.data as SubsonicResponse;

        // Check for Subsonic error
        if (data['subsonic-response'].status === 'failed') {
          const error = data['subsonic-response'].error;
          throw new Error(error?.message || 'Unknown API error');
        }

        return response;
      },
      (error: AxiosError) => {
        // Log full error for debugging
        console.error('API Client Error:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
        });

        // Handle network errors
        if (error.code === 'ECONNABORTED') {
          return Promise.reject(new Error('Request timed out - check server URL and network'));
        }

        if (!error.response) {
          // Network error - provide more details
          const errorMessage = `Network error: ${error.message}. Check if server is reachable at ${error.config?.baseURL || 'unknown URL'}`;
          console.error('Network Error Details:', errorMessage);
          return Promise.reject(new Error(errorMessage));
        }

        // Handle HTTP errors
        if (error.response.status === 401) {
          return Promise.reject(new Error('Authentication failed - check username/password'));
        }

        if (error.response.status === 404) {
          return Promise.reject(new Error('Not found - check server URL'));
        }

        if (error.response.status >= 500) {
          return Promise.reject(new Error(`Server error (${error.response.status})`));
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.get<SubsonicResponse<T>>(
      `${endpoint}.view`,
      {
        ...config,
        params,
        paramsSerializer: (params) => {
          // Custom serializer to handle arrays properly for OpenSubsonic
          // Arrays should be sent as repeated parameters, not with [] notation
          const parts: string[] = [];
          Object.keys(params).forEach(key => {
            const value = params[key];
            if (Array.isArray(value)) {
              // For arrays, repeat the parameter name for each value
              value.forEach(v => {
                parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
              });
            } else if (value !== undefined && value !== null) {
              parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
          });
          return parts.join('&');
        },
      }
    );
    return response.data['subsonic-response'] as T;
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.post<SubsonicResponse<T>>(
      `${endpoint}.view`,
      data,
      config
    );
    return response.data['subsonic-response'] as T;
  }

  /**
   * Build stream URL with auth params
   */
  async buildStreamUrl(trackId: string, maxBitRate?: string, format?: string): Promise<string> {
    if (!this.credentials) {
      throw new Error('No credentials set');
    }

    console.log('[API Client] buildStreamUrl called with:', {
      trackId,
      maxBitRate,
      format,
      willAddMaxBitRate: !!(maxBitRate && maxBitRate !== '0'),
      willAddFormat: !!format,
    });

    const authParams = await this.generateAuthParams();
    const params = new URLSearchParams({
      id: trackId,
      ...authParams,
      ...(maxBitRate && maxBitRate !== '0' && { maxBitRate }),
      ...(format && { format }),
    });

    const url = `${this.credentials.serverUrl}/rest/stream.view?${params.toString()}`;
    console.log('[API Client] Built stream URL:', url);
    
    return url;
  }

  /**
   * Build download URL with auth params (original file, no transcoding)
   */
  async buildDownloadUrl(trackId: string): Promise<string> {
    if (!this.credentials) {
      throw new Error('No credentials set');
    }

    const authParams = await this.generateAuthParams();
    const params = new URLSearchParams({
      id: trackId,
      ...authParams,
    });

    return `${this.credentials.serverUrl}/rest/download.view?${params.toString()}`;
  }

  /**
   * Build cover art URL with auth params
   */
  async buildCoverArtUrl(coverArtId: string, size?: number): Promise<string> {
    if (!this.credentials) {
      throw new Error('No credentials set');
    }

    const authParams = await this.generateAuthParams();
    const params = new URLSearchParams({
      id: coverArtId,
      ...authParams,
      ...(size && { size: size.toString() }),
    });

    return `${this.credentials.serverUrl}/rest/getCoverArt.view?${params.toString()}`;
  }

  /**
   * Ping server to check if it's reachable and validate credentials
   */
  async ping(serverUrl: string, username?: string, password?: string): Promise<boolean> {
    try {
      // Always send auth params - use dummy values if not provided
      const user = username || 'guest';
      const pass = password || 'guest';

      const salt = Math.random().toString(36).substring(2, 15);
      const token = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.MD5,
        pass + salt
      );

      const params: any = {
        v: API_VERSION,
        c: CLIENT_NAME,
        f: API_FORMAT,
        u: user,
        s: salt,
        t: token,
      };

      const response = await axios.get(`${serverUrl}/rest/ping.view`, {
        params,
        timeout: NETWORK_CONFIG.TIMEOUT,
      });

      const data = response.data as SubsonicResponse;

      // Check if the response is valid Subsonic format
      if (!data['subsonic-response']) {
        console.log('[API] Ping failed: Invalid response format');
        return false;
      }

      // IMPORTANT: If we get a valid Subsonic response (even if auth failed),
      // the server is reachable and is a valid OpenSubsonic server!
      // A 'failed' status just means wrong/missing credentials, which is EXPECTED
      // when testing server reachability with dummy credentials.
      console.log('[API] Ping result:', data['subsonic-response'].status);

      // Server is reachable if we get any valid Subsonic response
      return true;
    } catch (error) {
      // Network error - server is not reachable
      console.error('[API] Ping error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;
