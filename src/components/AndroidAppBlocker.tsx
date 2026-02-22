import { useState, useEffect, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Smartphone,
  Shield,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
  Timer,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AppBlocker, {
  AppInfo,
  PermissionStatus,
  isCapacitor,
} from "@/lib/app-blocker";
import { storage } from "@/lib/storage";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

interface BlockedAndroidApp extends AppInfo {
  blockMode: "off" | "session" | "persistent";
}

// Haptic Feedback Utility
const triggerHaptic = (style: "light" | "medium" | "heavy" = "light") => {
  if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
    const pattern = style === "heavy" ? [40] : style === "medium" ? [25] : [15];
    window.navigator.vibrate(pattern);
  }
};

// Memoized Item Component to prevent re-rendering the entire list
const AppItem = memo(
  ({
    app,
    onToggle,
    index,
  }: {
    app: BlockedAndroidApp;
    onToggle: (pkg: string, mode: "off" | "session" | "persistent") => void;
    index: number;
  }) => {
    const isBlocked = app.blockMode !== "off";

    return (
      <div
        style={{ animationDelay: `${index * 40}ms` }}
        className={cn(
          "relative flex items-center justify-between p-3.5 rounded-3xl transition-all duration-500 border group animate-fade-up overflow-hidden",
          app.blockMode === "persistent"
            ? "bg-destructive/[0.03] border-destructive/20 shadow-[0_8px_32px_rgba(239,68,68,0.08)]"
            : app.blockMode === "session"
            ? "bg-amber-500/[0.03] border-amber-500/20 shadow-[0_8px_32px_rgba(245,158,11,0.08)]"
            : "bg-card/40 hover:bg-card/80 border-white/5 shadow-android-elevated"
        )}
      >
        {/* Shimmer Effect for active cards */}
        {isBlocked && <div className="absolute inset-0 animate-shimmer-fast pointer-events-none opacity-50" />}

        <div className="flex items-center gap-4 flex-1 min-w-0 pr-2 relative z-10">
          <div className={cn(
            "w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center border shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
            app.blockMode !== 'off' ? "bg-white dark:bg-zinc-800 scale-105" : "bg-muted/50"
          )}>
            {app.icon ? (
              <img
                src={app.icon.startsWith('data:') ? app.icon : `data:image/png;base64,${app.icon}`}
                alt={app.appName}
                className={cn("w-9 h-9 object-contain transition-all duration-500", app.blockMode === 'off' && "grayscale opacity-40 scale-90")}
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "";
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Smartphone className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Label className="text-[15px] font-black leading-tight block truncate text-foreground/90 tracking-tight">
              {app.appName}
            </Label>
            <div className="flex items-center gap-1.5 mt-0.5">
               <div className={cn(
                 "size-1.5 rounded-full",
                 app.blockMode === 'persistent' ? "bg-destructive animate-pulse" : 
                 app.blockMode === 'session' ? "bg-amber-500 animate-pulse" : "bg-muted-foreground/30"
               )} />
               <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                  {app.blockMode === 'off' ? 'Shield Off' : app.blockMode === 'session' ? 'Session' : 'Always Locked'}
               </span>
            </div>
          </div>
        </div>

        <button
          className={cn(
            "h-12 w-12 flex items-center justify-center rounded-[20px] transition-all active:scale-75 active:rotate-12 relative z-10 press-effect",
            app.blockMode === "persistent"
              ? "text-white bg-destructive shadow-lg shadow-destructive/30"
              : app.blockMode === "session"
              ? "text-white bg-amber-500 shadow-lg shadow-amber-500/30"
              : "text-muted-foreground bg-muted hover:bg-secondary border border-border/40"
          )}
          onClick={() => {
            triggerHaptic(app.blockMode === "off" ? "medium" : "light");
            onToggle(app.packageName, app.blockMode);
          }}
          aria-label="Toggle Block Mode"
        >
          {app.blockMode === "persistent" && <Lock className="w-5 h-5 stroke-[3px]" />}
          {app.blockMode === "session" && <Timer className="w-5 h-5 stroke-[3px]" />}
          {app.blockMode === "off" && <Shield className="w-5 h-5" />}
        </button>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.app.packageName === next.app.packageName &&
      prev.app.blockMode === next.app.blockMode &&
      prev.app.appName === next.app.appName
    );
  },
);

AppItem.displayName = "AppItem";

export function AndroidAppBlocker() {
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [installedApps, setInstalledApps] = useState<BlockedAndroidApp[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if we're running in Capacitor (Android app)
  const isAndroid = isCapacitor();

  const loadInstalledApps = useCallback(async () => {
    try {
      const { apps } = await AppBlocker.getInstalledApps();
      const sessionApps = storage.getAndroidSessionApps();
      const persistentApps = storage.getAndroidPersistentApps();

      const appsWithStatus = apps.map((app) => {
        let mode: "off" | "session" | "persistent" = "off";
        if (persistentApps.includes(app.packageName)) mode = "persistent";
        else if (sessionApps.includes(app.packageName)) mode = "session";

        return {
          ...app,
          blockMode: mode,
        };
      });

      // Sort: blocked apps first (persistent then session), then alphabetically
      appsWithStatus.sort((a: BlockedAndroidApp, b: BlockedAndroidApp) => {
        const scoreA =
          a.blockMode === "persistent" ? 2 : a.blockMode === "session" ? 1 : 0;
        const scoreB =
          b.blockMode === "persistent" ? 2 : b.blockMode === "session" ? 1 : 0;

        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.appName.localeCompare(b.appName);
      });

      setInstalledApps(appsWithStatus);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load apps:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAndroid) return;
    checkPermissions();
    loadInstalledApps();
    loadBlockedApps();

    // Listen for app state changes (background to foreground)
    let listenerHandle: any;

    const setupListener = async () => {
      try {
        listenerHandle = await App.addListener(
          "appStateChange",
          ({ isActive }) => {
            if (isActive) {
              checkPermissions();
              loadInstalledApps();
            }
          },
        );
      } catch (e) {
        console.error("Failed to setup app state listener:", e);
      }
    };

    setupListener();

    // Subscribe to storage changes to keep UI in sync
    const unsub = storage.onChange("blockedApps", () => {
      loadInstalledApps();
    });

    return () => {
      if (listenerHandle) {
        // Some capacitor versions return a promise for remove, some a function, some an object with remove()
        if (typeof listenerHandle.remove === "function") {
          listenerHandle.remove();
        }
      }
      unsub();
    };
  }, [isAndroid, loadInstalledApps]);

  const checkPermissions = async () => {
    try {
      const status = await AppBlocker.checkPermissions();
      setPermissions(status);
    } catch (error) {
      console.error("Failed to check permissions:", error);
    }
  };

  const loadBlockedApps = () => {
    const monitoring = localStorage.getItem("android_monitoring") === "true";
    setIsMonitoring(monitoring);
  };

  const cycleAppBlockMode = useCallback(
    async (
      packageName: string,
      currentMode: "off" | "session" | "persistent",
    ) => {
      let nextMode: "off" | "session" | "persistent" = "session";
      if (currentMode === "session") nextMode = "persistent";
      else if (currentMode === "persistent") nextMode = "off";

      const prevApps = [...installedApps];

      // Optimistically update local state to feel instant
      setInstalledApps((prev) =>
        prev.map((app) => {
          if (app.packageName === packageName) {
            return { ...app, blockMode: nextMode };
          }
          return app;
        }),
      );

      try {
        await storage.toggleAndroidApp(packageName, nextMode); // This will trigger storage event -> eventually reload apps (but local state is already updated)
      } catch (error) {
        console.error("Failed to toggle app block mode:", error);
        setInstalledApps(prevApps); // Rollback on error
        toast.error("Failed to update app status");
      }
    },
    [installedApps],
  );

  const toggleMonitoring = async () => {
    try {
      if (!isMonitoring) {
        if (!permissions?.allGranted) {
          toast.error("Please grant all permissions first");
          return;
        }

        localStorage.setItem("android_monitoring", "true");
        setIsMonitoring(true);
        storage.notifyListeners("all"); // Trigger Check
        loadInstalledApps(); // Bug Fix: Reload apps to show correct status immediately
      } else {
        await AppBlocker.stopMonitoring();
        localStorage.setItem("android_monitoring", "false");
        setIsMonitoring(false);
        // Force notify storage
        storage.notifyListeners("all");
      }
    } catch (error) {
      console.error("Failed to toggle monitoring:", error);
      toast.error("Failed to toggle app blocking");
    }
  };

  const openSettings = async (
    type: "accessibility" | "usageStats" | "overlay",
  ) => {
    try {
      switch (type) {
        case "accessibility":
          await AppBlocker.openAccessibilitySettings();
          break;
        case "usageStats":
          await AppBlocker.openUsageStatsSettings();
          break;
        case "overlay":
          await AppBlocker.openOverlaySettings();
          break;
      }
      setTimeout(checkPermissions, 1000);
    } catch (error) {
      console.error("Failed to open settings:", error);
    }
  };

  const PermissionItem = ({
    granted,
    label,
    icon: Icon,
    onPress,
  }: {
    granted: boolean;
    label: string;
    icon: any;
    onPress: () => void;
  }) => (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-2xl transition-all duration-300",
      granted ? "bg-primary/5 border border-primary/10" : "bg-muted/50 border border-white/5"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "size-9 rounded-xl flex items-center justify-center transition-all",
          granted ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-bold leading-tight">{label}</span>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            granted ? "text-primary" : "text-destructive"
          )}>
            {granted ? "Granted" : "Required"}
          </span>
        </div>
      </div>
      {!granted && (
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => {
            triggerHaptic("medium");
            onPress();
          }}
          className="h-8 rounded-lg bg-destructive text-white hover:bg-destructive/90 text-[10px] font-black uppercase tracking-wider"
        >
          Secure
        </Button>
      )}
      {granted && <CheckCircle2 className="w-4 h-4 text-primary" />}
    </div>
  );

  if (!isAndroid) {
    return null;
  }

  return (
    <div className="space-y-4">
      {!permissions?.allGranted && (
        <div className="space-y-4 animate-fade-in bg-card/40 backdrop-blur-xl p-5 rounded-[32px] border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-destructive" />
                <h4 className="text-sm font-black uppercase tracking-widest">System Shield</h4>
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest text-destructive animate-flash">Security Alert</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium mb-2 leading-relaxed">
             Enable these protocols to establish a secure focus perimeter around your device.
          </p>
          <div className="space-y-2">
            <PermissionItem
              granted={permissions?.accessibility || false}
              label="Accessibility"
              icon={Lock}
              onPress={() => openSettings("accessibility")}
            />
            <PermissionItem
              granted={permissions?.usageStats || false}
              label="Usage Analytics"
              icon={Timer}
              onPress={() => openSettings("usageStats")}
            />
            <PermissionItem
              granted={permissions?.overlay || false}
              label="Overlays"
              icon={Shield}
              onPress={() => openSettings("overlay")}
            />
          </div>
        </div>
      )}

      {permissions?.allGranted && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-3xl border border-white/10 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl transition-all duration-500",
                isMonitoring ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Shield size={20} className={isMonitoring ? "animate-shield-pulse" : ""} />
              </div>
              <div>
                <span className="font-bold text-sm block">Global Protection</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Monitor all apps</span>
              </div>
            </div>
            <Switch
              checked={isMonitoring}
              onCheckedChange={toggleMonitoring}
              className="scale-90"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 mb-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Installed Shielded Apps</h4>
              <div className="flex gap-3 text-[9px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-amber-500/80">
                  <span className="size-1.5 rounded-full bg-amber-500" /> Session
                </span>
                <span className="flex items-center gap-1.5 text-destructive/80">
                   <span className="size-1.5 rounded-full bg-destructive" /> Always
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 max-h-[460px] overflow-y-auto no-scrollbar pr-1 overscroll-contain pb-8">
                {installedApps.map((app, index) => (
                  <AppItem
                    key={app.packageName}
                    app={app}
                    onToggle={cycleAppBlockMode}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
