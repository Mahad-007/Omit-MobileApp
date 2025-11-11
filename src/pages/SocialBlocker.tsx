import { DashboardCard } from "@/components/DashboardCard";
import { Shield, Clock, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BlockedApp {
  id: string;
  name: string;
  url: string;
  blocked: boolean;
  blockMode: "always" | "focus";
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export default function SocialBlocker() {
  const { user } = useAuth();
  const [apps, setApps] = useState<BlockedApp[]>([]);
  const [duration, setDuration] = useState(60);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppUrl, setNewAppUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Fetch blocked apps from Supabase
  useEffect(() => {
    if (user) {
      fetchApps();
      checkActiveSession();
      
      // Store user ID in localStorage for extension to find
      localStorage.setItem('focussphere_user_id', user.id);
      localStorage.setItem('focussphere_sync', JSON.stringify({
        userId: user.id,
        focusMode: focusModeActive,
        timestamp: Date.now()
      }));
    }
  }, [user]);

  const endSession = async (sessionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("focus_sessions")
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error ending session:", error);
    }
  };

  // Countdown timer for focus mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (focusModeActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // End session when timer reaches 0
            if (activeSessionId && user) {
              endSession(activeSessionId).then(() => {
                setFocusModeActive(false);
                setTimeRemaining(0);
                setActiveSessionId(null);
                toast.success("Focus session completed!");
              });
            } else {
              setFocusModeActive(false);
              setTimeRemaining(0);
              setActiveSessionId(null);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusModeActive, timeRemaining, activeSessionId, user]);

  const fetchApps = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("blocked_apps")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedApps: BlockedApp[] = (data || []).map((app) => ({
        id: app.id,
        name: app.name,
        url: app.url,
        blocked: app.blocked,
        blockMode: app.block_mode as "always" | "focus",
      }));

      setApps(formattedApps);
    } catch (error: any) {
      console.error("Error fetching apps:", error);
      toast.error("Failed to load blocked apps");
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned" which is fine
        throw error;
      }

      if (data) {
        setActiveSessionId(data.id);
        const startedAt = new Date(data.started_at);
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);
        const remaining = data.duration_minutes - elapsedMinutes;
        
        if (remaining > 0) {
          setFocusModeActive(true);
          setDuration(data.duration_minutes);
          setTimeRemaining(remaining * 60); // Convert to seconds
        } else {
          // Session expired, end it
          await endSession(data.id);
        }
      }
    } catch (error: any) {
      console.error("Error checking active session:", error);
    }
  };

  const addApp = async () => {
    if (!user) {
      toast.error("Please log in to add apps");
      return;
    }

    if (!newAppName.trim() || !newAppUrl.trim()) {
      toast.error("Please enter both app name and URL");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("blocked_apps")
        .insert({
          user_id: user.id,
          name: newAppName.trim(),
          url: newAppUrl.trim(),
          blocked: false,
          block_mode: "focus",
        })
        .select()
        .single();

      if (error) throw error;

      const newApp: BlockedApp = {
        id: data.id,
        name: data.name,
        url: data.url,
        blocked: data.blocked,
        blockMode: data.block_mode as "always" | "focus",
      };

      setApps((prev) => [...prev, newApp]);
      setNewAppName("");
      setNewAppUrl("");
      setIsDialogOpen(false);
      toast.success(`${newAppName} added to the list`);
    } catch (error: any) {
      console.error("Error adding app:", error);
      toast.error("Failed to add app");
    }
  };

  const removeApp = async (id: string) => {
    if (!user) return;

    const app = apps.find((a) => a.id === id);
    
    try {
      const { error } = await supabase
        .from("blocked_apps")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setApps((prev) => prev.filter((app) => app.id !== id));
      toast.success(`${app?.name} removed from the list`);
    } catch (error: any) {
      console.error("Error removing app:", error);
      toast.error("Failed to remove app");
    }
  };

  const toggleApp = async (id: string) => {
    if (!user) return;

    const app = apps.find((a) => a.id === id);
    const newBlockedState = !app?.blocked;

    try {
      const { error } = await supabase
        .from("blocked_apps")
        .update({ blocked: newBlockedState })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setApps((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, blocked: newBlockedState } : app
        )
      );
    } catch (error: any) {
      console.error("Error updating app:", error);
      toast.error("Failed to update app");
    }
  };

  const toggleBlockMode = async (id: string) => {
    if (!user) return;

    const app = apps.find((a) => a.id === id);
    const newMode = app?.blockMode === "always" ? "focus" : "always";

    try {
      const { error } = await supabase
        .from("blocked_apps")
        .update({ block_mode: newMode })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setApps((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, blockMode: newMode } : app
        )
      );
      toast.success(`${app?.name} will be blocked ${newMode === "always" ? "always" : "only during focus mode"}`);
    } catch (error: any) {
      console.error("Error updating block mode:", error);
      toast.error("Failed to update block mode");
    }
  };

  const startFocusMode = async () => {
    if (!user) {
      toast.error("Please log in to start focus mode");
      return;
    }

    const blockedCount = apps.filter((app) => app.blocked).length;
    if (blockedCount === 0) {
      toast.error("Please select at least one app to block");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("focus_sessions")
        .insert({
          user_id: user.id,
          duration_minutes: duration,
          is_active: true,
          apps_blocked_count: blockedCount,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveSessionId(data.id);
      setFocusModeActive(true);
      setTimeRemaining(duration * 60); // Convert minutes to seconds
      
      // Sync with extension - store in localStorage for content script to pick up
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        localStorage.setItem('focussphere_sync', JSON.stringify({
          userId: user.id,
          focusMode: true,
          timestamp: Date.now()
        }));
        // Try to send message to extension if possible
        try {
          chrome.runtime.sendMessage({ action: 'setUserId', userId: user.id });
          chrome.runtime.sendMessage({ action: 'setFocusMode', active: true });
          chrome.runtime.sendMessage({ action: 'sync' });
        } catch (e) {
          console.log('Extension messaging not available');
        }
      } else {
        // Store in localStorage for extension to pick up
        localStorage.setItem('focussphere_sync', JSON.stringify({
          userId: user.id,
          focusMode: true,
          timestamp: Date.now()
        }));
      }
      
      toast.success(`Focus Mode activated! ${blockedCount} apps blocked for ${duration} minutes`);
    } catch (error: any) {
      console.error("Error starting focus mode:", error);
      toast.error("Failed to start focus mode");
    }
  };

  const stopFocusMode = async () => {
    if (activeSessionId) {
      await endSession(activeSessionId);
    }

    setFocusModeActive(false);
    setTimeRemaining(0);
    setActiveSessionId(null);
    
    // Sync with extension
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      localStorage.setItem('focussphere_sync', JSON.stringify({
        userId: user?.id,
        focusMode: false,
        timestamp: Date.now()
      }));
      try {
        chrome.runtime.sendMessage({ action: 'setFocusMode', active: false });
        chrome.runtime.sendMessage({ action: 'sync' });
      } catch (e) {
        console.log('Extension messaging not available');
      }
    } else {
      localStorage.setItem('focussphere_sync', JSON.stringify({
        userId: user?.id,
        focusMode: false,
        timestamp: Date.now()
      }));
    }
    
    toast.success("Focus Mode deactivated");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const syncWithExtension = async () => {
    if (!user) {
      toast.error('Please log in to sync with extension');
      return;
    }

    // Check if extension is installed
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      toast.info('Install the browser extension to block websites. See instructions below.');
      return;
    }

    try {
      // Try to get extension ID from storage or use a known ID
      // For now, we'll try to send to any installed extension that listens
      // The extension needs to be configured with externally_connectable
      
      // Store sync data in localStorage for content script to pick up
      localStorage.setItem('focussphere_sync', JSON.stringify({
        userId: user.id,
        focusMode: focusModeActive,
        timestamp: Date.now()
      }));

      // Try to send message to extension via external messaging
      try {
        // The extension should be listening via onMessageExternal
        // But we need the extension ID, so we'll use the content script approach
        toast.success('Sync data stored! Click "Sync with App" in the extension popup to sync.');
      } catch (e) {
        toast.info('Click "Sync with App" in the extension popup to sync your blocked sites.');
      }
    } catch (error: any) {
      toast.error('Failed to sync with extension: ' + error.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Social Media Blocker</h2>
        <p className="text-muted-foreground">Block distractions and stay focused</p>
      </div>

      {/* Extension Installation Notice */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Install Browser Extension to Block Websites
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              To actually block websites like Instagram, you need to install the FocusSphere browser extension. 
              The extension will sync with your blocked sites list and prevent access to distracting websites.
            </p>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">Installation Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200 ml-2">
                <li>Open Chrome/Edge and go to <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">chrome://extensions/</code></li>
                <li>Enable "Developer mode" (toggle in top right)</li>
                <li>Click "Load unpacked"</li>
                <li>Select the <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">extension</code> folder from this project</li>
                <li>Click the extension icon and click "Sync with App"</li>
              </ol>
            </div>
            <Button
              onClick={syncWithExtension}
              variant="outline"
              size="sm"
              className="mt-3 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              Try Syncing with Extension
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                          {app.blockMode === "always" ? "Focus Only" : "Always Block"}
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
