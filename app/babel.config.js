module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }], // Configure jsxImportSource here
      "nativewind/babel", // Add nativewind/babel as a preset
    ],
    plugins: [
      "react-native-worklets-core/plugin", // Worklets plugin for NativeWind/Reanimated
      "react-native-reanimated/plugin", // Must be last plugin
    ],
  };
}; 