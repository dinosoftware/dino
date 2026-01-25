/**
 * Dino Music App - User Settings Menu (QAM)
 * Settings, app info, and user profile
 */

import * as Haptics from 'expo-haptics';
import {
  Code,
  Info,
  LogOut,
  Settings,
  User,
  X
} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../../config';
import { useAuthStore } from '../../stores/authStore';
import { useNavigationStore } from '../../stores/navigationStore';

interface UserSettingsMenuProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenAppInfo: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress, destructive }) => {
  const handlePress = () => {
    Haptics.impactAsync(destructive ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity style={styles.menuItem} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.menuIcon}>{icon}</View>
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
    </TouchableOpacity>
  );
};

export const UserSettingsMenu: React.FC<UserSettingsMenuProps> = ({ visible, onClose, onLogout, onOpenAppInfo }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const getCurrentServerAuth = useAuthStore((state) => state.getCurrentServerAuth);
  const auth = getCurrentServerAuth();
  const { navigate } = useNavigationStore();

  // Haptic feedback when menu opens
  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          Animated.timing(translateY, {
            toValue: 500,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleSettings = () => {
    onClose();
    // Navigate to settings screen
    navigate({ name: 'settings' });
  };

  const handleAppInfo = () => {
    onClose();
    setTimeout(() => onOpenAppInfo(), 100);
  };

  const handleSourceCode = () => {
    Linking.openURL('https://github.com/sonicdino/dino');
    onClose();
  };

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={[styles.menu, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            {/* Swipe Indicator */}
            <View style={styles.swipeIndicator}>
              <View style={styles.swipeHandle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.userIcon}>
                <User size={32} color={theme.colors.text.primary} strokeWidth={2} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.username} numberOfLines={1}>
                  {auth?.username || 'User'}
                </Text>
                <Text style={styles.serverUrl} numberOfLines={1}>
                  {auth?.serverUrl || 'No server'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              <MenuItem
                icon={<Settings size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Settings"
                onPress={handleSettings}
              />
              <MenuItem
                icon={<Info size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="App Info"
                onPress={handleAppInfo}
              />
              <MenuItem
                icon={<Code size={22} color={theme.colors.text.primary} strokeWidth={2} />}
                label="Source Code"
                onPress={handleSourceCode}
              />
              <MenuItem
                icon={<LogOut size={22} color={theme.colors.error} strokeWidth={2} />}
                label="Logout"
                onPress={handleLogout}
                destructive
              />
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: theme.colors.background.card,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.lg,
  },
  swipeIndicator: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  swipeHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.text.tertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  userIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  username: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  serverUrl: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItems: {
    paddingVertical: theme.spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 48,
  },
  menuIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  menuLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  menuLabelDestructive: {
    color: theme.colors.error,
  },
});
