module.exports = ({ config }) => {
  return {
    ...config,
    name: "Smash'd",
    slug: "smashd-app",
    version: "1.0.8",
    orientation: "portrait",
    icon: "./assets/images/smashd.png",
    scheme: "smashd",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/smashd.png",
      resizeMode: "contain",
      backgroundColor: "#FAB10A"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.smashd.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/smashd.png",
        backgroundColor: "#ffffff"
      },
      package: "com.smashd.app",
      versionCode: 20,
      permissions: [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE"
      ]
    },
    locales: {
      es: "español"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: ["expo-router"],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "36b14cff-7f2e-43ac-9da6-f163563fd773"
      },
      // Use EAS environment variables (set in EAS dashboard)
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "https://backend-production-e9ac.up.railway.app",
      EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || "production",
      EXPO_PUBLIC_SUMUP_PUBLIC_KEY: process.env.EXPO_PUBLIC_SUMUP_PUBLIC_KEY || "sup_pk_p2gL1vcQwbpik2Se712OqxO3YPGgsJjW5"
    },
    owner: "0b501e7e"
  };
}; 