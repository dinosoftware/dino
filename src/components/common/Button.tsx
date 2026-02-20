/**
 * Dino Music App - Button Component
 * shadcn/ui-inspired button with consistent styling
 */

import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';

type ButtonVariant = 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  onPress,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const theme = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
    },
    fullWidth: {
      width: '100%',
    },
    disabled: {
      opacity: 0.5,
    },
    text: {
      fontFamily: theme.typography.fontFamily.medium,
      textAlign: 'center',
    },
  }), [theme]);

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.accent,
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.background.secondary,
          borderWidth: 0,
        };
      case 'destructive':
        return {
          backgroundColor: theme.colors.error,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'default':
      default:
        return {
          backgroundColor: theme.colors.background.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return {
          height: 36,
          paddingHorizontal: theme.spacing.md,
        };
      case 'lg':
        return {
          height: 48,
          paddingHorizontal: theme.spacing.xl,
        };
      case 'icon':
        return {
          width: 40,
          height: 40,
          paddingHorizontal: 0,
        };
      case 'md':
      default:
        return {
          height: 44,
          paddingHorizontal: theme.spacing.lg,
        };
    }
  };

  const getTextVariantStyles = (): TextStyle => {
    switch (variant) {
      case 'primary':
        return {
          color: theme.colors.accentForeground,
        };
      case 'destructive':
        return {
          color: theme.colors.text.primary,
        };
      case 'ghost':
      case 'outline':
        return {
          color: theme.colors.text.primary,
        };
      case 'secondary':
      case 'default':
      default:
        return {
          color: theme.colors.text.primary,
        };
    }
  };

  const getTextSizeStyles = (): TextStyle => {
    switch (size) {
      case 'sm':
        return {
          fontSize: theme.typography.fontSize.sm,
        };
      case 'lg':
        return {
          fontSize: theme.typography.fontSize.lg,
        };
      case 'icon':
      case 'md':
      default:
        return {
          fontSize: theme.typography.fontSize.base,
        };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.colors.accentForeground : theme.colors.text.primary}
        />
      ) : typeof children === 'string' ? (
        <Text
          style={[
            styles.text,
            getTextVariantStyles(),
            getTextSizeStyles(),
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};
