export default {
    expo: {
      name: "PowerMate Management",
      slug: "powermate-management", 
      version: "1.0.0",
      orientation: "portrait",
      userInterfaceStyle: "light",
      splash: {
        backgroundColor: "#2196F3"
      },
      assetBundlePatterns: ["**/*"],
      ios: {
        supportsTablet: true
      },
      android: {
        adaptiveIcon: {
          backgroundColor: "#2196F3"
        },
        permissions: [
          "android.permission.INTERNET",
          "android.permission.ACCESS_NETWORK_STATE", 
          "android.permission.ACCESS_WIFI_STATE"
        ],
        package: "com.productshawn826.powermatemanagement",
        config: {
          usesCleartextTraffic: true
        }
      },
      web: {},
      plugins: ["expo-dev-client"],
      extra: {
        eas: {
          projectId: "f7662155-a998-464e-a04a-60bb97ef3a87"
        }
      }
    }
  };