import { DashboardCard } from "@/components/DashboardCard";
import { Shield, Clock, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { syncWithExtension as syncWithExtensionHelper } from "@/lib/extension-sync";
import { storage, BlockedApp } from "@/lib/storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AndroidAppBlocker } from "@/components/AndroidAppBlocker";
import { isCapacitor } from "@/lib/app-blocker";

export default function SocialBlocker() {
  const { user } = useAuth(); // Keep auth for user context if needed, though storage is now local
  const [apps, setApps] = useState<BlockedApp[]>([]);
  const [duration, setDuration] = useState(60);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppUrl, setNewAppUrl] = useState("");
  const [loading, setLoading] = useState(true);
  // We can track session ID if we want, but local storage handles it simpler
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Fetch blocked apps from Storage
  useEffect(() => {
    // Load apps
    const loadApps = () => {
      setApps(storage.getBlockedApps());
      setLoading(false);
    };
    
    loadApps();
    checkForActiveSession();
    
    // Sync to extension on load (push local data to extension)
    // We'll update the sync helper to pass data directly
    triggerExtensionSync();
    
    // Check local storage for active session logic handled in storage? 
    // Actually we need to manage the timer here.
  }, []);

  // Persist session state implies we need to check if there is an ongoing session
  // storage.ts doesn't explicitly track "active" session, only history. 
  // We should add a "current_session" key to storage or just use component state + localStorage persistence for the timer.
  // Let's implement a simple persistence for the active timer in this component or storage.
  
  const checkForActiveSession = () => {
    // Simple check: is there a stored end time?
    const storedSession = localStorage.getItem('focussphere_current_session');
    if (storedSession) {
      try {
        const { id, endTime, duration } = JSON.parse(storedSession);
        const now = Date.now();
        if (now < endTime) {
          setActiveSessionId(id);
          setFocusModeActive(true);
          setDuration(duration);
          setTimeRemaining(Math.round((endTime - now) / 1000));
        } else {
          // It finished while away
          localStorage.removeItem('focussphere_current_session');
          // Start a new history entry if not already present? 
          // Ideally we save history when it finishes.
        }
      } catch (e) {
        console.error("Error parsing session", e);
      }
    }
  };

  const endSession = async () => {
    if (activeSessionId) {
       // Save to history
       storage.addFocusSession({
           startTime: new Date(Date.now() - duration * 60000).toISOString(), // Approx start time
           durationMinutes: duration,
           completed: true,
           appsBlockedCount: apps.filter(a => a.blocked).length
       });
    }

    setFocusModeActive(false);
    setTimeRemaining(0);
    setActiveSessionId(null);
    localStorage.removeItem('focussphere_current_session');
    
    triggerExtensionSync(false);
    toast.success("Focus session completed!");
  };

  // Countdown timer for focus mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (focusModeActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            endSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusModeActive, timeRemaining]);

  const addApp = () => {
    if (!newAppName.trim() || !newAppUrl.trim()) {
      toast.error("Please enter both app name and URL");
      return;
    }

    const newApp = storage.saveBlockedApp({
      name: newAppName.trim(),
      url: newAppUrl.trim(),
      blocked: false, // Default to not blocked? Or true? Original 'focus' mode implies unblocked until focus.
      blockMode: "focus",
    });

    setApps(storage.getBlockedApps());
    setNewAppName("");
    setNewAppUrl("");
    setIsDialogOpen(false);
    toast.success(`${newAppName} added to the list`);
    triggerExtensionSync();
  };

  const removeApp = (id: string) => {
    storage.deleteBlockedApp(id);
    setApps(storage.getBlockedApps());
    toast.success("App removed");
    triggerExtensionSync();
  };

  const toggleApp = (id: string) => {
    storage.toggleAppBlock(id);
    setApps(storage.getBlockedApps());
    triggerExtensionSync();
  };

  const toggleBlockMode = (id: string) => {
    storage.toggleAppBlockMode(id);
    const updatedApps = storage.getBlockedApps();
    setApps(updatedApps);
    
    const app = updatedApps.find(a => a.id === id);
    toast.success(`${app?.name} will be blocked ${app?.blockMode === "always" ? "always" : "only during focus mode"}`);
    triggerExtensionSync();
  };

  const startFocusMode = () => {
    const blockedCount = apps.filter((app) => app.blocked).length;
    if (blockedCount === 0) {
      toast.error("Please select at least one app to block");
      return;
    }

    const id = crypto.randomUUID();
    const endTime = Date.now() + duration * 60 * 1000;
    
    localStorage.setItem('focussphere_current_session', JSON.stringify({
        id,
        endTime,
        duration,
        startTime: Date.now()
    }));

    setActiveSessionId(id);
    setFocusModeActive(true);
    setTimeRemaining(duration * 60); 
    
    triggerExtensionSync(true);
    
    toast.success(`Focus Mode activated! ${blockedCount} apps blocked for ${duration} minutes`);
  };

  const stopFocusMode = () => {
    // Check for strict mode
    const settings = storage.getSettings();
    if (settings.strictMode && timeRemaining > 0) {
      toast.error("Strict Mode is active: Cannot stop session until timer expires!");
      return;
    }

    setFocusModeActive(false);
    setTimeRemaining(0);
    setActiveSessionId(null);
    localStorage.removeItem('focussphere_current_session');
    
    triggerExtensionSync(false);
    toast.success("Focus Mode deactivated");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const triggerExtensionSync = (active: boolean = focusModeActive) => {
      // We pass the Full list of apps + Focus State to the extension
      // We can use the helper, but we might need to update it to accept 'apps'
      // Or just write to localStorage where extension reads it.
      
      const syncData = {
          userId: user?.id || 'local-user', // Fallback ID
          accessToken: 'local-token', 
          focusMode: active,
          blockedApps: storage.getBlockedApps(), // NEW: Pass apps directly
          timestamp: Date.now()
      };
      
      localStorage.setItem('focussphere_sync', JSON.stringify(syncData));
      
      // Also try to send message if helper allows
      syncWithExtensionHelper(user?.id || 'local', active, undefined);
  };

  const handleManualSync = () => {
      triggerExtensionSync();
      toast.success('Sync signal sent to extension.');
  };

  // On Android (Capacitor), only show the Android App Blocker
  // Website blocking uses browser extension which isn't available on Android
  if (isCapacitor()) {
    return (
      <div className="space-y-4 lg:space-y-6 animate-fade-in">
        <div>
          <h2 className="text-xl lg:text-3xl font-bold text-foreground mb-1 lg:mb-2">App Blocker</h2>
          <p className="text-sm lg:text-base text-muted-foreground">Block distracting apps and stay focused</p>
        </div>
        
        {/* Android App Blocking Section */}
        <AndroidAppBlocker />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl lg:text-3xl font-bold text-foreground mb-1 lg:mb-2">Social Media Blocker</h2>
        <p className="text-sm lg:text-base text-muted-foreground">Block distractions and stay focused</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2">
          <DashboardCard title="Your Blocked Apps" icon={Shield}>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading apps...</p>
                </div>
              ) : apps.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">No apps added yet</p>
                  <p className="text-sm text-muted-foreground">Click the button below to add apps you want to block</p>
                </div>
              ) : (
                apps.map((app) => {
                  const isActivelyBlocked = app.blocked && (app.blockMode === "always" || focusModeActive);
                  return (
                    <div
                      key={app.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-colors group ${
                        isActivelyBlocked 
                          ? "bg-destructive/10 border border-destructive/20" 
                          : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-3 h-3 rounded-full ${isActivelyBlocked ? "bg-destructive" : "bg-primary"}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={app.id} className="text-base font-medium cursor-pointer">
                              {app.name}
                            </Label>
                            {app.blockMode === "always" && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                Always
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{app.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBlockMode(app.id)}
                          className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {app.blockMode === "always" ? "Set to Focus Only" : "Set to Always Block"}
                        </Button>
                        <Switch
                          id={app.id}
                          checked={app.blocked}
                          onCheckedChange={() => toggleApp(app.id)}
                          disabled={focusModeActive}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeApp(app.id)}
                          disabled={focusModeActive}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              
              )}
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-2 hover:border-primary hover:bg-accent"
                    disabled={focusModeActive}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add App to Block
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add App to Block</DialogTitle>
                    <DialogDescription>
                      Enter the name and URL of the app or website you want to block
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="app-name">App Name</Label>
                      <Input
                        id="app-name"
                        placeholder="e.g., Instagram, YouTube"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addApp()}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="app-url">URL or Domain</Label>
                      <Input
                        id="app-url"
                        placeholder="e.g., instagram.com, youtube.com"
                        value={newAppUrl}
                        onChange={(e) => setNewAppUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addApp()}
                      />
                    </div>
                    <Button onClick={addApp} className="w-full">
                      Add App
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-6">
          <DashboardCard title="Focus Timer" icon={Clock}>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Duration (minutes)</Label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  disabled={focusModeActive}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground"
                  min="5"
                  max="480"
                />
              </div>

              {focusModeActive ? (
                <>
                  <div className="text-center py-4">
                    <p className="text-2xl font-bold text-primary mb-2">
                      {formatTime(timeRemaining)}
                    </p>
                    <p className="text-xs text-muted-foreground">Time remaining</p>
                  </div>
                  <Button
                    onClick={stopFocusMode}
                    variant="destructive"
                    className="w-full"
                  >
                    Stop Focus Mode
                  </Button>
                </>
              ) : (
                <Button
                  onClick={startFocusMode}
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={loading}
                >
                  Start Focus Mode
                </Button>
              )}

              <div className="bg-gradient-card rounded-lg p-4">
                {focusModeActive ? (
                  <>
                    <p className="text-sm font-medium text-foreground mb-1">🔒 Focus Mode Active</p>
                    <p className="text-xs text-muted-foreground">
                      {apps.filter((app) => app.blocked).length} apps blocked during session
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground mb-1">🛡️ Always Blocked</p>
                    <p className="text-xs text-muted-foreground">
                      {apps.filter((app) => app.blocked && app.blockMode === "always").length} apps permanently blocked
                    </p>
                  </>
                )}
              </div>
            </div>
          </DashboardCard>

          <div className="bg-primary rounded-lg p-6">
            <p className="text-sm font-medium mb-2 text-primary-foreground">💡 Pro Tip</p>
            <p className="text-xs text-primary-foreground/90">
              Start with shorter sessions and gradually increase the duration to build your focus muscle!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
