/**
 * Dino Music App - Root Layout
 * Entry point for the application with premium fonts
 */

import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
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

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      
      deepLinkService.initialize();
    }
  }, [fontsLoaded]);

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
