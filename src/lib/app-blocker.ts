import { registerPlugin, Capacitor } from "@capacitor/core";

export interface AppInfo {
  packageName: string;
  appName: string;
  icon?: string;
}

export interface PermissionStatus {
  accessibility: boolean;
  usageStats: boolean;
  overlay: boolean;
  allGranted: boolean;
}

export interface AppBlockerPlugin {
  setBlockedApps(options: { apps: string[] }): Promise<{ count: number }>;
  startMonitoring(): Promise<{ monitoring: boolean }>;
  stopMonitoring(): Promise<{ monitoring: boolean }>;
  checkPermissions(): Promise<PermissionStatus>;
  openAccessibilitySettings(): Promise<void>;
  openUsageStatsSettings(): Promise<void>;
  openOverlaySettings(): Promise<void>;
  getInstalledApps(): Promise<{ apps: AppInfo[] }>;
  getAppIcon(options: { packageName: string }): Promise<{ icon: string }>;
}

const AppBlocker = registerPlugin<AppBlockerPlugin>("AppBlocker");

export default AppBlocker;

// Helper function to check if running on Android
export function isAndroid(): boolean {
  return (
    typeof window !== "undefined" &&
    window.navigator.userAgent.toLowerCase().includes("android")
  );
}

// Helper function to check if running in Capacitor (native Android/iOS)
export function isCapacitor(): boolean {
  return Capacitor.isNativePlatform();
}
