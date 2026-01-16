import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { storage, BlockedApp } from "@/lib/storage";
import { toast } from "sonner";
import { AndroidAppBlocker } from "@/components/AndroidAppBlocker";
import { isCapacitor } from "@/lib/app-blocker";

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
  const [strictMode, setStrictMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusModeActive, setFocusModeActive] = useState(false);

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
    const settings = storage.getSettings();
    setStrictMode(settings.strictMode);
    setFocusDuration(settings.defaultFocusDuration);

    // Check for active session
    const session = storage.getActiveSession();
    if (session) {
      setFocusModeActive(true);
    }
  }, []);

  const toggleApp = (id: string) => {
    const updatedApps = apps.map(app => 
      app.id === id ? { ...app, isEnabled: !app.isEnabled } : app
    );
    setApps(updatedApps);
    storage.saveBlockedApps(updatedApps);
  };

  const toggleStrictMode = () => {
    const newValue = !strictMode;
    setStrictMode(newValue);
    const settings = storage.getSettings();
    storage.saveSettings({ ...settings, strictMode: newValue });
  };

  const handleSaveConfig = () => {
    storage.saveBlockedApps(apps);
    
    // Sync to extension
    window.postMessage({
      type: 'OMIT_SYNC_REQUEST',
      payload: {
        blockedApps: apps,
        focusMode: focusModeActive,
        strictMode
      }
    }, '*');

    toast.success('Configuration saved!');
  };

  const startFocusSession = () => {
    const enabledApps = apps.filter(app => app.isEnabled);
    if (enabledApps.length === 0) {
      toast.error('Please select at least one app to block');
      return;
    }

    storage.startFocusSession(focusDuration);
    setFocusModeActive(true);

    // Sync to extension
    window.postMessage({
      type: 'OMIT_SYNC_REQUEST',
      payload: {
        blockedApps: apps,
        focusMode: true,
        strictMode
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

  // Check if we're on Android (Capacitor)
  const onAndroid = isCapacitor();

  return (
    <div className="min-h-screen flex flex-col">
      {/* TopAppBar */}
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

        {/* SearchBar */}
        <div className="px-4 py-3">
          <label className="flex flex-col min-w-40 h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full overflow-hidden shadow-sm">
              <div className="text-muted-foreground flex border-none bg-card items-center justify-center pl-4">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
              </div>
              <input 
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-foreground focus:outline-none focus:ring-0 border-none bg-card h-full placeholder:text-muted-foreground px-4 pl-2 text-base font-normal leading-normal" 
                placeholder="Search apps..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </label>
        </div>
      </header>

      <main className="flex-1 px-4 pb-10 space-y-6">
        {/* Strict Mode Toggle */}
        <section className="mt-2">
          <div className="group relative">
            <div className="flex flex-1 flex-col items-start justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
                    <p className="text-foreground text-base font-bold leading-tight">Strict Mode</p>
                  </div>
                  <p className="text-muted-foreground text-sm font-normal leading-relaxed mt-1">
                    Prevent disabling focus sessions once started. Highly recommended for deep work.
                  </p>
                </div>
                <button 
                  onClick={toggleStrictMode}
                  className={`relative flex h-[32px] w-[56px] cursor-pointer items-center rounded-full border-none p-1 transition-colors ${strictMode ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div 
                    className={`h-6 w-6 rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out ${strictMode ? 'translate-x-6' : 'translate-x-0'}`}
                    style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  ></div>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Focus Duration */}
        <section className="mt-2">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <p className="text-foreground text-base font-bold">Focus Duration</p>
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
            <section key={category.category} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-foreground text-sm font-bold uppercase tracking-widest opacity-60">
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
                    className="flex items-center gap-4 bg-card rounded-xl px-4 min-h-[80px] py-3 justify-between shadow-sm border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-xl size-14 border border-border flex items-center justify-center bg-muted"
                      >
                        <span className="material-symbols-outlined text-2xl text-muted-foreground">
                          {app.url.includes('instagram') ? 'photo_camera' :
                           app.url.includes('tiktok') ? 'music_note' :
                           app.url.includes('youtube') ? 'play_circle' :
                           app.url.includes('twitter') ? 'alternate_email' :
                           app.url.includes('facebook') ? 'people' :
                           app.url.includes('netflix') ? 'movie' :
                           app.url.includes('twitch') ? 'videogame_asset' :
                           app.url.includes('reddit') ? 'forum' : 'block'}
                        </span>
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-foreground text-base font-semibold leading-normal line-clamp-1">{app.name}</p>
                        <p className="text-muted-foreground text-xs font-medium leading-normal">
                          {app.isEnabled ? 'Blocked during sessions' : 'Allowed'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <button
                        onClick={() => toggleApp(app.id)}
                        className={`relative flex h-[28px] w-[48px] cursor-pointer items-center rounded-full border-none p-0.5 transition-all ${app.isEnabled ? 'justify-end bg-primary' : 'bg-muted'}`}
                      >
                        <div className="h-full w-[24px] rounded-full bg-white shadow-sm"></div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* Fixed Bottom Actions */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="flex gap-3">
          <button 
            onClick={handleSaveConfig}
            className="flex-1 bg-card border border-border text-foreground font-bold py-4 rounded-xl shadow-lg hover:bg-card/80 transition-all flex items-center justify-center gap-2"
          >
            <span>Save Config</span>
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </button>
          <button 
            onClick={startFocusSession}
            disabled={focusModeActive}
            className="flex-1 bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-xl">play_arrow</span>
            <span>{focusModeActive ? 'Session Active' : 'Start Focus'}</span>
          </button>
        </div>
        {/* iOS Home Indicator Spacing */}
        <div className="h-4"></div>
      </div>
    </div>
  );
}
