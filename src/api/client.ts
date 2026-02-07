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
  username?: string;
  token?: string;  // md5(password + salt)
  salt?: string;   // random salt
  apiKey?: string; // API key for apiKeyAuthentication extension
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
    console.log('[API Client] setCredentials called with:', {
      hasApiKey: !!credentials.apiKey,
      hasUsername: !!credentials.username,
      serverUrl: credentials.serverUrl,
    });
    this.credentials = credentials;
    this.axiosInstance.defaults.baseURL = `${credentials.serverUrl}/rest`;
    console.log('[API Client] baseURL set to:', this.axiosInstance.defaults.baseURL);
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
   * Generate authentication parameters (use stored token + salt or API key)
   */
  private generateAuthParams(): Record<string, string> {
    if (!this.credentials) {
      throw new Error('No credentials set');
    }

    const baseParams = {
      v: API_VERSION,
      c: CLIENT_NAME,
      f: API_FORMAT,
    };

    // Use API key if available
    if (this.credentials.apiKey) {
      return {
        ...baseParams,
        apiKey: this.credentials.apiKey,
      };
    }

    // Otherwise use token-based auth
    if (!this.credentials.username || !this.credentials.token || !this.credentials.salt) {
      throw new Error('Invalid credentials: missing username, token, or salt');
    }

    return {
      ...baseParams,
      u: this.credentials.username,
      s: this.credentials.salt,
      t: this.credentials.token,
    };
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors() {
    // Request interceptor - add auth params (for GET requests only)
    // POST requests handle auth params in the request body
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.credentials && config.method?.toLowerCase() === 'get') {
          const authParams = this.generateAuthParams();
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
   * Request (auto-selects GET or POST based on server capabilities)
   * Defaults to POST when server supports it (unless forceGet is true)
   * 
   * @param endpoint - API endpoint name (without .view)
   * @param params - Request parameters
   * @param options.forceGet - Force GET even if server supports POST (for media URLs)
   * @param options.config - Additional axios config
   */
  async request<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    options?: { forceGet?: boolean; config?: AxiosRequestConfig }
  ): Promise<T> {
    const serverSupportsPost = this.supportsFormPost();
    const clientForcesGet = options?.forceGet === true;
    
    // Check user setting for POST requests
    const { usePostRequests } = await import('../stores/settingsStore').then(m => m.useSettingsStore.getState());
    const userWantsPost = usePostRequests !== false; // Default to true if not set
    
    const usePost = serverSupportsPost && !clientForcesGet && userWantsPost;
    
    console.log('[API Client] 🔍 Request decision for:', endpoint, {
      serverSupportsFormPost: serverSupportsPost,
      userWantsPost,
      forceGet: clientForcesGet,
      willUsePost: usePost,
    });
    
    if (usePost) {
      console.log('[API Client] 📤 Using POST for:', endpoint);
      return this.post<T>(endpoint, params, options?.config);
    } else {
      console.log('[API Client] 📥 Using GET for:', endpoint, 
        !serverSupportsPost ? '(server does not support POST)' : 
        !userWantsPost ? '(user disabled POST)' : '(forceGet requested)');
      return this.get<T>(endpoint, params, options?.config);
    }
  }

  /**
   * Check if server supports formPost extension
   */
  private supportsFormPost(): boolean {
    // This will be set by the stores when capabilities are loaded
    // For now, return false - will be implemented via a setter method
    return (this as any)._supportsFormPost || false;
  }

  /**
   * Set server capabilities (called by serverStore after fetching extensions)
   */
  setServerCapabilities(capabilities: { supportsFormPost: boolean }) {
    (this as any)._supportsFormPost = capabilities.supportsFormPost;
    console.log('[API Client] Server capabilities updated:', capabilities);
  }

  /**
   * GET request
   * Note: Most endpoints should use request() which auto-selects POST when available
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    console.log('[API Client] 📥 GET request to:', endpoint, 'hasCredentials:', this.hasCredentials());
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
   * POST request (application/x-www-form-urlencoded)
   */
  async post<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    console.log('[API Client] POST request to:', endpoint, 'hasCredentials:', this.hasCredentials());
    
    // Merge auth params with request params
    const authParams = this.generateAuthParams();
    const allParams = { ...params, ...authParams };
    
    // Convert to URLSearchParams for application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    Object.keys(allParams).forEach(key => {
      const value = allParams[key];
      if (Array.isArray(value)) {
        // For arrays, repeat the parameter name for each value
        value.forEach(v => {
          formData.append(key, String(v));
        });
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    
    const response = await this.axiosInstance.post<SubsonicResponse<T>>(
      `${endpoint}.view`,
      formData.toString(),
      {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
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
   * Build avatar URL with auth params
   */
  async buildAvatarUrl(username?: string): Promise<string | null> {
    if (!this.credentials) {
      return null;
    }

    try {
      const authParams = await this.generateAuthParams();
      const params = new URLSearchParams({
        ...(username && { username }),
        ...authParams,
      });

      return `${this.credentials.serverUrl}/rest/getAvatar.view?${params.toString()}`;
    } catch (error) {
      console.log('[API Client] Failed to build avatar URL:', error);
      return null;
    }
  }

  /**
   * Ping server to check if it's reachable and validate credentials
   * Supports password, token, and API key authentication
   */
  async ping(serverUrl: string, username?: string, tokenOrPassword?: string, salt?: string, apiKey?: string): Promise<boolean> {
    try {
      let params: Record<string, string>;

      if (apiKey) {
        // API key authentication
        params = {
          v: API_VERSION,
          c: CLIENT_NAME,
          f: API_FORMAT,
          apiKey: apiKey,
        };
      } else {
        // Token or password authentication
        const user = username || 'guest';
        
        let authToken: string;
        let authSalt: string;
        
        if (salt) {
          // Token auth - use provided token and salt
          authToken = tokenOrPassword || 'guest';
          authSalt = salt;
        } else {
          // Password auth - generate token from password
          const pass = tokenOrPassword || 'guest';
          authSalt = Math.random().toString(36).substring(2, 15);
          authToken = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.MD5,
            pass + authSalt
          );
        }

        params = {
          v: API_VERSION,
          c: CLIENT_NAME,
          f: API_FORMAT,
          u: user,
          s: authSalt,
          t: authToken,
        };
      }

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

      const status = data['subsonic-response'].status;
      console.log('[API] Ping result:', status);

      // If credentials were provided, check auth status
      if (apiKey || (username && tokenOrPassword)) {
        // Authentication was attempted - must be 'ok' to succeed
        if (status === 'ok') {
          console.log('[API] Ping successful with valid credentials');
          return true;
        } else {
          console.log('[API] Ping failed: Invalid credentials');
          return false;
        }
      } else {
        // No credentials provided - just checking server reachability
        // Any valid Subsonic response means server is reachable
        console.log('[API] Ping successful: Server is reachable');
        return true;
      }
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
