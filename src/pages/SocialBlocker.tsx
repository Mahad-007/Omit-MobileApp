import { DashboardCard } from "@/components/DashboardCard";
import { Shield, Clock, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
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
}

export default function SocialBlocker() {
  const [apps, setApps] = useState<BlockedApp[]>([]);
  const [duration, setDuration] = useState(60);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppUrl, setNewAppUrl] = useState("");

  const addApp = () => {
    if (!newAppName.trim() || !newAppUrl.trim()) {
      toast.error("Please enter both app name and URL");
      return;
    }

    const newApp: BlockedApp = {
      id: Date.now().toString(),
      name: newAppName.trim(),
      url: newAppUrl.trim(),
      blocked: false,
    };

    setApps((prev) => [...prev, newApp]);
    setNewAppName("");
    setNewAppUrl("");
    setIsDialogOpen(false);
    toast.success(`${newAppName} added to the list`);
  };

  const removeApp = (id: string) => {
    const app = apps.find((a) => a.id === id);
    setApps((prev) => prev.filter((app) => app.id !== id));
    toast.success(`${app?.name} removed from the list`);
  };

  const toggleApp = (id: string) => {
    setApps((prev) =>
      prev.map((app) =>
        app.id === id ? { ...app, blocked: !app.blocked } : app
      )
    );
  };

  const startFocusMode = () => {
    const blockedCount = apps.filter((app) => app.blocked).length;
    if (blockedCount === 0) {
      toast.error("Please select at least one app to block");
      return;
    }
    setFocusModeActive(true);
    toast.success(`Focus Mode activated! ${blockedCount} apps blocked for ${duration} minutes`);
  };

  const stopFocusMode = () => {
    setFocusModeActive(false);
    toast.success("Focus Mode deactivated");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Social Media Blocker</h2>
        <p className="text-muted-foreground">Block distractions and stay focused</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCard title="Your Blocked Apps" icon={Shield}>
            <div className="space-y-4">
              {apps.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">No apps added yet</p>
                  <p className="text-sm text-muted-foreground">Click the button below to add apps you want to block</p>
                </div>
              ) : (
                apps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <div className="flex-1">
                        <Label htmlFor={app.id} className="text-base font-medium cursor-pointer block">
                          {app.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">{app.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                ))
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
                <Button
                  onClick={stopFocusMode}
                  variant="destructive"
                  className="w-full"
                >
                  Stop Focus Mode
                </Button>
              ) : (
                <Button
                  onClick={startFocusMode}
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  Start Focus Mode
                </Button>
              )}

              {focusModeActive && (
                <div className="bg-gradient-card rounded-lg p-4 animate-pulse-soft">
                  <p className="text-sm font-medium text-foreground mb-1">🔒 Focus Mode Active</p>
                  <p className="text-xs text-muted-foreground">
                    {apps.filter((app) => app.blocked).length} apps blocked
                  </p>
                </div>
              )}
            </div>
          </DashboardCard>

          <div className="bg-gradient-accent rounded-lg p-6 text-white">
            <p className="text-sm font-medium mb-2">💡 Pro Tip</p>
            <p className="text-xs opacity-90">
              Start with shorter sessions and gradually increase the duration to build your focus muscle!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
