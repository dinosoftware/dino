/**
 * Dino Music App - Auth Navigator
 * Authentication flow navigation
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ServerSelectionScreen } from '../screens/Auth/ServerSelectionScreen';
import { ServerSetupScreen } from '../screens/Auth/ServerSetupScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { useServerStore } from '../stores';
import { theme } from '../config';

interface AuthNavigatorProps {
  onAuthComplete: () => void;
}

type AuthScreen = 'serverSelection' | 'serverSetup' | 'login';

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({ onAuthComplete }) => {
  const { servers } = useServerStore();
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('serverSelection');

  // Determine initial screen based on available servers
  useEffect(() => {
    if (servers.length === 0) {
      // No servers configured - go to setup
      setCurrentScreen('serverSetup');
    } else {
      // Has servers - show selection
      setCurrentScreen('serverSelection');
    }
  }, [servers.length]);

  const handleServerSelectedWithAuth = () => {
    // Server has credentials - go directly to main app
    onAuthComplete();
  };

  const handleServerNeedsLogin = () => {
    // Server needs login - show login screen
    setCurrentScreen('login');
  };

  const handleAddNewServer = () => {
    setCurrentScreen('serverSetup');
  };

  const handleServerSetupComplete = () => {
    setCurrentScreen('login');
  };

  const handleServerSetupCancel = () => {
    // Go back to server selection if there are servers, otherwise stay on setup
    if (servers.length > 0) {
      setCurrentScreen('serverSelection');
    }
  };

  const handleLoginBack = () => {
    // Go back to server selection if there are servers
    if (servers.length > 0) {
      setCurrentScreen('serverSelection');
    }
  };

  return (
    <View style={styles.container}>
      {currentScreen === 'serverSelection' && (
        <ServerSelectionScreen 
          onServerSelected={handleServerSelectedWithAuth}
          onNeedsLogin={handleServerNeedsLogin}
          onAddNewServer={handleAddNewServer}
        />
      )}
      {currentScreen === 'serverSetup' && (
        <ServerSetupScreen 
          onComplete={handleServerSetupComplete}
          onCancel={servers.length > 0 ? handleServerSetupCancel : undefined}
        />
      )}
      {currentScreen === 'login' && (
        <LoginScreen 
          onSuccess={onAuthComplete}
          onCancel={servers.length > 0 ? handleLoginBack : undefined}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
});
