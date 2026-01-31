/**
 * Dino Music App - Toast Notification System
 * Non-obtrusive top-center toast for success messages
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Check, Info, AlertCircle } from 'lucide-react-native';
import { theme } from '../../config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'info' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  duration?: number;
  onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  visible,
  duration = 3000,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Debug logging
  console.log('[Toast] Rendering:', { message, type, visible, messageLength: message?.length });

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={20} color="#FFFFFF" strokeWidth={2.5} />;
      case 'error':
        return <AlertCircle size={20} color="#FFFFFF" strokeWidth={2.5} />;
      case 'info':
      default:
        return <Info size={20} color="#FFFFFF" strokeWidth={2.5} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(21, 128, 61, 0.95)'; // Darker green for better contrast
      case 'error':
        return 'rgba(185, 28, 28, 0.95)'; // Darker red for better contrast
      case 'info':
      default:
        return 'rgba(39, 39, 42, 0.95)'; // Darker zinc for better contrast
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'info':
      default:
        return theme.colors.accent;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 16,
          opacity,
          transform: [{ translateY }],
          borderColor: getBorderColor(),
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>{getIcon()}</View>
        <Text style={styles.message} numberOfLines={3} ellipsizeMode="tail">
          {message || 'No message'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  iconContainer: {
    marginRight: theme.spacing.sm,
  },
  message: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },
});
