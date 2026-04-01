/* eslint-disable @typescript-eslint/no-require-imports */
const appJson = require('./app.json');

/** Merges app.json with env-driven extras (ORS key for map snapping). */
module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      openRouteServiceApiKey: process.env.EXPO_PUBLIC_OPENROUTESERVICE_KEY ?? '',
    },
  },
};
