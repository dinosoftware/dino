module.exports = {
  expo: {
    name: "Dino",
    slug: "dino",
    scheme: "dino",
    version: "2.0.2",
    orientation: "default",
    icon: "./assets/images/icon-square.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/images/icon-square.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    newArchEnabled: false,

    extra: {
      defaultServers: [],
      allowAdditionalServers: true,
      requireServerOnFirstLaunch: true,
      eas: {
        projectId: "f8b0f895-17da-4d70-930d-b0a825a03593"
      },
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "sonic.dino",
      infoPlist: {
        UIBackgroundModes: ["audio"],
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
        },
        NSBonjourServices: ["_googlecast._tcp"],
        NSLocalNetworkUsageDescription: "Dino needs local network access to discover and stream to Cast and UPNP devices.",
        UILaunchStoryboardName: "SplashScreen",
        UIRequiresFullScreen: false,
        UISupportedInterfaceOrientations: [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight"
        ],
        "UISupportedInterfaceOrientations~ipad": [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight"
        ],
      }
    },

    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff",
        foregroundImage: "./assets/images/icon-square.png",
      },
      package: "sonic.dino",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      usesCleartextTraffic: true,
      permissions: [
        "android.permission.ACCESS_WIFI_STATE",
        "android.permission.CHANGE_WIFI_MULTICAST_STATE",
        "android.permission.INTERNET",
      ],
      intentFilters: [
        {
          action: "VIEW",
          data: [
            {
              scheme: "dino",
              host: "share"
            },
            {
              scheme: "dino",
              host: "add-server"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },

    web: {
      output: "static",
      favicon: "./assets/images/icon-square.png"
    },

    plugins: [
      "./plugins/withAndroidConfigChanges",
      "./plugins/googleCastFix",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/icon-square.png",
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
      [
        "react-native-google-cast",
        {
          receiverAppId: "CC1AD845",
        }
      ],
    ],
  }
};
