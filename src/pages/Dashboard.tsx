import { DashboardCard } from "@/components/DashboardCard";
import { Shield, CheckSquare, Sparkles, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const productivityData = [
  { time: "9 AM", saved: 0.3, wasted: 0.1 },
  { time: "10 AM", saved: 0.8, wasted: 0.2 },
  { time: "11 AM", saved: 1.5, wasted: 0.3 },
  { time: "12 PM", saved: 2.0, wasted: 0.4 },
  { time: "1 PM", saved: 2.3, wasted: 0.5 },
  { time: "2 PM", saved: 3.0, wasted: 0.6 },
  { time: "3 PM", saved: 3.8, wasted: 0.7 },
  { time: "4 PM", saved: 4.5, wasted: 0.8 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const latestData = productivityData[productivityData.length - 1];
  const totalSaved = latestData.saved;
  const totalWasted = latestData.wasted;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h2>
        <p className="text-muted-foreground">Track your productivity and stay motivated</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus Time Section - Left Half */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Focus Time Tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-2">
                <div className="text-5xl font-bold text-success">{totalSaved.toFixed(1)}h</div>
                <p className="text-sm text-muted-foreground">Time Saved</p>
              </div>
              <div className="space-y-2 opacity-60">
                <div className="text-3xl font-bold text-destructive">{totalWasted.toFixed(1)}h</div>
                <p className="text-sm text-muted-foreground">Time Wasted</p>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Time Saved", value: totalSaved },
                      { name: "Time Wasted", value: totalWasted }
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

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">87%</div>
                <div className="text-xs text-muted-foreground">Efficiency</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">6</div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">45m</div>
                <div className="text-xs text-muted-foreground">Avg Session</div>
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
