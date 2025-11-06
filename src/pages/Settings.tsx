import { DashboardCard } from "@/components/DashboardCard";
import { Settings as SettingsIcon, Bell, Moon, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [strictMode, setStrictMode] = useState(false);

  const saveSettings = () => {
    toast.success("Settings saved successfully!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Settings</h2>
        <p className="text-muted-foreground">Customize your FocusSphere experience</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Notifications" icon={Bell}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
              <div>
                <Label htmlFor="task-reminders" className="text-base font-medium cursor-pointer">
                  Task Reminders
                </Label>
                <p className="text-sm text-muted-foreground">Get notified about upcoming tasks</p>
              </div>
              <Switch
                id="task-reminders"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
              <div>
                <Label htmlFor="focus-alerts" className="text-base font-medium cursor-pointer">
                  Focus Alerts
                </Label>
                <p className="text-sm text-muted-foreground">Alerts when you visit blocked sites</p>
              </div>
              <Switch id="focus-alerts" defaultChecked />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Appearance" icon={Moon}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
              <div>
                <Label htmlFor="dark-mode" className="text-base font-medium cursor-pointer">
                  Dark Mode
                </Label>
                <p className="text-sm text-muted-foreground">Switch to dark theme</p>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
            <div className="p-4 rounded-lg bg-gradient-card">
              <p className="text-sm text-muted-foreground">
                More theme options coming soon!
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Focus Settings" icon={Shield}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
              <div>
                <Label htmlFor="strict-mode" className="text-base font-medium cursor-pointer">
                  Strict Mode
                </Label>
                <p className="text-sm text-muted-foreground">Cannot disable blocking once started</p>
              </div>
              <Switch
                id="strict-mode"
                checked={strictMode}
                onCheckedChange={setStrictMode}
              />
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <Label className="text-sm text-muted-foreground mb-2 block">
                Default Focus Duration
              </Label>
              <input
                type="number"
                defaultValue={60}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground"
                min="5"
                max="480"
              />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Account" icon={SettingsIcon}>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary">
              <p className="text-sm font-medium mb-1">Email</p>
              <p className="text-sm text-muted-foreground">user@example.com</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary">
              <p className="text-sm font-medium mb-1">Member Since</p>
              <p className="text-sm text-muted-foreground">November 2025</p>
            </div>
            <Button variant="destructive" className="w-full">
              Sign Out
            </Button>
          </div>
        </DashboardCard>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveSettings} className="bg-gradient-primary hover:opacity-90 px-8">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
