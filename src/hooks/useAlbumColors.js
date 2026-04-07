"use strict";
/**
 * Dino Music App - Album Colors Hook
 * Extract dominant colors from album artwork
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAlbumColors = void 0;
var react_1 = require("react");
var react_native_image_colors_1 = require("react-native-image-colors");
var useTheme_1 = require("./useTheme");
var colorUtils_1 = require("../utils/colorUtils");
var useAlbumColors = function (imageUri) {
    var theme = (0, useTheme_1.useTheme)();
    var getDefaultColors = function () { return ({
        primary: theme.colors.accent,
        secondary: theme.colors.background.secondary,
        background: theme.colors.background.primary,
        detail: theme.colors.text.secondary,
        textColor: (0, colorUtils_1.getContrastColor)(theme.colors.accent),
    }); };
    var _a = (0, react_1.useState)(getDefaultColors), colors = _a[0], setColors = _a[1];
    (0, react_1.useEffect)(function () {
        if (!imageUri) {
            setColors(getDefaultColors());
            return;
        }
        (0, react_native_image_colors_1.getColors)(imageUri, {
            fallback: theme.colors.accent,
            cache: true,
            key: imageUri,
        })
            .then(function (result) {
            if (result.platform === 'android') {
                var primaryColor = result.vibrant || result.lightVibrant || result.dominant || theme.colors.accent;
                setColors({
                    primary: primaryColor,
                    secondary: result.darkVibrant || result.darkMuted || theme.colors.background.secondary,
                    background: result.darkMuted || theme.colors.background.primary,
                    detail: result.vibrant || theme.colors.text.secondary,
                    textColor: (0, colorUtils_1.getContrastColor)(primaryColor),
                });
            }
            else if (result.platform === 'ios') {
                var primaryColor = result.detail || result.primary || theme.colors.accent;
                setColors({
                    primary: primaryColor,
                    secondary: result.secondary || theme.colors.background.secondary,
                    background: result.background || theme.colors.background.primary,
                    detail: result.detail || theme.colors.text.secondary,
                    textColor: (0, colorUtils_1.getContrastColor)(primaryColor),
                });
            }
        })
            .catch(function () {
            setColors(getDefaultColors());
        });
    }, [imageUri, theme]);
    return colors;
};
exports.useAlbumColors = useAlbumColors;
