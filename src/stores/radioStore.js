"use strict";
/**
 * Dino Music App - Radio Store
 * Radio/Instant Mix mode state management with Zustand
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRadioStore = void 0;
var zustand_1 = require("zustand");
exports.useRadioStore = (0, zustand_1.create)(function (set) { return ({
    isRadioMode: false,
    seedTrack: null,
    playedTrackIds: new Set(),
    startRadio: function (track) {
        set({
            isRadioMode: true,
            seedTrack: track,
            playedTrackIds: new Set([track.id]),
        });
    },
    stopRadio: function () {
        set({
            isRadioMode: false,
            seedTrack: null,
            playedTrackIds: new Set(),
        });
    },
    addPlayedTrack: function (trackId) {
        set(function (state) {
            var playedTrackIds = new Set(state.playedTrackIds);
            playedTrackIds.add(trackId);
            return { playedTrackIds: playedTrackIds };
        });
    },
    clearHistory: function () {
        set({ playedTrackIds: new Set() });
    },
}); });
