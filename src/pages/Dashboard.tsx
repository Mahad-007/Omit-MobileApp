import { DashboardCard } from "@/components/DashboardCard";
import { Shield, CheckSquare, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { storage } from "@/lib/storage";

export default function Dashboard() {
  const navigate = useNavigate();
  const [productivityData, setProductivityData] = useState<{time: string, saved: number, wasted: number}[]>([]);
  const [stats, setStats] = useState({ saved: 0, wasted: 0, efficiency: 0 });
  const [blockedCount, setBlockedCount] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    // Load initial data
    const loadData = () => {
      setProductivityData(storage.getProductivityData());
      setStats(storage.getTotalStats());
      setBlockedCount(storage.getBlockedApps().length);

      const tasks = storage.getTasks();
      setTotalTasks(tasks.length);
      setCompletedTasks(tasks.filter(t => t.completed).length);

      setSessionCount(storage.getFocusSessions().length);
    };

    loadData();

    // Subscribe to real-time stats updates from the extension
    const unsubscribe = storage.onStatsChange(() => {
      // Update stats immediately when extension reports time changes
      setStats(storage.getTotalStats());
      setProductivityData(storage.getProductivityData());
    });

    // Also refresh every minute as a fallback
    const interval = setInterval(loadData, 60000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h2>
        <p className="text-muted-foreground">Track your productivity and stay motivated</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus Time Section - Left Half */}
        <Card className="lg:row-span-2 shadow-elevated bg-gradient-to-br from-card to-accent/20 border-primary/10">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Focus Time Tracker
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-6 text-center">
              <div className="space-y-3 p-6 rounded-xl bg-gradient-accent border border-success/20 shadow-soft">
                <div className="text-6xl font-bold text-success drop-shadow-sm">{stats.saved.toFixed(1)}h</div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Time Saved</p>
              </div>
              <div className="space-y-3 opacity-60 p-4 rounded-xl bg-card/50 border border-border/50">
                <div className="text-3xl font-semibold text-destructive">{stats.wasted.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Time Wasted</p>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Time Saved", value: stats.saved },
                      { name: "Time Wasted", value: stats.wasted }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    <Cell fill="hsl(var(--success))" />
                    <Cell fill="hsl(var(--destructive))" />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => `${value.toFixed(1)}h`}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 mt-2 border-t border-border/50">
              <div className="text-center p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
                <div className="text-2xl font-bold text-primary">{stats.efficiency}%</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Efficiency</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
                <div className="text-2xl font-bold text-foreground">{sessionCount}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Sessions</div>
              </div>
              {/* Calculating average session time if sessions exist */}
              <div className="text-center p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
                <div className="text-2xl font-bold text-foreground">
                  {sessionCount > 0 ? (stats.saved / sessionCount * 60).toFixed(0) : 0}m
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Avg Session</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Side - Dashboard Cards */}
        <div className="space-y-6">
          <DashboardCard
            title="Blocked Sites"
            description="Distractions avoided"
            icon={Shield}
            value={blockedCount.toString()}
            trend="Active protection"
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
            value={`${completedTasks}/${totalTasks}`}
            trend={totalTasks > 0 ? `${Math.round((completedTasks/totalTasks)*100)}% complete` : "No tasks"}
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

        <DashboardCard title="Daily Motivation" icon={Sparkles}>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
            <p className="text-base font-medium mb-2 text-foreground">
              "Success is the sum of small efforts repeated day in and day out."
            </p>
            <p className="text-sm text-muted-foreground">— Robert Collier</p>
          </div>
          <Button
            onClick={() => navigate("/motivation")}
            variant="outline"
            className="w-full mt-4"
          >
            More Motivation
          </Button>
        </DashboardCard>
      </div>
    </div>
  );
}
