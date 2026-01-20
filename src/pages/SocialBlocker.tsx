import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { storage, BlockedApp, Settings } from "@/lib/storage";
import { toast } from "sonner";
import { AndroidAppBlocker } from "@/components/AndroidAppBlocker";
import AppBlocker, { isCapacitor } from "@/lib/app-blocker";
import { Switch } from "@/components/ui/switch";

// Default app categories
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

export default function SocialBlocker() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<BlockedApp[]>([]);
  const [settings, setSettings] = useState<Settings>(storage.getSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(0);

  useEffect(() => {
    // Load apps from storage or use defaults
    const savedApps = storage.getBlockedApps();
    if (savedApps.length === 0) {
      // Initialize with default apps
      const initialApps: BlockedApp[] = defaultApps.flatMap(cat => 
        cat.apps.map((app, idx) => ({
          ...app,
          id: `${cat.category.toLowerCase().replace(' ', '-')}-${idx}`,
        }))
      );
      storage.saveBlockedApps(initialApps);
      setApps(initialApps);
    } else {
      setApps(savedApps);
    }

    // Load settings
    const loadedSettings = storage.getSettings();
    setSettings(loadedSettings);
    setFocusDuration(loadedSettings.defaultFocusDuration);
    setDailyUsage(storage.getDailyAppUsage());

    // Check for active session
    const session = storage.getActiveSession();
    if (session) {
      setFocusModeActive(true);
    }

    // Subscribe to settings changes
    const unsubscribeSettings = storage.onChange('settings', () => {
      setSettings(storage.getSettings());
      setDailyUsage(storage.getDailyAppUsage());
    });

    return () => {
      unsubscribeSettings();
    };
  }, []);

  const toggleApp = (id: string) => {
    const updatedApps = apps.map(app => 
      app.id === id ? { ...app, isEnabled: !app.isEnabled } : app
    );
    setApps(updatedApps);
    storage.saveBlockedApps(updatedApps);
  };

  const toggleStrictMode = (checked: boolean) => {
    const newSettings = { ...settings, strictMode: checked };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  const handleSaveConfig = () => {
    storage.saveBlockedApps(apps);
    
    // Sync to extension
    window.postMessage({
      type: 'OMIT_SYNC_REQUEST',
      payload: {
        blockedApps: apps,
        focusMode: focusModeActive,
        strictMode: settings.strictMode
      }
    }, '*');

    toast.success('Configuration saved!');
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

    // Check if time limit is exceeded
    if (storage.isTimeLimitExceeded()) {
      toast.error('Daily time limit exceeded. Apps are blocked.');
      return;
    }

    // Start native blocking for Android
    if (onAndroid) {
      try {
        const androidBlockedApps = JSON.parse(localStorage.getItem("android_blocked_apps") || "[]");
        await AppBlocker.setBlockedApps({ apps: androidBlockedApps });
        await AppBlocker.startMonitoring();
        localStorage.setItem("android_monitoring", "true");
      } catch (error) {
        console.error("Failed to enable native blocking", error);
        toast.error("Failed to enable app blocking on device");
      }
    }

    storage.startFocusSession(focusDuration);
    setFocusModeActive(true);

    // Sync to extension
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

  const getAppIcon = (url: string) => {
    if (url.includes('instagram')) return 'photo_camera';
    if (url.includes('tiktok')) return 'music_note';
    if (url.includes('youtube')) return 'play_circle';
    if (url.includes('twitter')) return 'alternate_email';
    if (url.includes('facebook')) return 'people';
    if (url.includes('netflix')) return 'movie';
    if (url.includes('twitch')) return 'videogame_asset';
    if (url.includes('reddit')) return 'forum';
    return 'block';
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Calculate remaining time
  const remainingTime = settings.dailyTimeLimitEnabled 
    ? storage.getRemainingTime()
    : Infinity;
  const isTimeLimitExceeded = settings.dailyTimeLimitEnabled && remainingTime <= 0;

  // Check if we're on Android (Capacitor)
  const onAndroid = isCapacitor();

  return (
    <div className="min-h-screen flex flex-col pb-48">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md">
        <div className="flex items-center p-4 pb-2 justify-between">
          <button 
            onClick={() => navigate('/')}
            className="text-primary flex size-12 shrink-0 items-center cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back_ios_new</span>
          </button>
          <h2 className="text-foreground text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
            App Blocker
          </h2>
        </div>

        {/* Daily Limit Status */}
        {settings.dailyTimeLimitEnabled && (
          <div className={`mx-4 mb-3 p-3 rounded-xl flex items-center gap-3 ${
            isTimeLimitExceeded 
              ? 'bg-destructive/10 border border-destructive/20' 
              : 'bg-primary/10 border border-primary/20'
          }`}>
            <span className={`material-symbols-outlined ${isTimeLimitExceeded ? 'text-destructive' : 'text-primary'}`}>
              {isTimeLimitExceeded ? 'block' : 'timer'}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${isTimeLimitExceeded ? 'text-destructive' : 'text-foreground'}`}>
                {isTimeLimitExceeded ? 'Daily Limit Reached' : `${formatTime(remainingTime)} remaining today`}
              </p>
              <p className="text-xs text-muted-foreground">
                {isTimeLimitExceeded ? 'Apps are automatically blocked' : `Used ${formatTime(dailyUsage)} of ${formatTime(settings.dailyTimeLimitMinutes)}`}
              </p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="flex w-full items-stretch rounded-xl h-12 overflow-hidden bg-card border border-border">
            <div className="text-muted-foreground flex items-center justify-center pl-4">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
            </div>
            <input 
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-foreground focus:outline-none focus:ring-0 border-none bg-transparent h-full placeholder:text-muted-foreground px-4 pl-2 text-base font-normal leading-normal" 
              placeholder="Search apps..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 space-y-6">
        {/* Strict Mode Card */}
        <section>
          <div className="flex flex-col gap-4 rounded-xl p-5 border border-border bg-card/40 zen-card-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">verified_user</span>
                <div>
                  <p className="text-foreground text-base font-bold">Strict Mode</p>
                  <p className="text-muted-foreground text-xs">Cannot disable blocking once started</p>
                </div>
              </div>
              <Switch 
                checked={settings.strictMode}
                onCheckedChange={toggleStrictMode}
              />
            </div>
          </div>
        </section>

        {/* Focus Duration Card */}
        <section>
          <div className="flex flex-col gap-4 rounded-xl p-5 border border-border bg-card/40 zen-card-shadow">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">timer</span>
              <p className="text-foreground text-base font-bold">Focus Duration</p>
            </div>
            <div className="flex gap-2">
              {[15, 25, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setFocusDuration(mins)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    focusDuration === mins 
                      ? 'bg-primary text-white' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Android App Blocker - Only on Android */}
        {onAndroid && <AndroidAppBlocker />}

        {/* Web App Categories - Only on Web (not Android) */}
        {!onAndroid && defaultApps.map((category) => {
          const categoryApps = getAppsByCategory(category.category);
          if (categoryApps.length === 0) return null;

          return (
            <section key={category.category} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-60">
                  {category.category}
                </h3>
                <span className={`text-xs font-medium ${getSelectedCount(category.category) > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {getSelectedCount(category.category)} selected
                </span>
              </div>
              <div className="space-y-3">
                {categoryApps.map((app) => (
                  <div 
                    key={app.id}
                    className="flex items-center gap-4 rounded-xl px-4 py-4 justify-between border border-border bg-card/40 zen-card-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="aspect-square rounded-xl size-12 border border-border flex items-center justify-center bg-muted/50"
                      >
                        <span className="material-symbols-outlined text-xl text-muted-foreground">
                          {getAppIcon(app.url)}
                        </span>
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-foreground text-base font-semibold leading-normal">{app.name}</p>
                        <p className="text-muted-foreground text-xs font-medium leading-normal">
                          {app.isEnabled ? 'Blocked during sessions' : 'Allowed'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={app.isEnabled}
                      onCheckedChange={() => toggleApp(app.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* Fixed Bottom Actions */}
      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-24 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent z-10">
        <div className="max-w-[430px] mx-auto flex gap-3">
          <button 
            onClick={startFocusSession}
            disabled={focusModeActive || isTimeLimitExceeded}
            className="flex-1 bg-primary text-white font-bold py-4 rounded-xl soft-glow hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-xl">play_arrow</span>
            <span>{focusModeActive ? 'Session Active' : isTimeLimitExceeded ? 'Limit Reached' : 'Start Focus'}</span>
          </button>
        </div>
        {/* iOS Home Indicator Spacing */}
        <div className="h-4"></div>
      </div>
    </div>
  );
}
