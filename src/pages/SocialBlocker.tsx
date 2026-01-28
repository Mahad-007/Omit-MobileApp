import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { storage, BlockedApp, Settings } from "@/lib/storage";
import { useBlockedApps } from "@/lib/api";
import { toast } from "sonner";
import { AndroidAppBlocker } from "@/components/AndroidAppBlocker";
import AppBlocker, { isCapacitor } from "@/lib/app-blocker";
import { Switch } from "@/components/ui/switch";
import { NotificationManager } from "@/utils/notifications";

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

const appIcons: Record<string, { icon: string; color: string }> = {
  'instagram.com': { icon: 'photo_camera', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  'tiktok.com': { icon: 'music_note', color: 'bg-gradient-to-br from-cyan-400 to-pink-500' },
  'twitter.com': { icon: 'alternate_email', color: 'bg-sky-500' },
  'facebook.com': { icon: 'people', color: 'bg-blue-600' },
  'youtube.com': { icon: 'play_circle', color: 'bg-red-500' },
  'netflix.com': { icon: 'movie', color: 'bg-red-600' },
  'twitch.tv': { icon: 'videogame_asset', color: 'bg-purple-600' },
  'reddit.com': { icon: 'forum', color: 'bg-orange-500' },
};

export default function SocialBlocker() {
  const navigate = useNavigate();
  const { data: apps = [], toggle } = useBlockedApps();
  const [settings, setSettings] = useState<Settings>(storage.getSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(0);

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

    const unsubscribeSettings = storage.onChange('settings', () => {
      setSettings(storage.getSettings());
      setDailyUsage(storage.getDailyAppUsage());
    });

    return () => unsubscribeSettings();
  }, []);

  const toggleApp = async (id: string) => {
    const app = apps.find(a => a.id === id);
    if (!app) return;
    try {
      await toggle.mutateAsync({ id, blocked: !app.isEnabled }); // API uses is_enabled logic
    } catch (error) {
       toast.error("Failed to toggle app");
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
    if (NotificationManager.scheduleFocusEnd(focusDuration)) {
       console.log('Notification scheduled for session end');
    }

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
      categoryApps.some(ca => ca.url === app.url) &&
      (searchQuery === '' || app.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
      <header className="sticky top-0 z-20 bg-background border-b border-border/30">
        <div className="flex items-center p-4 pb-3 justify-between">
          <button 
            onClick={() => navigate('/')}
            className="text-primary flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card/80 border border-border/50 transition-colors hover:bg-accent"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back_ios_new</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight">App Blocker</h1>
          <div className="size-11" /> {/* Spacer for centering */}
        </div>

        {/* Daily Limit Status */}
        {settings.dailyTimeLimitEnabled && (
          <div className={`mx-4 mb-3 p-4 rounded-2xl flex items-center gap-3 ${
            isTimeLimitExceeded 
              ? 'bg-destructive/10 border border-destructive/20' 
              : 'bg-primary/10 border border-primary/20'
          }`}>
            <div className={`size-10 rounded-xl flex items-center justify-center ${
              isTimeLimitExceeded ? 'bg-destructive/20' : 'bg-primary/20'
            }`}>
              <span className={`material-symbols-outlined ${isTimeLimitExceeded ? 'text-destructive' : 'text-primary'}`}>
                {isTimeLimitExceeded ? 'block' : 'timer'}
              </span>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${isTimeLimitExceeded ? 'text-destructive' : 'text-foreground'}`}>
                {isTimeLimitExceeded ? 'Daily Limit Reached' : `${formatTime(remainingTime)} remaining`}
              </p>
              <p className="text-xs text-muted-foreground">
                {isTimeLimitExceeded ? 'Apps are automatically blocked' : `Used ${formatTime(dailyUsage)} today`}
              </p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="flex w-full items-center rounded-2xl h-12 overflow-hidden bg-card border border-border/50">
            <div className="text-muted-foreground flex items-center justify-center pl-4">
              <span className="material-symbols-outlined text-lg">search</span>
            </div>
            <input 
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-foreground focus:outline-none border-none bg-transparent h-full placeholder:text-muted-foreground px-3 text-sm font-medium" 
              placeholder="Search apps..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 space-y-5 pt-4">
        {/* Strict Mode Card */}
        <section className="animate-fade-up">
          <div className="flex items-center justify-between p-5 rounded-2xl border border-border/50 bg-card zen-card-shadow">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-primary/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">verified_user</span>
              </div>
              <div>
                <p className="text-foreground text-base font-bold">Strict Mode</p>
                <p className="text-muted-foreground text-xs">Cannot disable once started</p>
              </div>
            </div>
            <Switch 
              checked={settings.strictMode}
              onCheckedChange={toggleStrictMode}
            />
          </div>
        </section>

        {/* Quick Actions Component */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {(() => {
            const quickApps = [
              { name: 'YouTube', url: 'youtube.com', icon: 'play_circle', color: 'bg-red-500' },
              { name: 'Instagram', url: 'instagram.com', icon: 'photo_camera', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
              { name: 'Facebook', url: 'facebook.com', icon: 'people', color: 'bg-blue-600' },
            ];

            return quickApps.map((qApp) => {
              const app = apps.find(a => a.url === qApp.url);
              const isEnabled = app?.isEnabled || false;
              
              return (
                <button 
                  key={qApp.name}
                  onClick={() => app && toggleApp(app.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all min-w-[72px] press-effect ${
                    isEnabled 
                      ? 'bg-card border-primary/50 opacity-100 shadow-md transform scale-105' 
                      : 'bg-card/60 border-border/50 opacity-60'
                  }`}
                >
                  <div className={`size-12 rounded-xl flex items-center justify-center shadow-lg relative ${qApp.color}`}>
                    <span className="material-symbols-outlined text-white text-xl">{qApp.icon}</span>
                    {isEnabled && (
                      <div className="absolute -top-1 -right-1 size-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                         <span className="material-symbols-outlined text-[10px] text-primary font-bold">check</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold truncate max-w-[60px] ${
                    isEnabled ? 'text-foreground' : 'text-foreground/80'
                  }`}>{qApp.name}</span>
                </button>
              );
            });
          })()}
          
          <button 
            onClick={() => {
              const searchInput = document.querySelector('input[placeholder="Search apps..."]') as HTMLInputElement;
              if (searchInput) {
                searchInput.focus();
                toast.info("Search for an app to add");
              }
            }}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-border/50 bg-card/30 min-w-[72px] hover:bg-card/60 transition-all press-effect"
          >
            <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-muted-foreground text-xl">add</span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">Add</span>
          </button>
        </div>

        {/* Focus Duration Card */}
        <section className="animate-fade-up stagger-1">
          <div className="flex flex-col gap-4 rounded-2xl p-5 border border-border/50 bg-card zen-card-shadow">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-highlight/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-highlight">timer</span>
              </div>
              <p className="text-foreground text-base font-bold">Focus Duration</p>
            </div>
            <div className="flex gap-2">
              {[15, 25, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setFocusDuration(mins)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    focusDuration === mins 
                      ? 'text-white shadow-lg' 
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                  style={focusDuration === mins ? { background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' } : {}}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Android App Blocker */}
        {onAndroid && <AndroidAppBlocker />}

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
                <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  {category.category}
                </h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  getSelectedCount(category.category) > 0 
                    ? 'bg-primary/15 text-primary' 
                    : 'text-muted-foreground'
                }`}>
                  {getSelectedCount(category.category)} selected
                </span>
              </div>
              <div className="space-y-2">
                {categoryApps.map((app) => {
                  const iconData = appIcons[app.url] || { icon: 'block', color: 'bg-muted' };
                  return (
                    <div 
                      key={app.id}
                      className="flex items-center gap-4 rounded-2xl p-4 justify-between border border-border/50 bg-card transition-all hover:bg-card/80"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`size-12 rounded-xl ${iconData.color} flex items-center justify-center shadow-lg`}>
                          <span className="material-symbols-outlined text-white text-xl">
                            {iconData.icon}
                          </span>
                        </div>
                        <div>
                          <p className="text-foreground text-base font-semibold">{app.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {app.isEnabled ? 'Blocked during sessions' : 'Allowed'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={app.isEnabled}
                        onCheckedChange={() => toggleApp(app.id)}
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
      <div className="fixed bottom-24 left-0 right-0 p-4 z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none" style={{ height: '150%', top: '-50%' }} />
        <div className="relative max-w-[430px] mx-auto">
          <button 
            onClick={startFocusSession}
            disabled={focusModeActive || isTimeLimitExceeded}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all press-effect disabled:opacity-50 disabled:cursor-not-allowed text-white"
            style={{ 
              background: 'var(--gradient-primary)',
              boxShadow: (focusModeActive || isTimeLimitExceeded) ? 'none' : 'var(--shadow-glow-lg)'
            }}
          >
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {focusModeActive ? 'timer' : isTimeLimitExceeded ? 'block' : 'play_arrow'}
            </span>
            <span>{focusModeActive ? 'Session Active' : isTimeLimitExceeded ? 'Limit Reached' : 'Start Focus Session'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
