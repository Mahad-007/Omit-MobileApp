import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Smartphone, Shield, Settings, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AppBlocker, { AppInfo, PermissionStatus, isCapacitor } from "@/lib/app-blocker";

interface BlockedAndroidApp extends AppInfo {
  blocked: boolean;
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
      const blockedPackages = JSON.parse(localStorage.getItem("android_blocked_apps") || "[]");
      
      const appsWithStatus = apps.map(app => ({
        ...app,
        blocked: blockedPackages.includes(app.packageName)
      }));
      
      // Sort: blocked apps first, then alphabetically
      appsWithStatus.sort((a, b) => {
        if (a.blocked && !b.blocked) return -1;
        if (!a.blocked && b.blocked) return 1;
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
    const blockedPackages = JSON.parse(localStorage.getItem("android_blocked_apps") || "[]");
    const monitoring = localStorage.getItem("android_monitoring") === "true";
    setIsMonitoring(monitoring);
  };

  const toggleAppBlock = async (packageName: string) => {
    const blockedPackages = JSON.parse(localStorage.getItem("android_blocked_apps") || "[]");
    
    let newBlocked: string[];
    if (blockedPackages.includes(packageName)) {
      newBlocked = blockedPackages.filter((p: string) => p !== packageName);
    } else {
      newBlocked = [...blockedPackages, packageName];
    }
    
    localStorage.setItem("android_blocked_apps", JSON.stringify(newBlocked));
    
    // Update the native plugin
    await AppBlocker.setBlockedApps({ apps: newBlocked });
    
    // Update local state
    setInstalledApps(prev => prev.map(app => 
      app.packageName === packageName 
        ? { ...app, blocked: !app.blocked }
        : app
    ));
  };

  const toggleMonitoring = async () => {
    try {
      if (!isMonitoring) {
        // Check permissions first
        if (!permissions?.allGranted) {
          toast.error("Please grant all permissions first");
          return;
        }
        
        const blockedPackages = JSON.parse(localStorage.getItem("android_blocked_apps") || "[]");
        await AppBlocker.setBlockedApps({ apps: blockedPackages });
        await AppBlocker.startMonitoring();
        localStorage.setItem("android_monitoring", "true");
        setIsMonitoring(true);
        toast.success("App blocking activated!");
      } else {
        await AppBlocker.stopMonitoring();
        localStorage.setItem("android_monitoring", "false");
        setIsMonitoring(false);
        toast.success("App blocking deactivated");
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
      // Re-check permissions after returning from settings
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

  // Return null for non-Android (after all hooks have been called)
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
        {/* Permissions Section - Only show when permissions are missing */}
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

        {/* Monitoring Toggle */}
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

        {/* Apps List */}
        {permissions?.allGranted && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Select Apps ({installedApps.filter(a => a.blocked).length})
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
                  app.blocked 
                    ? "bg-destructive/5 border-destructive/20" 
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
                <Switch
                  checked={app.blocked}
                  onCheckedChange={() => toggleAppBlock(app.packageName)}
                  className="scale-90 flex-shrink-0"
                />
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
