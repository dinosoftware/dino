"use strict";
/**
 * Dino Music App - Color Utilities
 * Helper functions for color manipulation and contrast calculation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDarkColor = exports.isLightColor = exports.getContrastColor = void 0;
/**
 * Calculates the contrasting text color (black or white) for a given background color
 * Uses the relative luminance formula to determine readability
 *
 * @param hexColor - The background color in hex format (e.g., '#FF5733')
 * @returns '#000000' for light backgrounds, '#FFFFFF' for dark backgrounds
 */
var getContrastColor = function (hexColor) {
    // Handle undefined or invalid colors
    if (!hexColor || typeof hexColor !== 'string') {
        return '#FFFFFF'; // Default to white for safety
    }
    // Remove '#' if present
    var hex = hexColor.replace('#', '');
    // Convert hex to RGB
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    // Check for invalid RGB values
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return '#FFFFFF'; // Default to white for invalid colors
    }
    // Calculate relative luminance using the standard formula
    // Human eyes are more sensitive to green, less to blue
    var luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    // Return black for light colors (luminance > 128), white for dark colors
    return luminance > 128 ? '#000000' : '#FFFFFF';
};
exports.getContrastColor = getContrastColor;
/**
 * Checks if a color is considered "light" (high luminance)
 * @param hexColor - The color in hex format
 * @returns true if the color is light, false otherwise
 */
var isLightColor = function (hexColor) {
    return (0, exports.getContrastColor)(hexColor) === '#000000';
};
exports.isLightColor = isLightColor;
/**
 * Checks if a color is considered "dark" (low luminance)
 * @param hexColor - The color in hex format
 * @returns true if the color is dark, false otherwise
 */
var isDarkColor = function (hexColor) {
    return (0, exports.getContrastColor)(hexColor) === '#FFFFFF';
};
exports.isDarkColor = isDarkColor;
