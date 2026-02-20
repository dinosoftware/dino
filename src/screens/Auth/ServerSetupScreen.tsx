/**
 * Dino Music App - Server Setup Screen
 * Guide users through adding their first OpenSubsonic server
 */

import { ChevronLeft } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { testConnection } from '../../api/opensubsonic/auth';
import { useTheme } from '../../hooks/useTheme';
import { useServerStore } from '../../stores';

interface ServerSetupScreenProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export const ServerSetupScreen: React.FC<ServerSetupScreenProps> = ({ onComplete, onCancel }) => {
  const theme = useTheme();
  const [serverName, setServerName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<'name' | 'url' | null>(null);

  const { addServer } = useServerStore();

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
      fontSize: theme.typography.fontSize.lg,
      color: theme.colors.text.secondary,
      lineHeight: theme.typography.fontSize.lg * theme.typography.lineHeight.relaxed,
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
    helpContainer: {
      marginTop: theme.spacing.xl,
    },
    helpText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
      lineHeight: theme.typography.fontSize.md * theme.typography.lineHeight.relaxed,
    },
    helpLink: {
      color: theme.colors.accent,
      fontWeight: theme.typography.fontWeight.medium,
    },
  }), [theme]);

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleTestConnection = async () => {
    setError(null);

    if (!serverName.trim()) {
      setError('Please enter a server name');
      return;
    }

    if (!serverUrl.trim()) {
      setError('Please enter a server URL');
      return;
    }

    if (!validateUrl(serverUrl)) {
      setError('Please enter a valid URL (e.g., https://music.example.com)');
      return;
    }

    setIsLoading(true);

    try {
      const formattedUrl = serverUrl.startsWith('http')
        ? serverUrl
        : `https://${serverUrl}`;

      console.log('Testing connection to:', formattedUrl);

      const isReachable = await testConnection(formattedUrl, '', '');

      console.log('Connection test result:', isReachable);

      if (!isReachable) {
        if (formattedUrl.startsWith('https')) {
          console.log('HTTPS failed, trying HTTP...');
          const httpUrl = formattedUrl.replace('https://', 'http://');
          const httpReachable = await testConnection(httpUrl, '', '');

          console.log('HTTP test result:', httpReachable);

          if (httpReachable) {
            console.log('HTTP connection successful, adding server');
            addServer(serverName.trim(), httpUrl, true);
            onComplete();
            return;
          }
        }

        setError('Could not connect to server. Please check the URL and try again.');
        return;
      }

      console.log('Connection successful, adding server and proceeding to login');
      addServer(serverName.trim(), formattedUrl, true);
      onComplete();
    } catch (err) {
      console.error('Server connection test failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Connection failed: ${errorMessage}`);
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
            <Text style={styles.title}>{onCancel ? 'Add New Server' : 'Welcome to Dino'}</Text>
            <Text style={styles.subtitle}>
              Connect to your OpenSubsonic server to get started
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Server Name</Text>
              <TextInput
                style={[styles.input, focusedInput === 'name' && styles.inputFocused]}
                placeholder="My Music Server"
                placeholderTextColor={theme.colors.text.tertiary}
                value={serverName}
                onChangeText={setServerName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
                selectionColor={theme.colors.accent}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Server URL</Text>
              <TextInput
                style={[styles.input, focusedInput === 'url' && styles.inputFocused]}
                placeholder="https://music.example.com"
                placeholderTextColor={theme.colors.text.tertiary}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isLoading}
                onFocus={() => setFocusedInput('url')}
                onBlur={() => setFocusedInput(null)}
                selectionColor={theme.colors.accent}
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleTestConnection}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.accentForeground} />
              ) : (
                <Text style={styles.buttonText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              Don&apos;t have a server? Learn about{' '}
              <Text
                style={styles.helpLink}
                onPress={() => Linking.openURL('https://github.com/sonicdino/dinosonic')}
              >
                Dinosonic
              </Text>
              {', '}
              <Text
                style={styles.helpLink}
                onPress={() => Linking.openURL('https://www.navidrome.org')}
              >
                Navidrome
              </Text>
              {', and other '}
              <Text
                style={styles.helpLink}
                onPress={() => Linking.openURL('https://opensubsonic.netlify.app')}
              >
                OpenSubsonic
              </Text>
              {' compatible servers.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
