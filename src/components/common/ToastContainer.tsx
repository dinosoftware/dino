/**
 * Dino Music App - Toast Container
 * Renders all active toasts
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast } from './Toast';
import { useToastStore } from '../../stores/toastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useToastStore();

  // Only show the most recent toast
  const currentToast = toasts[toasts.length - 1];

  if (!currentToast) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Toast
        message={currentToast.message}
        type={currentToast.type}
        visible={true}
        duration={currentToast.duration}
        onHide={() => hideToast(currentToast.id)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
});
