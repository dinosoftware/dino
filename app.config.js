module.exports = {
  expo: {
    name: "Dino",
    slug: "dino",
    scheme: "dinosonic",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon-square.png", // Square icon as main app icon
    userInterfaceStyle: "dark", // Force dark mode for Tidal-inspired design
    splash: {
      image: "./assets/images/icon-square.png", // Square with outline - more dramatic on launch
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    newArchEnabled: false,

    // App-specific configuration
    extra: {
      defaultServers: [], // Empty for public releases - users add their own
      allowAdditionalServers: true, // Always true for public releases
      requireServerOnFirstLaunch: true, // Show server setup on first launch
      eas: {
        projectId: "f8b0f895-17da-4d70-930d-b0a825a03593"
      },
    },

    // iOS configuration
    ios: {
      supportsTablet: true,
      bundleIdentifier: "sonic.dino",
      infoPlist: {
        UIBackgroundModes: ["audio"], // Enable background audio playback
        // Allow HTTP connections for local development and testing
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
        },
      }
    },

    // Android configuration
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff",
        foregroundImage: "./assets/images/icon-square.png", // Transparent dino for adaptive icon
        monochromeImage: "./assets/images/icon-square.png" // Same for monochrome theme
      },
      package: "sonic.dino",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      usesCleartextTraffic: true,
      // Deep linking intent filters
      intentFilters: [
        {
          action: "VIEW",
          data: [
            {
              scheme: "dinosonic",
              host: "share"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },

    // Web configuration
    web: {
      output: "static",
      favicon: "./assets/images/icon-square.png"
    },

    // Plugins
    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./assets/images/icon-square.png", // Square with outline for splash
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#000000",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true
          },
          ios: {
            useFrameworks: "static"
          }
        }
      ],
      // Note: react-native-reanimated/plugin is in babel.config.js
    ],

    experiments: {
      typedRoutes: true
    }
  }
};
