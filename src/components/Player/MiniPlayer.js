"use strict";
/**
 * Dino Music App - Mini Player
 * TIDAL and shadcn/ui-inspired mini player with dynamic theming
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiniPlayer = void 0;
var react_1 = require("react");
var react_native_1 = require("react-native");
var Haptics = require("expo-haptics");
var usePlayer_1 = require("../../hooks/usePlayer");
var api_1 = require("../../hooks/api");
var useAlbumColors_1 = require("../../hooks/useAlbumColors");
var useTheme_1 = require("../../hooks/useTheme");
var remotePlaybackStore_1 = require("../../stores/remotePlaybackStore");
var MarqueeText_1 = require("../common/MarqueeText");
var MiniPlayer = function (_a) {
    var onPress = _a.onPress;
    var theme = (0, useTheme_1.useTheme)();
    var _b = (0, usePlayer_1.usePlayer)(), currentTrack = _b.currentTrack, isPlaying = _b.isPlaying, playbackState = _b.playbackState, togglePlayPause = _b.togglePlayPause, skipToNext = _b.skipToNext, progress = _b.progress;
    var coverArtUrl = (0, api_1.useCoverArt)(currentTrack === null || currentTrack === void 0 ? void 0 : currentTrack.coverArt, 200).data;
    var albumColors = (0, useAlbumColors_1.useAlbumColors)(coverArtUrl || undefined);
    var activePlayerType = (0, remotePlaybackStore_1.useRemotePlaybackStore)().activePlayerType;
    var _c = (0, react_1.useState)(false), showDevicesSheet = _c[0], setShowDevicesSheet = _c[1];
    var isBuffering = playbackState === 'buffering';
    var progressPercentage = progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;
    var isCasting = activePlayerType !== 'local';
    if (!currentTrack) {
        return null;
    }
    var handlePlayPause = function (e) {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        togglePlayPause();
    };
    var handleSkip = function (e) {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        skipToNext();
    };
    var handleCastPress = function (e) {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowDevicesSheet(true);
    };
    return (<>
      <react_native_1.TouchableOpacity style={[styles.container, { backgroundColor: theme.colors.background.secondary, borderTopColor: theme.colors.border }]} onPress={function () {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
        }} activeOpacity={0.95}>
        <react_native_1.View style={[styles.progressIndicator, { backgroundColor: theme.colors.background.muted }]}>
          <react_native_1.View style={[
            styles.progressFill,
            {
                backgroundColor: albumColors.primary,
                width: "".concat(Math.min(progressPercentage, 100), "%")
            }
        ]}/>
        </react_native_1.View>

        <react_native_1.View style={styles.artworkContainer}>
          {coverArtUrl ? (<react_native_1.Image source={{ uri: coverArtUrl }} style={styles.artwork}/>) : (<react_native_1.View style={[styles.artwork, styles.placeholderArtwork, { backgroundColor: theme.colors.background.muted }]}>
              <react_native_1.Text style={[styles.placeholderText, { color: theme.colors.text.muted }]}>♪</react_native_1.Text>
            </react_native_1.View>)}
        </react_native_1.View>

        <react_native_1.View style={[styles.info, { height: 56 }]}>
          <MarqueeText_1.MarqueeText style={{
            fontSize: 14,
            fontFamily: 'Inter_600SemiBold',
            color: theme.colors.text.primary,
        }}>
            {currentTrack.title}
          </MarqueeText_1.MarqueeText>
          <MarqueeText_1.MarqueeText style={{
            fontSize: 12,
            fontFamily: 'Inter_400Regular',
            color: theme.colors.text.secondary,
            height: 24,
        }}>
            {currentTrack.displayArtist || currentTrack.artist || 'Unknown Artist'}
          </MarqueeText_1.MarqueeText>
        </react_native_1.View>
      </react_native_1.TouchableOpacity>
    </>);
    react_native_1.View >
    ;
};
exports.MiniPlayer = MiniPlayer;
;
;
;
var styles = react_native_1.StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 72,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        borderTopWidth: 1,
    },
    progressIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    progressFill: {
        height: '100%',
    },
    artworkContainer: {
        marginRight: 16,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        alignSelf: 'center',
    },
    artwork: {
        width: 56,
        height: 56,
    },
    placeholderArtwork: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 18,
        fontFamily: 'Inter_500Medium',
    },
    info: {
        flex: 1,
        marginRight: 16,
    },
    title: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        marginBottom: 4,
    },
    artist: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
    },
    castButton: {
        padding: 8,
        marginRight: 8,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    controlButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 9999,
    },
    playButton: {
        width: 40,
        height: 40,
        borderWidth: 1,
        borderColor: 'transparent',
    },
});
