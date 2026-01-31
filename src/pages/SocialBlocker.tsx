import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { storage, BlockedApp, Settings } from "@/lib/storage";
import { useBlockedApps } from "@/lib/api";
import { toast } from "sonner";
import { AndroidAppBlocker } from "@/components/AndroidAppBlocker";
import AppBlocker, { isCapacitor, AppInfo, PermissionStatus } from "@/lib/app-blocker";
import { Switch } from "@/components/ui/switch";
import { NotificationManager } from "@/utils/notifications";
import { cn } from "@/lib/utils";
import CustomTimeModal from "@/components/CustomTimeModal";

interface InstalledAppWithStatus extends AppInfo {
  blockMode: 'off' | 'session' | 'persistent';
}


const defaultApps: { category: string; apps: Omit<BlockedApp, 'id'>[] }[] = [
  {
    category: 'Social Media',
    apps: [
      { url: 'instagram.com', name: 'Instagram', isEnabled: true, blockMode: 'focus' },
      { url: 'tiktok.com', name: 'TikTok', isEnabled: true, blockMode: 'focus' },
      { url: 'twitter.com', name: 'X (Twitter)', isEnabled: false, blockMode: 'focus' },
      { url: 'facebook.com', name: 'Facebook', isEnabled: false, blockMode: 'focus' },
    ]
  },
  {
    category: 'Entertainment',
    apps: [
      { url: 'youtube.com', name: 'YouTube', isEnabled: false, blockMode: 'focus' },
      { url: 'netflix.com', name: 'Netflix', isEnabled: false, blockMode: 'focus' },
      { url: 'twitch.tv', name: 'Twitch', isEnabled: false, blockMode: 'focus' },
    ]
  },
  {
    category: 'Other',
    apps: [
      { url: 'reddit.com', name: 'Reddit', isEnabled: false, blockMode: 'focus' },
    ]
  }
];

import { 
  Camera, 
  Music, 
  AtSign, 
  Users, 
  PlayCircle, 
  Film, 
  Gamepad2, 
  MessageSquare,
  ChevronLeft,
  ShieldCheck,
  Smartphone,
  Plus,
  Timer,
  Info,
  Ban,
  Play
} from "lucide-react";

const appIcons: Record<string, { icon:  React.ElementType; color: string }> = {
  'instagram.com': { icon: Camera, color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  'tiktok.com': { icon: Music, color: 'bg-gradient-to-br from-cyan-400 to-pink-500' },
  'twitter.com': { icon: AtSign, color: 'bg-sky-500' },
  'facebook.com': { icon: Users, color: 'bg-blue-600' },
  'youtube.com': { icon: PlayCircle, color: 'bg-red-500' },
  'netflix.com': { icon: Film, color: 'bg-red-600' },
  'twitch.tv': { icon: Gamepad2, color: 'bg-purple-600' },
  'reddit.com': { icon: MessageSquare, color: 'bg-orange-500' },
};

export default function SocialBlocker() {
  const navigate = useNavigate();
  const { data: apps = [], toggle } = useBlockedApps();
  const [settings, setSettings] = useState<Settings>(storage.getSettings());
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(0);
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [installedApps, setInstalledApps] = useState<InstalledAppWithStatus[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check permissions on Android
  const checkPermissions = async () => {
    if (isCapacitor()) {
      try {
        const status = await AppBlocker.checkPermissions();
        setPermissions(status);
      } catch (error) {
        console.error("Failed to check permissions:", error);
      }
    }
  };

  // Load installed apps from the device
  const loadInstalledApps = async () => {
    if (!isCapacitor()) return;
    try {
      const { apps } = await AppBlocker.getInstalledApps();
      const sessionApps = storage.getAndroidSessionApps();
      const persistentApps = storage.getAndroidPersistentApps();
      
      const appsWithStatus = apps.map((app: AppInfo) => {
        let mode: 'off' | 'session' | 'persistent' = 'off';
        if (persistentApps.includes(app.packageName)) mode = 'persistent';
        else if (sessionApps.includes(app.packageName)) mode = 'session';
        
        return {
          ...app,
          blockMode: mode
        };
      });
      
      // Sort: blocked apps first (persistent then session), then alphabetically
      appsWithStatus.sort((a: InstalledAppWithStatus, b: InstalledAppWithStatus) => {
        const scoreA = a.blockMode === 'persistent' ? 2 : (a.blockMode === 'session' ? 1 : 0);
        const scoreB = b.blockMode === 'persistent' ? 2 : (b.blockMode === 'session' ? 1 : 0);
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.appName.localeCompare(b.appName);
      });
      
      setInstalledApps(appsWithStatus);
    } catch (error) {
      console.error("Failed to load installed apps:", error);
    }
  };

  useEffect(() => {
    // Request notification permissions
    NotificationManager.requestPermissions();

    // Settings still from local storage for now - future task to migrate
    const loadedSettings = storage.getSettings();
    setSettings(loadedSettings);
    setFocusDuration(loadedSettings.defaultFocusDuration);
    setDailyUsage(storage.getDailyAppUsage());

    const session = storage.getActiveSession();
    if (session) {
      setFocusModeActive(true);
    }

    // Check permissions and load installed apps on Android
    if (isCapacitor()) {
      checkPermissions();
      loadInstalledApps();
    }

    const unsubscribeSettings = storage.onChange('settings', () => {
      setSettings(storage.getSettings());
      setDailyUsage(storage.getDailyAppUsage());
    });

    // Subscribe to storage changes for blocked apps to keep quick actions in sync
    const unsubscribeApps = storage.onChange('blockedApps', () => {
      loadInstalledApps();
    });

    return () => {
      unsubscribeSettings();
      unsubscribeApps();
    };
  }, []);

  const toggleApp = async (id: string) => {
    const app = apps.find(a => a.id === id);
    if (!app) return;
    try {
      await toggle.mutateAsync({ id, blocked: !app.isEnabled }); // API uses is_enabled logic
    } catch (error: any) {
       console.error("Toggle error:", error);
       toast.error(error.message || "Failed to toggle app");
    }
  };

  const toggleStrictMode = (checked: boolean) => {
    const newSettings = { ...settings, strictMode: checked };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  const startFocusSession = async () => {
    let hasBlockedApps = false;
    
    if (onAndroid) {
      const androidBlockedApps = JSON.parse(localStorage.getItem("android_blocked_apps") || "[]");
      hasBlockedApps = androidBlockedApps.length > 0;
    } else {
      const enabledApps = apps.filter(app => app.isEnabled);
      hasBlockedApps = enabledApps.length > 0;
    }

    if (!hasBlockedApps) {
      toast.error('Please select at least one app to block');
      return;
    }

    if (storage.isTimeLimitExceeded()) {
      toast.error('Daily time limit exceeded. Apps are blocked.');
      return;
    }

    // Android blocking is now handled by PersistentBlockerManager listening to session changes.
    // We just need to start the session.

    // Schedule notification for when the session ends
    await NotificationManager.scheduleFocusEnd(focusDuration);
    console.log('Notification scheduled for session end');

    storage.startFocusSession(focusDuration);
    setFocusModeActive(true);

    window.postMessage({
      type: 'OMIT_SYNC_REQUEST',
      payload: {
        blockedApps: apps,
        focusMode: true,
        strictMode: settings.strictMode
      }
    }, '*');

    toast.success(`Focus session started for ${focusDuration} minutes`);
    navigate('/timer');
  };

  const getAppsByCategory = (category: string) => {
    const categoryApps = defaultApps.find(c => c.category === category)?.apps || [];
    return apps.filter(app => 
      categoryApps.some(ca => ca.url === app.url)
    );
  };

  const getSelectedCount = (category: string) => {
    return getAppsByCategory(category).filter(app => app.isEnabled).length;
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const remainingTime = settings.dailyTimeLimitEnabled 
    ? storage.getRemainingTime()
    : Infinity;
  const isTimeLimitExceeded = settings.dailyTimeLimitEnabled && remainingTime <= 0;
  const onAndroid = isCapacitor();

  return (
    <div className="min-h-screen flex flex-col pb-36 relative overflow-hidden bg-background selection:bg-primary/20">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30 supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center px-4 h-16 max-w-md mx-auto w-full justify-between">
          <button 
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted/50 transition-colors -ml-2 group"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
          <div className="flex flex-col items-center">
             <h1 className="text-lg font-bold tracking-tight">App Shield</h1>
             <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Focus Mode</p>
          </div>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
      </header>

      <main className="flex-1 px-5 pt-6 max-w-md mx-auto w-full space-y-6 animate-fade-in relative z-10">
        
        {/* Session Configuration Card */}
        <section className="bg-card/40 backdrop-blur-xl rounded-[32px] p-2 border border-white/10 shadow-sm overflow-hidden">
          {/* Duration Selector */}
          <div className="p-4 border-b border-white/5">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                     <Timer className="w-4 h-4" />
                   </div>
                   <span className="text-sm font-bold text-foreground">Duration</span>
                </div>
                <span className="text-xs font-mono font-bold bg-muted px-2 py-1 rounded-lg text-muted-foreground">
                   {focusDuration}m
                </span>
             </div>
             
             <div className="flex gap-2 overflow-x-auto no-scrollbar mask-fade-right pb-1">
               {[15, 25, 45, 60, 90].map((mins) => (
                 <button
                   key={mins}
                   onClick={() => setFocusDuration(mins)}
                   className={cn(
                     "flex-none h-10 px-4 rounded-xl text-xs font-bold transition-all duration-300",
                     focusDuration === mins 
                       ? "bg-primary text-white shadow-lg shadow-primary/25 scale-100 ring-2 ring-primary/20" 
                       : "bg-background/50 text-muted-foreground hover:bg-background hover:text-foreground"
                   )}
                 >
                   {mins}m
                 </button>
               ))}
               <button
                 onClick={() => setIsModalOpen(true)}
                 className={cn(
                   "flex-none h-10 px-4 rounded-xl text-xs font-bold transition-all duration-300",
                   ![15, 25, 45, 60, 90].includes(focusDuration)
                     ? "bg-primary text-white shadow-lg shadow-primary/25" 
                     : "bg-background/50 text-muted-foreground hover:bg-background hover:text-foreground"
                 )}
               >
                 Custom
               </button>
             </div>
          </div>

          {/* Strict Mode Toggle */}
          <div 
            onClick={() => toggleStrictMode(!settings.strictMode)}
            className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer group"
          >
             <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg transition-colors ${settings.strictMode ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'}`}>
                   <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold block">Strict Mode</span>
                  <span className="text-[10px] text-muted-foreground font-medium">Prevent stopping session</span>
                </div>
             </div>
             <Switch checked={settings.strictMode} onCheckedChange={toggleStrictMode} className="scale-90" />
          </div>
        </section>

        {/* Quick Block Grid (Android / Web) */}
        {onAndroid && permissions?.allGranted && installedApps.length > 0 && (
          <section className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Block</h3>
             </div>
             
             <div className="grid grid-cols-4 gap-4">
               {installedApps.slice(0, 7).map((app) => {
                 const isBlocked = app.blockMode !== 'off';
                 return (
                   <button 
                     key={app.packageName}
                     onClick={() => {
                        let nextMode: 'off' | 'session' | 'persistent' = 'session';
                        if (app.blockMode === 'session') nextMode = 'persistent';
                        else if (app.blockMode === 'persistent') nextMode = 'off';
                        storage.toggleAndroidApp(app.packageName, nextMode);
                     }}
                     className="flex flex-col items-center gap-2 group"
                   >
                     <div className={cn(
                       "size-14 rounded-[18px] flex items-center justify-center shadow-sm relative transition-all duration-300 group-active:scale-95 border border-white/5",
                       isBlocked ? "bg-card" : "bg-card/50 grayscale-[0.8] opacity-70"
                     )}>
                        {app.icon ? (
                          <img src={`data:image/png;base64,${app.icon}`} alt={app.appName} className="size-8 object-contain" />
                        ) : (
                          <Smartphone className="w-6 h-6 text-foreground" />
                        )}
                        
                        {/* Status Indicator Badge */}
                        {isBlocked && (
                          <div className={cn(
                            "absolute -top-1 -right-1 size-5 rounded-full border-[3px] border-background flex items-center justify-center shadow-sm z-10",
                            app.blockMode === 'persistent' ? "bg-red-500" : "bg-amber-400"
                          )}>
                             {app.blockMode === 'persistent' && <Ban className="w-2 h-2 text-white stroke-[3px]" />}
                          </div>
                        )}
                     </div>
                     <span className="text-[10px] font-medium text-center truncate w-full px-1 opacity-80">{app.appName}</span>
                   </button>
                 );
               })}
               
                 {/* Add App Button */}
                 <button 
                   onClick={() => {
                     const element = document.querySelector('[data-android-blocker]');
                     element?.scrollIntoView({ behavior: 'smooth' });
                   }}
                   className="flex flex-col items-center gap-2 group"
                 >
                   <div className="size-14 rounded-[18px] bg-muted/30 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center transition-all group-active:scale-95 group-hover:border-primary/50 group-hover:bg-primary/5">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                   </div>
                   <span className="text-[10px] font-medium text-center opacity-60">Add</span>
                 </button>
             </div>
          </section>
        )}

        {/* Web Apps List */}
        {!onAndroid && defaultApps.map((category, catIndex) => {
          const categoryApps = getAppsByCategory(category.category);
          if (categoryApps.length === 0) return null;

          return (
            <div key={category.category} className="space-y-3 animate-fade-up" style={{ animationDelay: `${(catIndex * 0.1)}s` }}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">{category.category}</h3>
              <div className="bg-card/40 backdrop-blur-xl rounded-[24px] border border-white/10 shadow-sm overflow-hidden divide-y divide-white/5">
                {categoryApps.map((app) => {
                   const iconData = appIcons[app.url] || { icon: Ban, color: 'bg-muted' };
                   return (
                     <div 
                       key={app.id} 
                       onClick={() => toggleApp(app.id)}
                       className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer group"
                     >
                        <div className={`size-10 rounded-xl ${iconData.color} text-white flex items-center justify-center shadow-sm`}>
                           <iconData.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="font-bold text-sm text-foreground">{app.name}</p>
                           <p className="text-[10px] text-muted-foreground truncate">{app.url}</p>
                        </div>
                        <Switch 
                          checked={app.isEnabled} 
                          onCheckedChange={() => toggleApp(app.id)}
                          className="scale-90 data-[state=checked]:bg-destructive" 
                        />
                     </div>
                   );
                })}
              </div>
            </div>
          );
        })}

        {/* Android App List Wrapper */}
         {onAndroid && <div data-android-blocker className="bg-card/40 backdrop-blur-xl rounded-[32px] p-4 border border-white/10"><AndroidAppBlocker /></div>}

      </main>

      {/* Floating Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-8 z-30 bg-gradient-to-t from-background via-background/95 to-transparent pt-10 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button 
            onClick={startFocusSession}
            disabled={focusModeActive || isTimeLimitExceeded}
            className="w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 group relative overflow-hidden"
            style={{ 
              background: 'var(--gradient-primary)',
            }}
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <div className="relative flex items-center gap-2">
               {focusModeActive ? <Timer className="w-5 h-5 animate-pulse" /> : isTimeLimitExceeded ? <Ban className="w-5 h-5" /> : <Play className="w-6 h-6 fill-current" />}
               <span>{focusModeActive ? 'Session Active' : isTimeLimitExceeded ? 'Daily Limit Reached' : 'Start Focus'}</span>
            </div>
          </button>
        </div>
      </div>

      <CustomTimeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(mins) => setFocusDuration(mins)}
        initialValue={focusDuration}
        title="Custom Duration"
      />
    </div>
  );
}
