import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Smartphone, Shield, Settings, CheckCircle2, XCircle, Loader2, Timer, Lock } from "lucide-react";
import { toast } from "sonner";
import AppBlocker, { AppInfo, PermissionStatus, isCapacitor } from "@/lib/app-blocker";
import { storage } from "@/lib/storage";

import { App } from '@capacitor/app';

interface BlockedAndroidApp extends AppInfo {
  blockMode: 'off' | 'session' | 'persistent';
}

export function AndroidAppBlocker() {
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [installedApps, setInstalledApps] = useState<BlockedAndroidApp[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if we're running in Capacitor (Android app)
  const isAndroid = isCapacitor();

  useEffect(() => {
    if (!isAndroid) return;
    checkPermissions();
    loadInstalledApps();
    loadBlockedApps();

    // Listen for app state changes (background to foreground)
    let listenerHandle: any;
    
    const setupListener = async () => {
      try {
        listenerHandle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            checkPermissions();
            loadInstalledApps();
            // loadBlockedApps(); // Managed by storage listener now?
          }
        });
      } catch (e) {
        console.error('Failed to setup app state listener:', e);
      }
    };

    setupListener();
    
    // Subscribe to storage changes to keep UI in sync
    const unsub = storage.onChange('blockedApps', () => {
        loadInstalledApps();
        // Check monitoring status from storage/manager? 
        // Manager manages actual enforcement. We just reflect "intention" here.
        // But monitoring toggle is still useful as a "System Master Switch"
    });

    return () => {
      if (listenerHandle) {
         listenerHandle.remove();
      }
      unsub();
    };
  }, [isAndroid]);

  const checkPermissions = async () => {
    try {
      const status = await AppBlocker.checkPermissions();
      setPermissions(status);
    } catch (error) {
      console.error("Failed to check permissions:", error);
    }
  };

  const loadInstalledApps = async () => {
    try {
      const { apps } = await AppBlocker.getInstalledApps();
      const sessionApps = storage.getAndroidSessionApps();
      const persistentApps = storage.getAndroidPersistentApps();
      
      const appsWithStatus = apps.map(app => {
          let mode: 'off' | 'session' | 'persistent' = 'off';
          if (persistentApps.includes(app.packageName)) mode = 'persistent';
          else if (sessionApps.includes(app.packageName)) mode = 'session';
          
          return {
            ...app,
            blockMode: mode
          };
      });
      
      // Sort: blocked apps first (persistent then session), then alphabetically
      appsWithStatus.sort((a, b) => {
        const scoreA = a.blockMode === 'persistent' ? 2 : (a.blockMode === 'session' ? 1 : 0);
        const scoreB = b.blockMode === 'persistent' ? 2 : (b.blockMode === 'session' ? 1 : 0);
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.appName.localeCompare(b.appName);
      });
      
      setInstalledApps(appsWithStatus);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load apps:", error);
      setLoading(false);
    }
  };

  const loadBlockedApps = () => {
    const monitoring = localStorage.getItem("android_monitoring") === "true";
    setIsMonitoring(monitoring);
  };

  const cycleAppBlockMode = async (packageName: string, currentMode: 'off' | 'session' | 'persistent') => {
      let nextMode: 'off' | 'session' | 'persistent' = 'session';
      if (currentMode === 'session') nextMode = 'persistent';
      else if (currentMode === 'persistent') nextMode = 'off';
      
      storage.toggleAndroidApp(packageName, nextMode); // This will trigger storage event -> reload apps
  };

  const toggleMonitoring = async () => {
    try {
      if (!isMonitoring) {
        if (!permissions?.allGranted) {
          toast.error("Please grant all permissions first");
          return;
        }
        
        // Let the Manager handle the heavy lifting?
        // Actually, we need to explicitly kickstart it if the user manually toggles this.
        // But `PersistentBlockerManager` enforces active state.
        // It reads `activeSession` etc.
        // If we toggle this ON, we want to enable monitoring regardless?
        // The `PersistentBlockerManager` logic is: "If there are apps to block, block them".
        // If we manually toggle this ON, it sets `android_monitoring` = "true".
        // If we toggle OFF, it sets `false`.
        // The Manager respects this flag (if apps > 0).
        
        localStorage.setItem("android_monitoring", "true");
        setIsMonitoring(true);
        storage.notifyChange('all'); // Trigger Check
        toast.success("App blocking monitoring enabled");
      } else {
        await AppBlocker.stopMonitoring();
        localStorage.setItem("android_monitoring", "false");
        setIsMonitoring(false);
        // Force notify storage 
        storage.notifyChange('all');
        toast.success("App blocking monitoring disabled");
      }
    } catch (error) {
      console.error("Failed to toggle monitoring:", error);
      toast.error("Failed to toggle app blocking");
    }
  };

  const openSettings = async (type: "accessibility" | "usageStats" | "overlay") => {
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
    onPress 
  }: { 
    granted: boolean; 
    label: string; 
    onPress: () => void;
  }) => (
    <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
      <div className="flex items-center gap-2">
        {granted ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-destructive" />
        )}
        <span className="text-sm">{label}</span>
      </div>
      {!granted && (
        <Button size="sm" variant="outline" onClick={onPress}>
          <Settings className="w-4 h-4 mr-1" />
          Grant
        </Button>
      )}
    </div>
  );

  if (!isAndroid) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Android App Blocking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {!permissions?.allGranted && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Required Permissions</h4>
            <PermissionItem
              granted={permissions?.accessibility || false}
              label="Accessibility Service"
              onPress={() => openSettings("accessibility")}
            />
            <PermissionItem
              granted={permissions?.usageStats || false}
              label="Usage Stats Access"
              onPress={() => openSettings("usageStats")}
            />
            <PermissionItem
              granted={permissions?.overlay || false}
              label="Display Over Apps"
              onPress={() => openSettings("overlay")}
            />
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-gradient-card rounded-lg border shadow-soft">
          <div className="flex items-center gap-3">
            <Shield className={`w-5 h-5 ${isMonitoring ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="font-medium text-sm">App Blocking</p>
              <p className="text-[10px] text-muted-foreground">
                {isMonitoring ? "Active - blocking enabled" : "Inactive"}
              </p>
            </div>
          </div>
          <Switch
            checked={isMonitoring}
            onCheckedChange={toggleMonitoring}
            disabled={!permissions?.allGranted}
            className="scale-90"
          />
        </div>

        {permissions?.allGranted && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex justify-between items-center">
               <span>Select Apps</span>
               <div className="flex gap-2 text-[10px]">
                   <span className="flex items-center gap-1 text-yellow-500"><Timer className="w-3 h-3"/> Session</span>
                   <span className="flex items-center gap-1 text-red-500"><Lock className="w-3 h-3"/> Always</span>
               </div>
            </h4>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 overscroll-contain -mx-1 px-1">
            {installedApps.map((app) => (
              <div
                key={app.packageName}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors border ${
                  app.blockMode === 'persistent'
                    ? "bg-destructive/10 border-destructive/30" 
                    : app.blockMode === 'session'
                        ? "bg-yellow-500/10 border-yellow-500/30"
                        : "bg-secondary/40 hover:bg-secondary/60 border-transparent"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <div className="w-9 h-9 flex-shrink-0 bg-background rounded-md flex items-center justify-center border shadow-sm">
                    {app.icon ? (
                      <img 
                        src={`data:image/png;base64,${app.icon}`} 
                        alt={app.appName} 
                        className="w-7 h-7 object-contain"
                      />
                    ) : (
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium leading-none block truncate">{app.appName}</Label>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{app.packageName}</p>
                  </div>
                </div>
                
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 px-2 transition-all ${
                        app.blockMode === 'persistent' ? 'text-destructive bg-destructive/10 hover:bg-destructive/20' :
                        app.blockMode === 'session' ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20' :
                        'text-muted-foreground hover:bg-secondary'
                    }`}
                    onClick={() => cycleAppBlockMode(app.packageName, app.blockMode)}
                >
                    {app.blockMode === 'persistent' && <Lock className="w-4 h-4" />}
                    {app.blockMode === 'session' && <Timer className="w-4 h-4" />}
                    {app.blockMode === 'off' && <span className="text-xs">Allow</span>}
                </Button>
              </div>
            ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

