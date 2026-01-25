/**
 * Dino Music App - User Avatar Component
 * Displays user initial in a circle (fallback for servers without getAvatar)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../config';

interface UserAvatarProps {
  username: string;
  size?: number;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ username, size = 40 }) => {
  // Get the first letter of username, uppercase
  const initial = username.charAt(0).toUpperCase();

  return (
    <View 
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        }
      ]}
    >
      <Text 
        style={[
          styles.initial,
          {
            fontSize: size * 0.5, // 50% of container size
          }
        ]}
      >
        {initial}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.text.primary, // White circle in dark theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: theme.colors.background.primary, // Black text in dark theme (opposite)
    fontFamily: theme.typography.fontFamily.bold,
    textAlign: 'center',
  },
});
