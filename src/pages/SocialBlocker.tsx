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
    <div className="min-h-screen flex flex-col pb-48 relative">
      {/* Atmospheric backgrounds */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-64 left-0 w-64 h-64 bg-highlight/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center p-4 justify-between">
          <button 
            onClick={() => navigate('/')}
            className="touch-target-44 w-10 h-10 rounded-full bg-card border border-border/50 text-foreground hover:bg-accent transition-colors shrink-0 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold tracking-tight text-center flex-1 pr-10">App Blocker</h1>
        </div>


      </header>

      <main className="flex-1 px-4 space-y-6 pt-2">
        {/* Strict Mode Card */}
        <section className="animate-fade-up">
          <div className="flex items-center justify-between p-5 rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-foreground text-sm font-bold">Strict Mode</p>
                <p className="text-muted-foreground text-xs leading-tight max-w-[180px]">Cannot disable blocking once a session starts.</p>
              </div>
            </div>
            <Switch 
              checked={settings.strictMode}
              onCheckedChange={toggleStrictMode}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </section>

        {/* Quick Actions Component - Only show when all permissions are granted on Android */}
        {onAndroid && permissions?.allGranted && installedApps.length > 0 && (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
            {installedApps.slice(0, 6).map((app) => {
              const isBlocked = app.blockMode !== 'off';
              
              return (
                <button 
                  key={app.packageName}
                  onClick={() => {
                    // Cycle through block modes: off -> session -> persistent -> off
                    let nextMode: 'off' | 'session' | 'persistent' = 'session';
                    if (app.blockMode === 'session') nextMode = 'persistent';
                    else if (app.blockMode === 'persistent') nextMode = 'off';
                    storage.toggleAndroidApp(app.packageName, nextMode);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-3 min-w-[80px] group transition-all duration-300",
                    isBlocked ? "opacity-100" : "opacity-60 grayscale-[0.5]"
                  )}
                >
                  <div className={cn(
                    "size-14 rounded-2xl flex items-center justify-center shadow-sm relative transition-all group-hover:-translate-y-1 group-active:scale-95",
                    app.blockMode === 'persistent' ? 'bg-red-500' : 
                    app.blockMode === 'session' ? 'bg-yellow-500' : 'bg-muted'
                  )}>
                    {app.icon ? (
                      <img 
                        src={`data:image/png;base64,${app.icon}`} 
                        alt={app.appName} 
                        className="size-8 object-contain"
                      />
                    ) : (
                      <Smartphone className="w-6 h-6 text-white" />
                    )}
                    {isBlocked && (
                      <div className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-background flex items-center justify-center border border-border">
                        <div className={cn(
                          "size-3 rounded-full",
                          app.blockMode === 'persistent' ? 'bg-red-500' : 'bg-yellow-500'
                        )} />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-foreground/90 truncate max-w-[76px] text-center">
                    {app.appName}
                  </span>
                </button>
              );
            })}
            <button 
              onClick={() => {
                // Scroll to the AndroidAppBlocker section
                const element = document.querySelector('[data-android-blocker]');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex flex-col items-center gap-3 min-w-[80px] group"
            >
              <div className="size-14 rounded-2xl bg-card border-2 border-dashed border-border flex items-center justify-center group-hover:border-primary/50 group-active:scale-95 transition-all">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Add App</span>
            </button>
          </div>
        )}

        {/* Web Quick Actions - Only show when NOT on Android */}
        {!onAndroid && (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pt-[5px] -mx-4 px-4">
            {(() => {
              const quickApps = [
                { name: 'YouTube', url: 'youtube.com', icon: PlayCircle, color: 'bg-red-500' },
                { name: 'Instagram', url: 'instagram.com', icon: Camera, color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
                { name: 'Facebook', url: 'facebook.com', icon: Users, color: 'bg-blue-600' },
              ];

              return quickApps.map((qApp) => {
                const app = apps.find(a => a.url === qApp.url);
                const isEnabled = app?.isEnabled || false;
                
                return (
                  <button 
                    key={qApp.name}
                    onClick={() => app && toggleApp(app.id)}
                    className={cn(
                      "flex flex-col items-center gap-3 min-w-[72px] transition-all active:scale-95",
                      isEnabled ? "opacity-100" : "opacity-70 grayscale-[0.3]"
                    )}
                  >
                    <div className={cn("size-12 rounded-2xl flex items-center justify-center shadow-sm relative", qApp.color)}>
                      <qApp.icon className="w-5 h-5 text-white" />
                      {isEnabled && (
                        <div className="absolute -top-1 -right-1 size-4 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
                          <div className="size-2 rounded-full bg-primary" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-foreground text-center">{qApp.name}</span>
                  </button>
                );
              });
            })()}
          </div>
        )}

        {/* Focus Duration Card */}
        <section className="animate-fade-up stagger-1">
          <div className="flex flex-col gap-4 rounded-3xl p-6 border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Timer className="w-6 h-6 text-highlight" />
              <p className="text-foreground text-lg font-bold">Session Length</p>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              {[15, 25, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setFocusDuration(mins)}
                  className={cn(
                    "h-12 rounded-xl text-sm font-semibold transition-all duration-200 border",
                    focusDuration === mins 
                      ? "bg-primary text-primary-foreground border-primary/50 shadow-md transform scale-105" 
                      : "bg-background text-muted-foreground border-transparent hover:bg-accent"
                  )}
                >
                  {mins}
                </button>
              ))}
              <button
                onClick={() => setIsModalOpen(true)}
                className={cn(
                  "flex-1 min-w-[70px] py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border",
                  ![15, 25, 45, 60, 90].includes(focusDuration)
                    ? "bg-primary text-primary-foreground border-primary/50 shadow-md transform scale-105" 
                    : "bg-muted text-muted-foreground border-transparent hover:bg-accent"
                )}
              >
                {![15, 25, 45, 60, 90].includes(focusDuration) ? `${focusDuration}` : 'Custom'}
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground font-medium mt-1">minutes</p>
          </div>
        </section>

        {/* Android App Blocker */}
        {onAndroid && <div data-android-blocker><AndroidAppBlocker /></div>}

        {/* Web App Categories */}
        {!onAndroid && defaultApps.map((category, catIndex) => {
          const categoryApps = getAppsByCategory(category.category);
          if (categoryApps.length === 0) return null;

          return (
            <section 
              key={category.category} 
              className="space-y-3 animate-fade-up"
              style={{ animationDelay: `${(catIndex + 2) * 0.1}s` }}
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest pl-1">
                  {category.category}
                </h3>
              </div>
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/40 shadow-sm">
                {categoryApps.map((app) => {
                  const iconData = appIcons[app.url] || { icon: Ban, color: 'bg-muted' };
                  return (
                    <div 
                      key={app.id}
                      className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors"
                      onClick={() => toggleApp(app.id)} // Make whole row clickable
                    >
                      <div className={`size-10 rounded-xl ${iconData.color} flex items-center justify-center shrink-0 text-white`}>
                         <iconData.icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-semibold truncate">{app.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {app.isEnabled ? 'Will be blocked' : 'Allowed'}
                          </p>
                      </div>

                      <Switch
                        checked={app.isEnabled}
                        onCheckedChange={() => toggleApp(app.id)}
                        onClick={(e) => e.stopPropagation()} // Prevent double toggle
                        className="data-[state=checked]:bg-destructive"
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 z-20 bg-gradient-to-t from-background via-background/95 to-transparent pt-12">
        <div className="max-w-[430px] mx-auto">
          <button 
            onClick={startFocusSession}
            disabled={focusModeActive || isTimeLimitExceeded}
            className="w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg hover:shadow-xl"
            style={{ 
              background: 'var(--gradient-primary)',
            }}
          >
            <div className="text-2xl">
              {focusModeActive ? <Timer className="w-6 h-6" /> : isTimeLimitExceeded ? <Ban className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </div>
            <span>{focusModeActive ? 'Session Active' : isTimeLimitExceeded ? 'Limit Reached' : 'Start Focus Session'}</span>
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
