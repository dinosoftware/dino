/**
 * Dino Music App - Remote Playback Store
 * Unified state management for Chromecast and UPNP/DLNA devices
 */

import { create } from 'zustand';

export type DeviceType = 'chromecast' | 'upnp';
export type PlayerType = 'local' | 'chromecast' | 'upnp';

export interface RemoteDevice {
  id: string;
  name: string;
  type: DeviceType;
  host?: string;
  port?: number;
  serviceUrl?: string;
  controlUrl?: string;
  manufacturer?: string;
}

interface RemotePlaybackStore {
  chromecastDevices: RemoteDevice[];
  upnpDevices: RemoteDevice[];
  selectedDevice: RemoteDevice | null;
  activePlayerType: PlayerType;
  isScanning: boolean;
  connectionError: string | null;

  setChromecastDevices: (devices: RemoteDevice[]) => void;
  addChromecastDevice: (device: RemoteDevice) => void;
  clearChromecastDevices: () => void;
  setUpnpDevices: (devices: RemoteDevice[]) => void;
  addUpnpDevice: (device: RemoteDevice) => void;
  clearUpnpDevices: () => void;
  selectDevice: (device: RemoteDevice | null) => void;
  setActivePlayerType: (type: PlayerType) => void;
  setScanning: (scanning: boolean) => void;
  setConnectionError: (error: string | null) => void;
  clearAllDevices: () => void;
}

export const useRemotePlaybackStore = create<RemotePlaybackStore>((set, get) => ({
  chromecastDevices: [],
  upnpDevices: [],
  selectedDevice: null,
  activePlayerType: 'local',
  isScanning: false,
  connectionError: null,

  setChromecastDevices: (devices) => {
    set({ chromecastDevices: devices });
  },

  addChromecastDevice: (device) => {
    set((state) => {
      if (state.chromecastDevices.some((d) => d.id === device.id)) {
        return state;
      }
      return { chromecastDevices: [...state.chromecastDevices, device] };
    });
  },

  clearChromecastDevices: () => {
    set({ chromecastDevices: [] });
  },

  setUpnpDevices: (devices) => {
    set({ upnpDevices: devices });
  },

  addUpnpDevice: (device) => {
    set((state) => {
      if (state.upnpDevices.some((d) => d.id === device.id)) {
        return state;
      }
      return { upnpDevices: [...state.upnpDevices, device] };
    });
  },

  clearUpnpDevices: () => {
    set({ upnpDevices: [] });
  },

  selectDevice: (device) => {
    set({ selectedDevice: device });
  },

  setActivePlayerType: (type) => {
    set({ activePlayerType: type });
  },

  setScanning: (scanning) => {
    set({ isScanning: scanning });
  },

  setConnectionError: (error) => {
    set({ connectionError: error });
  },

  clearAllDevices: () => {
    set({
      chromecastDevices: [],
      upnpDevices: [],
      selectedDevice: null,
      activePlayerType: 'local',
      connectionError: null,
    });
  },
}));
