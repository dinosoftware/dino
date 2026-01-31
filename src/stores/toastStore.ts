/**
 * Dino Music App - Toast Store
 * Global toast notification management
 */

import { create } from 'zustand';

export type ToastType = 'success' | 'info' | 'error';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  showToast: (message, type = 'success', duration = 3000) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
  },

  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
