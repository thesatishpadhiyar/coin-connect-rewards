import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.f85fca08103d4229b39a08d7d0b20773",
  appName: "coin-connect-rewards",
  webDir: "dist",
  server: {
    url: "https://f85fca08-103d-4229-b39a-08d7d0b20773.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#1a1a2e",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
