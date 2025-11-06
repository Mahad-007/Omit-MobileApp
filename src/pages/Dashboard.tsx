import { DashboardCard } from "@/components/DashboardCard";
import { Shield, CheckSquare, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h2>
        <p className="text-muted-foreground">Track your productivity and stay motivated</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          title="Focus Score"
          description="Today's productivity"
          icon={TrendingUp}
          value="87%"
          trend="+12% from yesterday"
          gradient
        />

        <DashboardCard
          title="Blocked Sites"
          description="Distractions avoided"
          icon={Shield}
          value="12"
          trend="+3 today"
        >
          <Button
            onClick={() => navigate("/blocker")}
            className="w-full mt-4 bg-primary hover:bg-primary/90"
          >
            Manage Blocklist
          </Button>
        </DashboardCard>

        <DashboardCard
          title="Tasks Completed"
          description="Keep up the momentum!"
          icon={CheckSquare}
          value="8/15"
          trend="53% complete"
        >
          <Button
            onClick={() => navigate("/tasks")}
            variant="outline"
            className="w-full mt-4"
          >
            View Tasks
          </Button>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Daily Motivation" icon={Sparkles}>
          <div className="bg-gradient-primary rounded-lg p-6 text-white">
            <p className="text-lg font-medium mb-2">
              "Success is the sum of small efforts repeated day in and day out."
            </p>
            <p className="text-sm opacity-90">— Robert Collier</p>
          </div>
          <Button
            onClick={() => navigate("/motivation")}
            variant="outline"
            className="w-full mt-4"
          >
            More Motivation
          </Button>
        </DashboardCard>

        <DashboardCard title="Focus Statistics" icon={TrendingUp}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Focus Time</span>
              <span className="text-lg font-bold text-foreground">4h 32m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average Session</span>
              <span className="text-lg font-bold text-foreground">45m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Longest Streak</span>
              <span className="text-lg font-bold text-foreground">7 days</span>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
