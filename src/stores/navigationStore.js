"use strict";
/**
 * Dino Music App - Navigation Store
 * Simple navigation state management
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
exports.useNavigationStore = void 0;
var zustand_1 = require("zustand");
exports.useNavigationStore = (0, zustand_1.create)(function (set, get) { return ({
    currentScreen: { name: 'home' },
    screenStack: [],
    showFullPlayer: false,
    playerOverlay: 'none',
    closeOverlayCallback: null,
    navigate: function (screen) {
        return set(function (state) { return ({
            screenStack: __spreadArray(__spreadArray([], state.screenStack, true), [state.currentScreen], false),
            currentScreen: screen,
        }); });
    },
    goBack: function () {
        return set(function (state) {
            if (state.screenStack.length === 0)
                return state;
            var newStack = __spreadArray([], state.screenStack, true);
            var previousScreen = newStack.pop();
            return {
                screenStack: newStack,
                currentScreen: previousScreen,
            };
        });
    },
    canGoBack: function () { return get().screenStack.length > 0; },
    setShowFullPlayer: function (show) { return set({ showFullPlayer: show }); },
    closeFullPlayer: function () { return set({ showFullPlayer: false, playerOverlay: 'none' }); },
    setPlayerOverlay: function (overlay) { return set({ playerOverlay: overlay }); },
    isPlayerOverlayOpen: function () { return get().playerOverlay !== 'none'; },
    setCloseOverlayCallback: function (callback) { return set({ closeOverlayCallback: callback }); },
    closePlayerOverlay: function () {
        var closeOverlayCallback = get().closeOverlayCallback;
        if (closeOverlayCallback) {
            closeOverlayCallback();
        }
    },
}); });
