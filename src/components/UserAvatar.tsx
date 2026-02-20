/**
 * Dino Music App - User Avatar Component
 * Displays user initial in a circle (fallback for servers without getAvatar)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface UserAvatarProps {
  username: string;
  size?: number;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ username, size = 40 }) => {
  const theme = useTheme();
  const initial = username.charAt(0).toUpperCase();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: theme.colors.text.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    initial: {
      color: theme.colors.background.primary,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: 'center',
    },
  }), [theme]);

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
            fontSize: size * 0.5,
          }
        ]}
      >
        {initial}
      </Text>
    </View>
  );
};
