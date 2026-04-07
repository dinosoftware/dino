/**
 * Dino Music App - Toast Container
 * Renders all active toasts
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast } from './Toast';
import { useToastStore } from '../../stores/toastStore';

const ToastContainerInner: React.FC = () => {
  const currentToast = useToastStore((state) => {
    const toasts = state.toasts;
    return toasts[toasts.length - 1] || null;
  });
  const hideToast = useToastStore((state) => state.hideToast);

  const handleHide = useCallback(() => {
    if (currentToast) {
      hideToast(currentToast.id);
    }
  }, [currentToast, hideToast]);

  if (!currentToast) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Toast
        message={currentToast.message}
        type={currentToast.type}
        visible={true}
        duration={currentToast.duration}
        onHide={handleHide}
      />
    </View>
  );
};

export const ToastContainer = memo(ToastContainerInner);

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
