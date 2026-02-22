import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { storage, BlockedApp, Settings } from "@/lib/storage";
import { useBlockedApps } from "@/lib/api";
import { toast } from "sonner";
import { AndroidAppBlocker } from "@/components/AndroidAppBlocker";
import AppBlocker, { isCapacitor, PermissionStatus } from "@/lib/app-blocker";
import { Switch } from "@/components/ui/switch";
import { NotificationManager } from "@/utils/notifications";
import { cn } from "@/lib/utils";
import CustomTimeModal from "@/components/CustomTimeModal";
import { UnifiedAppShield } from "@/components/UnifiedAppShield";

import { 
  ChevronLeft,
  ShieldCheck,
  Timer,
  Info,
  Ban,
  Play,
  X,
  Shield,
  Zap,
  Lock,
  Globe
} from "lucide-react";

// Haptic Feedback Utility
const triggerHaptic = (style: "light" | "medium" | "heavy" = "light") => {
  if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
    const pattern = style === "heavy" ? [40] : style === "medium" ? [25] : [15];
    window.navigator.vibrate(pattern);
  }
};

export default function SocialBlocker() {
  const navigate = useNavigate();
  const { data: apps = [] } = useBlockedApps();
  const [settings, setSettings] = useState<Settings>(storage.getSettings());
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [isInitiating, setIsInitiating] = useState(false);

  // Load installed apps for icons
  useEffect(() => {
    if (isCapacitor()) {
      AppBlocker.getInstalledApps().then(({ apps }) => {
        setInstalledApps(apps);
      }).catch(console.error);
    }
  }, []);

  // Sync state with storage
  useEffect(() => {
    const loadedSettings = storage.getSettings();
    setSettings(loadedSettings);
    setFocusDuration(loadedSettings.defaultFocusDuration);

    const session = storage.getActiveSession();
    if (session) setFocusModeActive(true);

    if (isCapacitor()) {
      AppBlocker.checkPermissions().then(setPermissions);
    }

    const unsubSettings = storage.onChange('settings', () => {
      setSettings(storage.getSettings());
    });

    return () => unsubSettings();
  }, []);

  const activeShields = useMemo(() => {
    const webApps = apps.filter(app => app.isEnabled);
    const androidSession = storage.getAndroidSessionApps();
    const androidPersistent = storage.getAndroidPersistentApps();
    
    const androidApps = [...androidSession, ...androidPersistent].map(pkg => {
        const fullInfo = installedApps.find(a => a.packageName === pkg);
        return {
            packageName: pkg,
            appName: fullInfo?.appName || pkg.split('.').pop() || pkg,
            icon: fullInfo?.icon,
            blockMode: androidPersistent.includes(pkg) ? 'persistent' : 'session',
        };
    });

    return [...webApps, ...androidApps];
  }, [apps, installedApps]);

  const toggleStrictMode = (checked: boolean) => {
    triggerHaptic("light");
    const newSettings = { ...settings, strictMode: checked };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  const startFocusSession = async () => {
    const onAndroid = isCapacitor();
    let hasBlockedApps = false;
    
    if (onAndroid) {
      hasBlockedApps = storage.getAndroidSessionApps().length > 0 || storage.getAndroidPersistentApps().length > 0;
    } else {
      hasBlockedApps = apps.some(app => app.isEnabled);
    }

    if (!hasBlockedApps) {
      triggerHaptic("heavy");
      toast.error('Please select at least one shield to activate');
      return;
    }

    if (storage.isTimeLimitExceeded()) {
      triggerHaptic("heavy");
      toast.error('Daily limit exceeded.');
      return;
    }

    triggerHaptic("heavy");
    setIsInitiating(true);
    
    // Portal transition effect delay
    await new Promise(r => setTimeout(r, 600));

    await NotificationManager.scheduleFocusEnd(focusDuration);
    storage.startFocusSession(focusDuration);
    setFocusModeActive(true);
    
    storage.forceSync();
    navigate('/timer');
  };

  const remainingTime = settings.dailyTimeLimitEnabled ? storage.getRemainingTime() : Infinity;
  const isTimeLimitExceeded = settings.dailyTimeLimitEnabled && remainingTime <= 0;

  return (
    <div className={cn(
        "min-h-screen flex flex-col pb-36 bg-background relative selection:bg-primary/20 overflow-x-hidden transition-all duration-700",
        isInitiating && "scale-110 blur-xl opacity-0"
    )}>
      {/* Zen Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-aurora" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-aurora" style={{ animationDelay: '-5s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/60 backdrop-blur-2xl border-b border-white/5">
        <div className="flex items-center px-4 h-16 max-w-md mx-auto w-full justify-between">
          <button 
            onClick={() => {
                triggerHaptic("light");
                navigate('/');
            }}
            className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/5 transition-all active:scale-90"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex flex-col items-center">
             <h1 className="text-base font-black uppercase tracking-[0.2em] text-foreground/80">Zen Shield</h1>
          </div>
          <button 
             onClick={() => triggerHaptic("light")}
             className="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-white/5 transition-all active:scale-90"
          >
             <Info className="w-4 h-4 text-muted-foreground/50" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 pt-8 max-w-md mx-auto w-full space-y-10 relative z-10 animate-fade-in">
        
        {/* Shield Ritual Header */}
        <section className="flex flex-col items-center text-center space-y-6">
           <div className="relative group cursor-pointer" onClick={() => triggerHaptic("medium")}>
              {/* Ripple Effect */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ripple" />
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ripple" style={{ animationDelay: '0.5s' }} />
              
              <div className="size-24 rounded-[32px] bg-shield-active flex items-center justify-center shadow-2xl shadow-primary/40 relative z-10 animate-shield-pulse transition-transform duration-500 group-hover:scale-110 active:scale-90">
                 <Shield className="size-10 text-white fill-white/20" />
              </div>
           </div>
           
           <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight">Focus Protocol</h2>
              <p className="text-sm text-muted-foreground font-medium">Configure your mental sanctuary</p>
           </div>
        </section>

        {/* Configuration Matrix */}
        <section className="grid grid-cols-1 gap-4">
           {/* Duration Card */}
           <div className="bg-card/40 backdrop-blur-xl rounded-[32px] p-2 border border-white/10 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                       <Timer className="w-5 h-5" />
                    </div>
                    <div>
                       <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 block">Duration</span>
                       <span className="text-sm font-bold">{focusDuration} Minutes</span>
                    </div>
                 </div>
                 <button 
                   onClick={() => setIsTimeModalOpen(true)}
                   className="h-10 px-4 rounded-xl bg-muted/50 text-xs font-bold hover:bg-primary hover:text-white transition-all active:scale-95"
                 >
                    Adjust
                 </button>
              </div>
              
              {/* Strict Mode Toggle */}
              <div 
                onClick={() => toggleStrictMode(!settings.strictMode)}
                className="p-4 flex items-center justify-between border-t border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
              >
                 <div className="flex items-center gap-3">
                    <div className={cn(
                        "size-10 rounded-2xl flex items-center justify-center transition-all",
                        settings.strictMode ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                    )}>
                       <Lock className="w-5 h-5" />
                    </div>
                    <div>
                       <span className="text-sm font-bold block">Strict Mode</span>
                       <span className="text-[10px] text-muted-foreground font-medium">Prevent aborting session</span>
                    </div>
                 </div>
                 <Switch 
                   checked={settings.strictMode} 
                   onCheckedChange={(c) => toggleStrictMode(c)} 
                   className="scale-90"
                   onClick={(e) => e.stopPropagation()}
                 />
              </div>
           </div>
        </section>

        {/* Active Shields Grid */}
        <UnifiedAppShield 
          activeApps={activeShields} 
          onManageClick={() => setIsManageOpen(true)} 
        />

      </main>

      {/* Start Button Container */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pb-12 z-40 bg-gradient-to-t from-background via-background/90 to-transparent pt-12">
        <div className="max-w-md mx-auto">
          <button 
            onClick={startFocusSession}
            disabled={focusModeActive || isTimeLimitExceeded}
            className="w-full h-16 rounded-[24px] font-black text-lg flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-40 text-white shadow-2xl shadow-primary/25 hover:shadow-primary/40 group relative overflow-hidden bg-shield-active"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            
            {focusModeActive ? (
                <>
                  <Zap className="w-6 h-6 animate-pulse text-amber-300" />
                  <span>Protocol Active</span>
                </>
            ) : isTimeLimitExceeded ? (
                <>
                  <Ban className="w-6 h-6 border-white/40" />
                  <span>Limit Exceeded</span>
                </>
            ) : (
                <>
                  <Play className="w-6 h-6 fill-current" />
                  <span className="uppercase tracking-[0.15em]">Initiate Focus</span>
                </>
            )}
          </button>
        </div>
      </div>

      {/* Manage Shields Overlay */}
      {isManageOpen && (
        <div className="fixed inset-0 z-[100] bg-background animate-in slide-in-from-bottom duration-500 p-6 overscroll-none overflow-y-auto pb-32">
           <header className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase tracking-wider">Manage Shields</h2>
              <button 
                onClick={() => setIsManageOpen(false)}
                className="size-10 rounded-2xl bg-muted flex items-center justify-center active:scale-90 transition-all"
              >
                 <X className="w-6 h-6" />
              </button>
           </header>
           
           <div className="space-y-8">
              {/* Web Shields Section */}
              <section className="space-y-4">
                 <div className="flex items-center gap-2 px-1">
                    <Globe className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Web Shields</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-3">
                    {apps.map(app => (
                        <div 
                          key={app.id}
                          onClick={() => storage.toggleAppBlock(app.id)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-[24px] border transition-all active:scale-[0.98]",
                            app.isEnabled ? "bg-primary/5 border-primary/20" : "bg-card/40 border-white/5"
                          )}
                        >
                           <div className="flex items-center gap-4">
                              <div className={cn(
                                "size-10 rounded-xl flex items-center justify-center transition-all",
                                app.isEnabled ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                              )}>
                                 <Shield className="w-5 h-5" />
                              </div>
                              <div>
                                 <span className="text-sm font-bold block">{app.name}</span>
                                 <span className="text-[10px] font-medium opacity-50">{app.url}</span>
                              </div>
                           </div>
                           <Switch checked={app.isEnabled} className="scale-90" />
                        </div>
                    ))}
                 </div>
              </section>

              {/* Android Shields Section */}
              <section className="space-y-4">
                 <div className="flex items-center gap-2 px-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">App Shields</h3>
                 </div>
                 <AndroidAppBlocker />
              </section>
           </div>
        </div>
      )}

      <CustomTimeModal 
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
        onSave={(mins) => {
            setFocusDuration(mins);
            setIsTimeModalOpen(false);
        }}
        initialValue={focusDuration}
        title="Session Duration"
      />
    </div>
  );
}
