import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { storage } from "@/lib/storage";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(storage.getSettings());
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

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
    <div className="min-h-screen flex flex-col pb-24">
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
            Settings
          </h2>
        </div>
      </header>

      <main className="flex-1 px-4 pb-10 space-y-6">
        {/* Profile Section */}
        <section className="mt-4">
          <div className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card">
            <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">person</span>
            </div>
            <div className="flex-1">
              <p className="text-foreground text-lg font-bold">{displayName}</p>
              <p className="text-muted-foreground text-sm">{user?.email || "Not logged in"}</p>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="space-y-2">
          <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-60 px-1">
            Appearance
          </h3>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">dark_mode</span>
                <div>
                  <p className="text-foreground text-base font-medium">Dark Mode</p>
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
        <section className="space-y-2">
          <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-60 px-1">
            Focus Settings
          </h3>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">verified_user</span>
                <div>
                  <p className="text-foreground text-base font-medium">Strict Mode</p>
                  <p className="text-muted-foreground text-xs">Cannot disable blocking once started</p>
                </div>
              </div>
              <Switch 
                checked={settings.strictMode}
                onCheckedChange={(checked) => handleSettingChange('strictMode', checked)}
              />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-primary">timer</span>
                <p className="text-foreground text-base font-medium">Default Focus Duration</p>
              </div>
              <div className="flex gap-2">
                {[15, 25, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleSettingChange('defaultFocusDuration', mins)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      settings.defaultFocusDuration === mins 
                        ? 'bg-primary text-white' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-2">
          <h3 className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-60 px-1">
            Notifications
          </h3>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">notifications</span>
                <div>
                  <p className="text-foreground text-base font-medium">Task Reminders</p>
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
                <span className="material-symbols-outlined text-primary">warning</span>
                <div>
                  <p className="text-foreground text-base font-medium">Focus Alerts</p>
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
        <section className="space-y-3 pt-4">
          <button 
            onClick={handleSignOut}
            className="w-full py-4 rounded-xl bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </section>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-muted-foreground text-xs">Settings are saved automatically</p>
          <p className="text-muted-foreground/60 text-xs mt-2">Deep Work OS v1.0</p>
        </div>
      </main>
    </div>
  );
}
