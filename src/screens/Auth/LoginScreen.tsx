/**
 * Dino Music App - Login Screen
 * Authenticate with username and password
 */

import { ChevronLeft } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthStore, useServerStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';

interface LoginScreenProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onCancel }) => {
  const theme = useTheme();
  const [authMode, setAuthMode] = useState<'password' | 'apikey'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const { login, loginWithApiKey } = useAuthStore();
  const { getCurrentServer, currentServerId } = useServerStore();

  const currentServer = getCurrentServer();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    backButtonText: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
      marginLeft: theme.spacing.xs,
    },
    header: {
      marginBottom: theme.spacing.xxxl,
    },
    title: {
      fontSize: theme.typography.fontSize.huge,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    serverUrl: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text.secondary,
    },
    authModeToggle: {
      flexDirection: 'row',
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.background.card,
      borderRadius: theme.borderRadius.md,
      padding: 4,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      borderRadius: theme.borderRadius.sm,
    },
    toggleButtonActive: {
      backgroundColor: theme.colors.accent,
    },
    toggleButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.secondary,
    },
    toggleButtonTextActive: {
      color: theme.colors.accentForeground,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    form: {
      marginBottom: theme.spacing.xl,
    },
    inputGroup: {
      marginBottom: theme.spacing.lg,
    },
    label: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.sm,
    },
    input: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md + 2,
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text.primary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inputFocused: {
      borderColor: theme.colors.text.primary,
      backgroundColor: theme.colors.background.primary,
    },
    errorContainer: {
      backgroundColor: theme.colors.error + '20',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.typography.fontSize.md,
    },
    button: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: theme.colors.accentForeground,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  }), [theme]);

  const handleLogin = async () => {
    setError(null);

    if (!currentServerId || !currentServer) {
      setError('No server configured');
      return;
    }

    if (authMode === 'password') {
      if (!username.trim()) {
        setError('Please enter your username');
        return;
      }

      if (!password.trim()) {
        setError('Please enter your password');
        return;
      }
    } else {
      if (!apiKey.trim()) {
        setError('Please enter your API key');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (authMode === 'password') {
        await login(currentServerId, username.trim(), password);
      } else {
        await loginWithApiKey(currentServerId, apiKey.trim());
      }
      
      onSuccess();
    } catch (err) {
      console.error('Login failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {onCancel && (
            <TouchableOpacity style={styles.backButton} onPress={onCancel}>
              <ChevronLeft size={28} color={theme.colors.text.primary} strokeWidth={2} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={styles.title}>Sign In</Text>
            {currentServer && (
              <Text style={styles.subtitle}>
                {currentServer.name}
              </Text>
            )}
            {currentServer && (
              <Text style={styles.serverUrl}>
                {currentServer.url}
              </Text>
            )}
          </View>

          <View style={styles.authModeToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, authMode === 'password' && styles.toggleButtonActive]}
              onPress={() => setAuthMode('password')}
              disabled={isLoading}
            >
              <Text style={[styles.toggleButtonText, authMode === 'password' && styles.toggleButtonTextActive]}>
                Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, authMode === 'apikey' && styles.toggleButtonActive]}
              onPress={() => setAuthMode('apikey')}
              disabled={isLoading}
            >
              <Text style={[styles.toggleButtonText, authMode === 'apikey' && styles.toggleButtonTextActive]}>
                API Key
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {authMode === 'password' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={[styles.input, focusedInput === 'username' && styles.inputFocused]}
                    placeholder="Enter your username"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="next"
                    onFocus={() => setFocusedInput('username')}
                    onBlur={() => setFocusedInput(null)}
                    selectionColor={theme.colors.accent}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={[styles.input, focusedInput === 'password' && styles.inputFocused]}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    selectionColor={theme.colors.accent}
                  />
                </View>
              </>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>API Key</Text>
                <TextInput
                  style={[styles.input, focusedInput === 'apiKey' && styles.inputFocused]}
                  placeholder="Enter your API key"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={apiKey}
                  onChangeText={setApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  onFocus={() => setFocusedInput('apiKey')}
                  onBlur={() => setFocusedInput(null)}
                  selectionColor={theme.colors.accent}
                />
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.accentForeground} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
