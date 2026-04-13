/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Same as @react-native-firebase/app's Expo plugin, but omits withIosGoogleServicesFile.
 * Expo prebuild already runs IOSConfig.Google.withGoogleServicesFile when
 * expo.ios.googleServicesFile is set; RNFB's step duplicates the plist in
 * Copy Bundle Resources → "Multiple commands produce GoogleService-Info.plist".
 */
const path = require('path');
const { createRunOncePlugin, withPlugins } = require('expo/config-plugins');

const rnfbRoot = path.dirname(
  require.resolve('@react-native-firebase/app/package.json'),
);
const android = require(path.join(rnfbRoot, 'plugin/build/android/index.js'));
const { withFirebaseAppDelegate } = require(path.join(
  rnfbRoot,
  'plugin/build/ios/index.js',
));
const pkg = require('@react-native-firebase/app/package.json');

function withReactNativeFirebaseApp(config) {
  return withPlugins(config, [
    withFirebaseAppDelegate,
    android.withBuildscriptDependency,
    android.withApplyGoogleServicesPlugin,
    android.withCopyAndroidGoogleServices,
  ]);
}

module.exports = createRunOncePlugin(
  withReactNativeFirebaseApp,
  pkg.name,
  pkg.version,
);
