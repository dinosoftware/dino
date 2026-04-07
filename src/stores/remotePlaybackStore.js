"use strict";
/**
 * Dino Music App - Remote Playback Store
 * Unified state management for Chromecast and UPNP/DLNA devices
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRemotePlaybackStore = void 0;
var zustand_1 = require("zustand");
exports.useRemotePlaybackStore = (0, zustand_1.create)(function (set, get) { return ({
    chromecastDevices: [],
    upnpDevices: [],
    selectedDevice: null,
    activePlayerType: 'local',
    isScanning: false,
    connectionError: null,
    setChromecastDevices: function (devices) {
        set({ chromecastDevices: devices });
    },
    addChromecastDevice: function (device) {
        set(function (state) {
            if (state.chromecastDevices.some(function (d) { return d.id === device.id; })) {
                return state;
            }
            return { chromecastDevices: __spreadArray(__spreadArray([], state.chromecastDevices, true), [device], false) };
        });
    },
    clearChromecastDevices: function () {
        set({ chromecastDevices: [] });
    },
    setUpnpDevices: function (devices) {
        set({ upnpDevices: devices });
    },
    addUpnpDevice: function (device) {
        set(function (state) {
            if (state.upnpDevices.some(function (d) { return d.id === device.id; })) {
                return state;
            }
            return { upnpDevices: __spreadArray(__spreadArray([], state.upnpDevices, true), [device], false) };
        });
    },
    clearUpnpDevices: function () {
        set({ upnpDevices: [] });
    },
    selectDevice: function (device) {
        set({ selectedDevice: device });
    },
    setActivePlayerType: function (type) {
        set({ activePlayerType: type });
    },
    setScanning: function (scanning) {
        set({ isScanning: scanning });
    },
    setConnectionError: function (error) {
        set({ connectionError: error });
    },
    clearAllDevices: function () {
        set({
            chromecastDevices: [],
            upnpDevices: [],
            selectedDevice: null,
            activePlayerType: 'local',
            connectionError: null,
        });
    },
}); });
