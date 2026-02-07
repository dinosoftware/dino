/**
 * Dino Music App - Server Setup Screen
 * Guide users through adding their first OpenSubsonic server
 */

import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
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
import { theme } from '../../config';
import { useServerStore } from '../../stores';

interface ServerSetupScreenProps {
  onComplete: () => void;
  onCancel?: () => void; // Optional - only shown when coming from server selection
}

export const ServerSetupScreen: React.FC<ServerSetupScreenProps> = ({ onComplete, onCancel }) => {
  const [serverName, setServerName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addServer } = useServerStore();

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

    // Validation
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
      // Ensure URL has protocol
      const formattedUrl = serverUrl.startsWith('http')
        ? serverUrl
        : `https://${serverUrl}`;

      console.log('Testing connection to:', formattedUrl);

      // Test connection without credentials (ping endpoint)
      const isReachable = await testConnection(formattedUrl, '', '');

      console.log('Connection test result:', isReachable);

      if (!isReachable) {
        // Try with http if https failed
        if (formattedUrl.startsWith('https')) {
          console.log('HTTPS failed, trying HTTP...');
          const httpUrl = formattedUrl.replace('https://', 'http://');
          const httpReachable = await testConnection(httpUrl, '', '');

          console.log('HTTP test result:', httpReachable);

          if (httpReachable) {
            // Add server and proceed to login
            console.log('HTTP connection successful, adding server');
            addServer(serverName.trim(), httpUrl, true); // autoSwitch = true
            onComplete();
            return;
          }
        }

        setError('Could not connect to server. Please check the URL and try again.');
        return;
      }

      // Add server and proceed to login
      console.log('Connection successful, adding server and proceeding to login');
      addServer(serverName.trim(), formattedUrl, true); // autoSwitch = true
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
          {/* Back Button (only shown when onCancel is provided) */}
          {onCancel && (
            <TouchableOpacity style={styles.backButton} onPress={onCancel}>
              <ChevronLeft size={28} color={theme.colors.text.primary} strokeWidth={2} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{onCancel ? 'Add New Server' : 'Welcome to Dino'}</Text>
            <Text style={styles.subtitle}>
              Connect to your OpenSubsonic server to get started
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Server Name</Text>
              <TextInput
                style={styles.input}
                placeholder="My Music Server"
                placeholderTextColor={theme.colors.text.tertiary}
                value={serverName}
                onChangeText={setServerName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Server URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://music.example.com"
                placeholderTextColor={theme.colors.text.tertiary}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isLoading}
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

          {/* Help Text */}
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

const styles = StyleSheet.create({
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
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.accentForeground, // Dark text on white button
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
});
