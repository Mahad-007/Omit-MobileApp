import { DashboardCard } from "@/components/DashboardCard";
import { Shield, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const platforms = [
  { id: "instagram", name: "Instagram", color: "bg-pink-500" },
  { id: "youtube", name: "YouTube", color: "bg-red-500" },
  { id: "twitter", name: "Twitter", color: "bg-blue-400" },
  { id: "tiktok", name: "TikTok", color: "bg-black" },
  { id: "facebook", name: "Facebook", color: "bg-blue-600" },
];

export default function SocialBlocker() {
  const [blockedPlatforms, setBlockedPlatforms] = useState<Record<string, boolean>>({});
  const [duration, setDuration] = useState(60);
  const [focusModeActive, setFocusModeActive] = useState(false);

  const togglePlatform = (platformId: string) => {
    setBlockedPlatforms((prev) => ({
      ...prev,
      [platformId]: !prev[platformId],
    }));
  };

  const startFocusMode = () => {
    const blockedCount = Object.values(blockedPlatforms).filter(Boolean).length;
    if (blockedCount === 0) {
      toast.error("Please select at least one platform to block");
      return;
    }
    setFocusModeActive(true);
    toast.success(`Focus Mode activated! ${blockedCount} platforms blocked for ${duration} minutes`);
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
          <DashboardCard title="Select Platforms" icon={Shield}>
            <div className="space-y-4">
              {platforms.map((platform) => (
                <div
                  key={platform.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                    <Label htmlFor={platform.id} className="text-base font-medium cursor-pointer">
                      {platform.name}
                    </Label>
                  </div>
                  <Switch
                    id={platform.id}
                    checked={blockedPlatforms[platform.id] || false}
                    onCheckedChange={() => togglePlatform(platform.id)}
                    disabled={focusModeActive}
                  />
                </div>
              ))}
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
                    {Object.values(blockedPlatforms).filter(Boolean).length} platforms blocked
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
