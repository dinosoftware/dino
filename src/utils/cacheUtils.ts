/**
 * Dino Music App - Cache Utilities
 * Manages cache usage tracking and clearing for various cache types
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export interface CacheUsage {
  asyncStorage: number;
  downloads: number;
  images: number;
  audioStream: number;
  total: number;
}

export interface CacheBreakdown {
  name: string;
  usage: number;
  clearable: boolean;
  description: string;
}

async function getAsyncStorageUsage(): Promise<number> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const allItems = await AsyncStorage.multiGet(allKeys);
    
    let totalSize = 0;
    for (const [key, value] of allItems) {
      if (value) {
        totalSize += (key.length + value.length) * 2;
      }
    }
    
    return totalSize / (1024 * 1024);
  } catch (error) {
    console.error('[CacheUtils] Failed to calculate AsyncStorage usage:', error);
    return 0;
  }
}

async function getImageCacheUsage(): Promise<number> {
  try {
    if (!FileSystem.cacheDirectory) {
      return 0;
    }
    
    let totalSize = 0;
    
    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists || !dirInfo.isDirectory) {
          return;
        }
        
        const files = await FileSystem.readDirectoryAsync(dir);
        for (const file of files) {
          const filePath = `${dir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists) {
            if (fileInfo.isDirectory) {
              await scanDirectory(filePath);
            } else {
              if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || 
                  file.endsWith('.webp') || file.endsWith('.gif') || file.includes('ImageCache')) {
                totalSize += fileInfo.size || 0;
              }
            }
          }
        }
      } catch {
        // Skip directories we can't access
      }
    };
    
    await scanDirectory(FileSystem.cacheDirectory);
    
    return totalSize / (1024 * 1024);
  } catch (error) {
    console.error('[CacheUtils] Failed to calculate image cache usage:', error);
    return 0;
  }
}

async function getAudioStreamUsage(): Promise<number> {
  return 0;
}

export async function getCacheUsage(): Promise<CacheUsage> {
  const [asyncStorageUsage, imageCacheUsage, audioStreamUsage] = await Promise.all([
    getAsyncStorageUsage(),
    getImageCacheUsage(),
    getAudioStreamUsage(),
  ]);
  
  const total = asyncStorageUsage + imageCacheUsage + audioStreamUsage;
  
  return {
    asyncStorage: asyncStorageUsage,
    downloads: 0,
    images: imageCacheUsage,
    audioStream: audioStreamUsage,
    total,
  };
}

export async function getCacheBreakdown(): Promise<CacheBreakdown[]> {
  const usage = await getCacheUsage();
  
  return [
    {
      name: 'Images',
      usage: usage.images,
      clearable: true,
      description: 'Cached album art and cover images',
    },
    {
      name: 'App Data',
      usage: usage.asyncStorage,
      clearable: false,
      description: 'Settings, preferences, and metadata',
    },
    {
      name: 'Audio Stream Cache',
      usage: usage.audioStream,
      clearable: false,
      description: 'Streaming cache (managed automatically)',
    },
  ];
}

export async function clearImageCache(): Promise<void> {
  try {
    if (!FileSystem.cacheDirectory) {
      return;
    }
    
    const clearDirectory = async (dir: string): Promise<void> => {
      try {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists || !dirInfo.isDirectory) {
          return;
        }
        
        const files = await FileSystem.readDirectoryAsync(dir);
        for (const file of files) {
          const filePath = `${dir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists) {
            if (fileInfo.isDirectory) {
              await clearDirectory(filePath);
              await FileSystem.deleteAsync(filePath, { idempotent: true });
            } else if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || 
                       file.endsWith('.webp') || file.endsWith('.gif') || file.includes('ImageCache')) {
              await FileSystem.deleteAsync(filePath, { idempotent: true });
            }
          }
        }
      } catch (e) {
        console.log(`[CacheUtils] Skipping ${dir}:`, e);
      }
    };
    
    await clearDirectory(FileSystem.cacheDirectory);
    console.log('[CacheUtils] Image cache cleared');
  } catch (error) {
    console.error('[CacheUtils] Failed to clear image cache:', error);
    throw error;
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    await clearImageCache();
    console.log('[CacheUtils] All caches cleared (downloads preserved)');
  } catch (error) {
    console.error('[CacheUtils] Failed to clear all caches:', error);
    throw error;
  }
}

export function formatCacheSize(sizeMB: number): string {
  if (sizeMB < 1) {
    return `${(sizeMB * 1024).toFixed(1)} KB`;
  } else if (sizeMB < 1024) {
    return `${sizeMB.toFixed(1)} MB`;
  } else {
    return `${(sizeMB / 1024).toFixed(2)} GB`;
  }
}
