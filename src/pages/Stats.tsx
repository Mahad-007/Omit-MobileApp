import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storage, Task, DailyStats } from "@/lib/storage";
import CalendarModal from "@/components/CalendarModal";

interface WeeklyData {
  day: string;
  hours: number;
  date: string;
}

export default function Stats() {
  const navigate = useNavigate();
  const [weeklyFocusHours, setWeeklyFocusHours] = useState(0);
  const [focusHoursChange, setFocusHoursChange] = useState(0);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [focusScore, setFocusScore] = useState(0);
  const [focusScoreChange, setFocusScoreChange] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [tasksChange, setTasksChange] = useState(0);
  const [bestDay, setBestDay] = useState<{ day: string; hours: number } | null>(null);
  const [deepWorkHours, setDeepWorkHours] = useState(0);
  const [shallowWorkHours, setShallowWorkHours] = useState(0);
  const [weeklyWastedHours, setWeeklyWastedHours] = useState(0);
  const [todaySavedHours, setTodaySavedHours] = useState(0);
  const [todayWastedHours, setTodayWastedHours] = useState(0);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const loadData = () => {
      // Get weekly stats
      const weeklyStats = storage.getWeeklyStats();
      const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      
      const formattedData: WeeklyData[] = weeklyStats.map((stat, index) => ({
        day: days[index],
        hours: stat.savedHours,
        date: stat.date
      }));
      setWeeklyData(formattedData);
      
      // Total weekly focus hours
      const totalWeeklyHours = storage.getWeeklyFocusHours();
      setWeeklyFocusHours(totalWeeklyHours);
      
      // Calculate week-over-week change for focus hours
      const previousWeekHours = storage.getPreviousWeekFocusHours();
      const hourChange = storage.calculatePercentageChange(totalWeeklyHours, previousWeekHours);
      setFocusHoursChange(hourChange);
      
      // Focus score (based on 40h weekly goal)
      const score = Math.min(100, Math.round((totalWeeklyHours / 40) * 100));
      setFocusScore(score);
      
      // Calculate focus score change based on weekly comparison
      const previousScore = Math.min(100, Math.round((previousWeekHours / 40) * 100));
      const scoreChange = storage.calculatePercentageChange(score, previousScore);
      setFocusScoreChange(scoreChange);
      
      // Tasks completed this week
      const weeklyTasks = storage.getWeeklyTasksCompleted();
      setTasksCompleted(weeklyTasks);
      
      // Tasks change
      const previousTasks = storage.getPreviousWeekTasksCompleted();
      const taskChange = storage.calculatePercentageChange(weeklyTasks, previousTasks);
      setTasksChange(taskChange);
      
      // Best productive day
      const best = storage.getBestProductiveDay();
      setBestDay(best);
      
      // Work breakdown (approximate: 60% deep work, 40% shallow)
      // In a real app, this would track session intensity
      setDeepWorkHours(totalWeeklyHours * 0.6);
      setShallowWorkHours(totalWeeklyHours * 0.4);
      
      // Weekly wasted hours
      const weeklyWasted = weeklyStats.reduce((sum, s) => sum + s.wastedHours, 0);
      setWeeklyWastedHours(weeklyWasted);
      
      // Today's stats
      setTodaySavedHours(storage.getSavedTime());
      setTodayWastedHours(storage.getWastedTime());
    };
    
    loadData();
    
    // Subscribe to changes for real-time updates
    const unsubscribeStats = storage.onChange('stats', loadData);
    const unsubscribeTasks = storage.onChange('tasks', loadData);
    return () => {
      unsubscribeStats();
      unsubscribeTasks();
    };
  }, []);

  const maxHours = Math.max(...weeklyData.map(d => d.hours), 1);
  const deepWorkGoal = 20; // 20 hours weekly goal
  const deepWorkProgress = Math.min(100, (deepWorkHours / deepWorkGoal) * 100);
  const shallowWorkAvg = shallowWorkHours / 7;

  // Format hours and minutes
  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen flex flex-col relative pb-24">
      {/* Header Section */}
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <div className="size-10 flex items-center justify-center rounded-full bg-card border border-border">
          <span className="material-symbols-outlined text-muted-foreground">person</span>
        </div>
        <h2 className="text-lg font-bold tracking-tight">Insights</h2>
        <button 
          onClick={() => setIsCalendarOpen(true)}
          className="size-10 flex items-center justify-center rounded-full bg-card border border-border transition-colors hover:bg-muted"
        >
          <span className="material-symbols-outlined text-muted-foreground">calendar_today</span>
        </button>
      </header>

      {/* Focus Trend Chart Section */}
      <section className="px-6 mb-8">
        <div className="bg-card/40 rounded-xl p-6 border border-border shadow-sm">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Focus Hours</p>
              <h1 className="text-4xl font-bold tracking-tight">{weeklyFocusHours.toFixed(1)}h</h1>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              focusHoursChange >= 0 
                ? 'bg-primary/20 text-primary' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {focusHoursChange >= 0 ? '+' : ''}{focusHoursChange}%
            </div>
          </div>
          
          {/* Simple Bar Chart */}
          <div className="relative h-48 w-full mt-8">
            <div className="flex items-end justify-between h-40 gap-2">
              {weeklyData.map((data) => {
                const barHeight = maxHours > 0 ? Math.max((data.hours / maxHours) * 160, 8) : 8;
                return (
                  <div key={data.day} className="flex-1 flex flex-col justify-end h-full">
                    <div 
                      className="w-full bg-primary/30 rounded-t-sm transition-all hover:bg-primary/50 relative"
                      style={{ height: `${barHeight}px` }}
                    >
                      <div 
                        className="w-full bg-primary rounded-t-sm absolute bottom-0"
                        style={{ height: data.hours > 0 ? '60%' : '0%' }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-4">
              {weeklyData.map((data) => (
                <span key={data.day} className="text-[10px] font-bold text-muted-foreground/60 flex-1 text-center">
                  {data.day}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Time Saved vs Wasted Section */}
      <section className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-xl flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-emerald-400 text-lg">schedule</span>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Time Saved</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400">{formatTime(weeklyFocusHours)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground/80 leading-snug mt-1">
              Today: {formatTime(todaySavedHours)}
            </p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-xl flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-red-400 text-lg">hourglass_empty</span>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Time Wasted</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-red-400">{formatTime(weeklyWastedHours)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground/80 leading-snug mt-1">
              Today: {formatTime(todayWastedHours)}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="px-6 grid grid-cols-2 gap-4 mb-8">
        <div className="bg-card p-5 rounded-xl border border-border flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Focus Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{focusScore}</span>
            <span className={`text-[10px] font-bold ${focusScoreChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {focusScoreChange >= 0 ? '+' : ''}{focusScoreChange}%
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/80 leading-snug mt-2">
            {focusScoreChange >= 0 ? `${Math.abs(focusScoreChange)}% higher than last week` : `${Math.abs(focusScoreChange)}% lower than last week`}
          </p>
        </div>
        <div className="bg-card p-5 rounded-xl border border-border flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks Done</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{tasksCompleted}</span>
            <span className={`text-[10px] font-bold ${tasksChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {tasksChange >= 0 ? '+' : ''}{tasksChange}%
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/80 leading-snug mt-2">
            {tasksChange >= 0 ? 'Consistent progress this week' : 'Less tasks than last week'}
          </p>
        </div>
      </section>

      {/* Breakdown Section */}
      <section className="px-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">Weekly Breakdown</h3>
          <span className="material-symbols-outlined text-muted-foreground text-sm">more_horiz</span>
        </div>
        <div className="space-y-4">
          <div className="bg-card/30 rounded-lg p-4 border border-border">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Deep Work</span>
              <span className="text-sm font-bold text-primary">{formatTime(deepWorkHours)}</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${deepWorkProgress}%` }}></div>
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-[10px] text-muted-foreground italic">
                {bestDay ? `Best day: ${bestDay.day} (${bestDay.hours.toFixed(1)}h)` : 'No sessions yet'}
              </p>
              <p className="text-[10px] text-muted-foreground">Goal: {deepWorkGoal}h</p>
            </div>
          </div>
          <div className="bg-card/30 rounded-lg p-4 border border-border">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Shallow Work</span>
              <span className="text-sm font-bold text-muted-foreground">{formatTime(shallowWorkHours)}</span>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-muted-foreground h-full rounded-full" style={{ width: `${Math.min(100, (shallowWorkHours / 14) * 100)}%` }}></div>
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-[10px] text-muted-foreground italic">Meetings & Admin</p>
              <p className="text-[10px] text-muted-foreground">Avg: {shallowWorkAvg.toFixed(1)}h/day</p>
            </div>
          </div>
        </div>
      </section>

      {/* Insights Tip */}
      <section className="px-6 mb-6">
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-4 items-start">
          <div className="bg-primary size-8 rounded-lg flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-base">lightbulb</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">
            <span className="font-bold text-foreground">Pro Insight:</span>{' '}
            {bestDay ? (
              <>
                You are most productive on{' '}
                <span className="text-primary font-bold underline underline-offset-4">{bestDay.day} mornings</span>. 
                Consider scheduling your most complex deep work blocks between 8:00 AM and 11:00 AM.
              </>
            ) : (
              <>
                Start tracking your focus sessions to discover your most productive times.
                Complete a few focus sessions this week to unlock personalized insights.
              </>
            )}
          </p>
        </div>
      </section>
      <CalendarModal 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
      />
    </div>
  );
}

