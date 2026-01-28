import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { storage } from "@/lib/storage";
import { Switch } from "@/components/ui/switch";
import CustomTimeModal from "@/components/CustomTimeModal";

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(storage.getSettings());
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  const handleSettingChange = (key: keyof typeof settings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
    toast.success("Settings saved!");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const userName = user?.email?.split('@')[0] || 'User';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <div className="min-h-screen flex flex-col pb-24 relative">
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
          <h1 className="text-lg font-bold tracking-tight">Settings</h1>
          <div className="size-11" />
        </div>
      </header>

      <main className="flex-1 px-4 pb-10 space-y-6 pt-4">
        {/* Profile Section */}
        <section className="animate-fade-up">
          <div className="flex items-center gap-4 p-5 rounded-2xl border border-border/50 bg-card zen-card-shadow">
            <div className="relative">
              <div className="size-16 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: 'var(--gradient-primary)' }}>
                <span className="material-symbols-outlined text-white text-3xl">person</span>
              </div>
              <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xs">check</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-foreground text-lg font-bold">{displayName}</p>
              <p className="text-muted-foreground text-sm">{user?.email || "Not logged in"}</p>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-3 animate-fade-up stagger-1">
          <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest px-1">
            Appearance
          </h3>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">dark_mode</span>
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">Dark Mode</p>
                  <p className="text-muted-foreground text-xs">Switch to dark theme</p>
                </div>
              </div>
              <Switch 
                checked={theme === 'dark'}
                onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              />
            </div>
          </div>
        </section>

        {/* Focus Settings */}
        <section className="space-y-3 animate-fade-up stagger-2">
          <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest px-1">
            Focus Settings
          </h3>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">verified_user</span>
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">Strict Mode</p>
                  <p className="text-muted-foreground text-xs">Cannot disable once started</p>
                </div>
              </div>
              <Switch 
                checked={settings.strictMode}
                onCheckedChange={(checked) => handleSettingChange('strictMode', checked)}
              />
            </div>
            <div className="p-4 border-b border-border/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl bg-highlight/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-highlight">timer</span>
                </div>
                <p className="text-foreground text-sm font-semibold">Default Focus Duration</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[15, 25, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleSettingChange('defaultFocusDuration', mins)}
                    className={`flex-1 min-w-[60px] py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      settings.defaultFocusDuration === mins 
                        ? 'text-white shadow-lg' 
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                    style={settings.defaultFocusDuration === mins ? { background: 'var(--gradient-primary)' } : {}}
                  >
                    {mins}m
                  </button>
                ))}
                <button
                  onClick={() => setIsFocusModalOpen(true)}
                  className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                    ![15, 25, 45, 60, 90].includes(settings.defaultFocusDuration)
                      ? 'text-white shadow-lg' 
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                  style={![15, 25, 45, 60, 90].includes(settings.defaultFocusDuration) ? { background: 'var(--gradient-primary)' } : {}}
                >
                  {![15, 25, 45, 60, 90].includes(settings.defaultFocusDuration) ? `${settings.defaultFocusDuration}m` : 'Custom'}
                </button>
              </div>
            </div>

            {/* Daily Limit Settings */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">block</span>
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-semibold">Daily Time Limit</p>
                    <p className="text-muted-foreground text-xs">Total app usage per day</p>
                  </div>
                </div>
                <Switch 
                  checked={settings.dailyTimeLimitEnabled}
                  onCheckedChange={(checked) => handleSettingChange('dailyTimeLimitEnabled', checked)}
                />
              </div>
              
              {settings.dailyTimeLimitEnabled && (
                <div className="space-y-4 animate-in slide-in-from-top-1 duration-200">
                  <div className="flex flex-wrap gap-2">
                    {[30, 60, 120, 180, 300].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => handleSettingChange('dailyTimeLimitMinutes', mins)}
                        className={`flex-1 min-w-[70px] py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                          settings.dailyTimeLimitMinutes === mins 
                            ? 'text-white shadow-md' 
                            : 'bg-muted text-muted-foreground hover:bg-accent'
                        }`}
                        style={settings.dailyTimeLimitMinutes === mins ? { background: 'var(--gradient-primary)' } : {}}
                      >
                        {mins >= 60 ? `${mins/60}h` : `${mins}m`}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsLimitModalOpen(true)}
                      className={`flex-1 min-w-[70px] py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                        ![30, 60, 120, 180, 300].includes(settings.dailyTimeLimitMinutes)
                          ? 'text-white shadow-md' 
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                      style={![30, 60, 120, 180, 300].includes(settings.dailyTimeLimitMinutes) ? { background: 'var(--gradient-primary)' } : {}}
                    >
                      {![30, 60, 120, 180, 300].includes(settings.dailyTimeLimitMinutes) ? `${Math.floor(settings.dailyTimeLimitMinutes/60)}h ${settings.dailyTimeLimitMinutes%60}m` : 'Custom'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-3 animate-fade-up stagger-3">
          <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest px-1">
            Notifications
          </h3>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">notifications</span>
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">Task Reminders</p>
                  <p className="text-muted-foreground text-xs">Get notified about upcoming tasks</p>
                </div>
              </div>
              <Switch 
                checked={settings.taskReminders}
                onCheckedChange={(checked) => handleSettingChange('taskReminders', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-destructive">warning</span>
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">Focus Alerts</p>
                  <p className="text-muted-foreground text-xs">Alerts when visiting blocked sites</p>
                </div>
              </div>
              <Switch 
                checked={settings.focusAlerts}
                onCheckedChange={(checked) => handleSettingChange('focusAlerts', checked)}
              />
            </div>
          </div>
        </section>

        {/* Account Actions */}
        <section className="space-y-3 pt-4 animate-fade-up stagger-4">
          <button 
            onClick={handleSignOut}
            className="w-full py-4 rounded-2xl bg-destructive/10 text-destructive font-bold hover:bg-destructive/15 transition-colors flex items-center justify-center gap-2 border border-destructive/20"
          >
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </section>

        {/* Footer */}
        <div className="text-center pt-4 animate-fade-up stagger-5">
          <p className="text-muted-foreground text-xs">Settings are saved automatically</p>
          <p className="text-muted-foreground/50 text-xs mt-2">Omit • Deep Work OS v1.0</p>
        </div>
      </main>

      <CustomTimeModal 
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        onSave={(mins) => handleSettingChange('defaultFocusDuration', mins)}
        initialValue={settings.defaultFocusDuration}
        title="Default Focus Duration"
      />

      <CustomTimeModal 
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        onSave={(mins) => handleSettingChange('dailyTimeLimitMinutes', mins)}
        initialValue={settings.dailyTimeLimitMinutes}
        title="Daily Time Limit"
      />
    </div>
  );
}
