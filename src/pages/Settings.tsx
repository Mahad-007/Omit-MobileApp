import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { storage } from "@/lib/storage";
import { Switch } from "@/components/ui/switch";
import CustomTimeModal from "@/components/CustomTimeModal";
import {
  ChevronLeft,
  User,
  Check,
  Moon,
  ShieldCheck,
  Timer,
  Ban,
  Bell,
  LogOut,
  LogIn,
  Cloud
} from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(storage.getSettings());
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  // Refresh settings when they change (e.g. synced from another device)
  useEffect(() => {
    return storage.onChange('settings', () => setSettings(storage.getSettings()));
  }, []);

  const handleSettingChange = (key: keyof typeof settings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const isGuest = !user;
  const userName = user?.email?.split('@')[0] || 'Guest';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <div className="min-h-screen flex flex-col pb-24 relative overflow-hidden bg-background selection:bg-primary/20">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[min(500px,120vw)] h-[min(500px,120vw)] bg-primary/5 rounded-full blur-[100px] animate-gentle-float" style={{ animationDuration: '13s' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[min(400px,100vw)] h-[min(400px,100vw)] bg-blue-500/5 rounded-full blur-[100px] animate-gentle-float" style={{ animationDuration: '17s', animationDelay: '5s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30 supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center px-6 tablet:px-10 h-16 tablet:h-20 w-full">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 tablet:w-12 tablet:h-12 flex items-center justify-center rounded-xl hover:bg-muted/50 transition-colors -ml-2 group"
          >
            <ChevronLeft className="w-5 h-5 tablet:w-6 tablet:h-6 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
          <h1 className="text-lg tablet:text-xl font-bold tracking-tight ml-2">Settings</h1>
        </div>
      </header>

      <main className="flex-1 px-6 tablet:px-10 pt-6 tablet:pt-8 w-full space-y-5 tablet:space-y-6 relative z-10">

        {/* Profile Card */}
        <section className="bg-card/40 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-sm relative overflow-hidden group animate-fade-up">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-100" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="relative shrink-0">
              <div className={`size-16 rounded-[20px] flex items-center justify-center text-white shadow-lg ring-4 ring-white/5 ${isGuest ? 'bg-gradient-to-br from-muted-foreground to-slate-600' : 'bg-gradient-to-br from-primary to-violet-600 shadow-primary/20'}`}>
                <User className="w-8 h-8" />
              </div>
              {!isGuest && (
                <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-emerald-500 border-4 border-card flex items-center justify-center shadow-sm">
                  <Check className="w-3 h-3 text-white stroke-[4px]" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-xl truncate leading-tight tracking-tight">{displayName}</h2>
              {isGuest ? (
                <p className="text-muted-foreground text-sm font-medium opacity-80 mt-1">Sign in to enable cloud sync</p>
              ) : (
                <p className="text-muted-foreground text-sm truncate font-medium opacity-80 mt-1">{user?.email}</p>
              )}
            </div>
          </div>
        </section>

        {/* Preferences List */}
        <section className="bg-card/40 backdrop-blur-xl rounded-[32px] p-2 border border-white/10 shadow-sm overflow-hidden animate-fade-up stagger-1">
             {/* Dark Mode Row */}
             <div 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center justify-between p-4 rounded-[24px] hover:bg-primary/5 transition-colors cursor-pointer group"
             >
                <div className="flex items-center gap-4">
                  <div className={`size-12 tablet:size-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${theme === 'dark' ? 'bg-orange-500/20 text-orange-500' : 'bg-muted text-muted-foreground group-hover:bg-orange-500/10 group-hover:text-orange-500'}`}>
                    <Moon className="w-6 h-6 tablet:w-7 tablet:h-7" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm tablet:text-base font-bold block text-foreground">Dark Mode</span>
                    <span className="text-xs tablet:text-sm text-muted-foreground font-medium">Adjust appearance</span>
                  </div>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="origin-right scale-90" />
             </div>

             {/* Strict Mode Row */}
             <div 
                onClick={() => handleSettingChange('strictMode', !settings.strictMode)}
                className="flex items-center justify-between p-4 rounded-[24px] hover:bg-primary/5 transition-colors cursor-pointer group"
             >
                <div className="flex items-center gap-4">
                  <div className={`size-12 tablet:size-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${settings.strictMode ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground group-hover:bg-red-500/10 group-hover:text-red-500'}`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm tablet:text-base font-bold block text-foreground">Strict Mode</span>
                    <span className="text-xs tablet:text-sm text-muted-foreground font-medium">Prevent changes during focus</span>
                  </div>
                </div>
                <Switch checked={settings.strictMode} onCheckedChange={(c) => handleSettingChange('strictMode', c)} className="origin-right scale-90" />
             </div>

             {/* Reminders Row */}
             <div 
                onClick={() => handleSettingChange('taskReminders', !settings.taskReminders)}
                className="flex items-center justify-between p-4 rounded-[24px] hover:bg-primary/5 transition-colors cursor-pointer group"
             >
                <div className="flex items-center gap-4">
                  <div className={`size-12 tablet:size-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${settings.taskReminders ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground group-hover:bg-blue-500/10 group-hover:text-blue-500'}`}>
                    <Bell className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm tablet:text-base font-bold block text-foreground">Reminders</span>
                    <span className="text-xs tablet:text-sm text-muted-foreground font-medium">Notifications for tasks</span>
                  </div>
                </div>
                <Switch checked={settings.taskReminders} onCheckedChange={(c) => handleSettingChange('taskReminders', c)} className="origin-right scale-90" />
             </div>
        </section>

        {/* Focus Configuration Card (Bento Large) */}
        <section className="bg-card/40 backdrop-blur-xl rounded-[32px] p-2 border border-white/10 shadow-sm overflow-hidden animate-fade-up stagger-2">
          <div className="p-4 border-b border-border/40 flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-xl text-primary">
               <Timer className="w-5 h-5" />
             </div>
             <div>
                <h3 className="text-sm font-bold">Focus Configuration</h3>
                <p className="text-xs text-muted-foreground font-medium">Customize your deep work sessions</p>
             </div>
          </div>
          
          <div className="p-2 space-y-2">
            {/* Focus Duration */}
            <div className="p-4 rounded-3xl bg-background/40 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-foreground/80">Default Duration</span>
                <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                  {settings.defaultFocusDuration}m
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar mask-fade-right pb-1">
                {[15, 25, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleSettingChange('defaultFocusDuration', mins)}
                    className={`flex-none h-10 px-5 rounded-2xl text-xs font-bold transition-all duration-300 ${
                      settings.defaultFocusDuration === mins 
                        ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-100 ring-2 ring-primary/20 ring-offset-2 ring-offset-background' 
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
                <button
                  onClick={() => setIsFocusModalOpen(true)}
                  className={`flex-none h-10 px-5 rounded-2xl text-xs font-bold transition-all duration-300 ${
                    ![15, 25, 45, 60, 90].includes(settings.defaultFocusDuration)
                        ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Daily Limit */}
            <div className="p-4 rounded-3xl bg-background/40 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground/80">Daily App Limit</span>
                  <Switch 
                    checked={settings.dailyTimeLimitEnabled}
                    onCheckedChange={(c) => handleSettingChange('dailyTimeLimitEnabled', c)}
                    className="scale-75"
                  />
                </div>
                {settings.dailyTimeLimitEnabled && (
                  <span className="text-xs font-mono font-bold bg-orange-500/10 text-orange-600 px-3 py-1 rounded-full border border-orange-500/20">
                    {settings.dailyTimeLimitMinutes}m
                  </span>
                )}
              </div>
              
              <div className={`transition-all duration-500 ease-spring overflow-hidden ${settings.dailyTimeLimitEnabled ? 'opacity-100 max-h-20' : 'opacity-40 max-h-20 grayscale pointer-events-none'}`}>
                 <div className="flex gap-2 overflow-x-auto no-scrollbar mask-fade-right pb-1">
                  {[30, 60, 120, 180].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleSettingChange('dailyTimeLimitMinutes', mins)}
                      className={`flex-none h-10 px-5 rounded-2xl text-xs font-bold transition-all duration-300 ${
                        settings.dailyTimeLimitMinutes === mins 
                          ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg shadow-orange-500/20' 
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {mins >= 60 ? `${mins/60}h` : `${mins}m`}
                    </button>
                  ))}
                   <button
                    onClick={() => setIsLimitModalOpen(true)}
                    className={`flex-none h-10 px-5 rounded-2xl text-xs font-bold transition-all duration-300 ${
                       ![30, 60, 120, 180].includes(settings.dailyTimeLimitMinutes)
                          ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg shadow-orange-500/20' 
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth Button */}
        {isGuest ? (
          <div className="space-y-3 animate-fade-up stagger-3">
            <div className="flex items-center gap-3 px-1 py-2 bg-primary/5 rounded-2xl border border-primary/10">
              <Cloud className="w-5 h-5 text-primary ml-3 shrink-0" />
              <p className="text-xs text-muted-foreground">Sign in to back up your data and sync across devices.</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-primary/10 backdrop-blur-md rounded-[24px] p-4 border border-primary/20 shadow-sm flex items-center justify-center gap-2 group hover:bg-primary hover:text-white transition-all duration-300"
            >
              <LogIn className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
              <span className="text-sm font-bold text-primary group-hover:text-white transition-colors">Sign In / Create Account</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            className="w-full bg-red-500/5 backdrop-blur-md rounded-[24px] p-4 border border-red-500/10 shadow-sm flex items-center justify-center gap-2 group hover:bg-red-500 hover:text-white transition-all duration-300"
          >
            <LogOut className="w-5 h-5 text-red-500 group-hover:text-white transition-colors" />
            <span className="text-sm font-bold text-red-500 group-hover:text-white transition-colors">Sign Out</span>
          </button>
        )}

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
