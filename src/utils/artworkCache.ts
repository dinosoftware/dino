/**
 * Dino Music App - Artwork Cache
 * Disk-based artwork cache in Android cache directory.
 * Cleared when user clears app cache via Android settings.
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';

const ARTWORK_DIR = `${FileSystem.cacheDirectory}artwork/`;
const FILE_PROVIDER_AUTHORITY = 'sonic.dino.artwork.provider';

const pendingFetches = new Map<string, Promise<string | null>>();
const memoryCache = new Map<string, string | null>();

function toContentUri(fileUri: string): string {
  if (Platform.OS !== 'android') return fileUri;
  const path = fileUri.replace('file://', '');
  const relativePath = path.replace(/^\/data\/user\/[0-9]+\/[^/]+\/cache\//, '');
  return `content://${FILE_PROVIDER_AUTHORITY}/${relativePath}`;
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(ARTWORK_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ARTWORK_DIR, { intermediates: true });
  }
}

function cachePath(coverArtId: string, size?: number): string {
  const suffix = size ? `_${size}` : '';
  return `${ARTWORK_DIR}${coverArtId}${suffix}.jpg`;
}

export async function getCachedArtworkUri(
  coverArtId: string | null | undefined,
  size?: number
): Promise<string | null> {
  if (!coverArtId) return null;

  const key = size ? `${coverArtId}_${size}` : coverArtId;

  if (memoryCache.has(key)) return memoryCache.get(key)!;

  const existing = pendingFetches.get(key);
  if (existing) return existing;

  const filePath = cachePath(coverArtId, size);

  const info = await FileSystem.getInfoAsync(filePath);
  if (info.exists && info.size && info.size > 0) {
    const contentUri = toContentUri(filePath);
    memoryCache.set(key, contentUri);
    return contentUri;
  }

  const fetchPromise = fetchAndCache(coverArtId, size, filePath, key);
  pendingFetches.set(key, fetchPromise);
  try {
    const result = await fetchPromise;
    return result;
  } finally {
    pendingFetches.delete(key);
  }
}

export async function getArtworkUri(
  coverArtId: string | null | undefined,
  size?: number
): Promise<string | null> {
  if (!coverArtId) return null;

  const key = size ? `${coverArtId}_${size}` : coverArtId;

  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key)!;
    if (cached) return cached;
  }

  const filePath = cachePath(coverArtId, size);
  const info = await FileSystem.getInfoAsync(filePath);
  if (info.exists && info.size && info.size > 0) {
    const contentUri = toContentUri(filePath);
    memoryCache.set(key, contentUri);
    return contentUri;
  }

  getCachedArtworkUri(coverArtId, size).catch(() => {});

  return null;
}

async function fetchAndCache(
  coverArtId: string,
  size: number | undefined,
  path: string,
  key: string
): Promise<string | null> {
  try {
    await ensureDir();

    const url = await apiClient.buildCoverArtUrl(coverArtId, size);
    const downloadResult = await FileSystem.downloadAsync(url, path);

    if (downloadResult.uri) {
      const contentUri = toContentUri(downloadResult.uri);
      const verifyInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      console.log('[ArtworkCache] Cached:', coverArtId, '→', contentUri, 'exists:', verifyInfo.exists, 'size:', verifyInfo.size);
      memoryCache.set(key, contentUri);
      return contentUri;
    }

    memoryCache.set(key, null);
    return null;
  } catch (error) {
    console.error('[ArtworkCache] Failed to fetch:', coverArtId, error);
    memoryCache.set(key, null);
    return null;
  }
}

export async function clearArtworkCache(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(ARTWORK_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(ARTWORK_DIR, { idempotent: true });
    }
    memoryCache.clear();
    console.log('[ArtworkCache] Cleared');
  } catch (error) {
    console.error('[ArtworkCache] Failed to clear:', error);
  }
}

export async function getArtworkCacheSize(): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(ARTWORK_DIR);
    if (!info.exists || !info.isDirectory) return 0;

    let totalSize = 0;
    const files = await FileSystem.readDirectoryAsync(ARTWORK_DIR);
    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${ARTWORK_DIR}${file}`);
      if (fileInfo.exists && !fileInfo.isDirectory) {
        totalSize += fileInfo.size || 0;
      }
    }
    return totalSize / (1024 * 1024);
  } catch {
    return 0;
  }
}
