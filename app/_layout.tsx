/**
 * Dino Music App - Root Layout
 * Entry point for the application with premium fonts
 */

import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { AppNavigator } from '../src/navigation/AppNavigator';
import { useFonts } from '../src/hooks/useFonts';
import { deepLinkService } from '../src/services/deeplink/DeepLinkService';
import { ThemeProvider, useThemeMode } from '../src/hooks/useTheme';

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const themeMode = useThemeMode();
  return <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />;
}

export default function RootLayout() {
  const fontsLoaded = useFonts();
  const deepLinkInitialized = useRef(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      
      // Only initialize deep links once
      if (!deepLinkInitialized.current) {
        deepLinkInitialized.current = true;
        deepLinkService.initialize();
      }
    }
  }, [fontsLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      deepLinkService.cleanup();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppNavigator />
        <ThemedStatusBar />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
