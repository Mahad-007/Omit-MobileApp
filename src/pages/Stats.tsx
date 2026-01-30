import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storage, DailyStats, Settings } from "@/lib/storage";
import CalendarModal from "@/components/CalendarModal";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CustomTimeModal from "@/components/CustomTimeModal";
import { 
  ChevronLeft, 
  Calendar, 
  TimerOff, 
  Ban, 
  Timer, 
  Edit2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Hourglass, 
  Lightbulb 
} from "lucide-react";

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
  const [settings, setSettings] = useState<Settings>(storage.getSettings());
  const [dailyUsage, setDailyUsage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadData = () => {
      const weeklyStats = storage.getWeeklyStats();
      const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      
      const formattedData: WeeklyData[] = weeklyStats.map((stat, index) => ({
        day: days[index],
        hours: stat.savedHours,
        date: stat.date
      }));
      setWeeklyData(formattedData);
      
      const totalWeeklyHours = storage.getWeeklyFocusHours();
      setWeeklyFocusHours(totalWeeklyHours);
      
      const previousWeekHours = storage.getPreviousWeekFocusHours();
      const hourChange = storage.calculatePercentageChange(totalWeeklyHours, previousWeekHours);
      setFocusHoursChange(hourChange);
      
      const score = Math.min(100, Math.round((totalWeeklyHours / 40) * 100));
      setFocusScore(score);
      
      const previousScore = Math.min(100, Math.round((previousWeekHours / 40) * 100));
      const scoreChange = storage.calculatePercentageChange(score, previousScore);
      setFocusScoreChange(scoreChange);
      
      const weeklyTasks = storage.getWeeklyTasksCompleted();
      setTasksCompleted(weeklyTasks);
      
      const previousTasks = storage.getPreviousWeekTasksCompleted();
      const taskChange = storage.calculatePercentageChange(weeklyTasks, previousTasks);
      setTasksChange(taskChange);
      
      const best = storage.getBestProductiveDay();
      setBestDay(best);
      
      setDeepWorkHours(totalWeeklyHours * 0.6);
      setShallowWorkHours(totalWeeklyHours * 0.4);
      
      const weeklyWasted = weeklyStats.reduce((sum, s) => sum + s.wastedHours, 0);
      setWeeklyWastedHours(weeklyWasted);
      
      setTodaySavedHours(storage.getSavedTime());
      setTodayWastedHours(storage.getWastedTime());
      setSettings(storage.getSettings());
      setDailyUsage(storage.getDailyAppUsage());
    };
    
    loadData();
    
    const unsubscribeStats = storage.onChange('stats', loadData);
    const unsubscribeTasks = storage.onChange('tasks', loadData);
    return () => {
      unsubscribeStats();
      unsubscribeTasks();
    };
  }, []);

  const maxHours = Math.max(...weeklyData.map(d => d.hours), 1);
  const deepWorkGoal = 20;
  const deepWorkProgress = Math.min(100, (deepWorkHours / deepWorkGoal) * 100);

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const remainingMinutes = settings.dailyTimeLimitEnabled 
    ? storage.getRemainingTime()
    : Infinity;
  const isTimeLimitExceeded = settings.dailyTimeLimitEnabled && remainingMinutes <= 0;

  const toggleDailyTimeLimit = (checked: boolean) => {
    const newSettings = { ...settings, dailyTimeLimitEnabled: checked };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
    toast.success(`Daily limit ${checked ? 'enabled' : 'disabled'}`);
  };

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div className="min-h-screen flex flex-col relative pb-24">
      {/* Atmospheric backgrounds */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 left-0 w-64 h-64 bg-highlight/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-14 pb-6 relative z-10">
        <button 
          onClick={() => navigate('/')}
          className="size-11 flex items-center justify-center rounded-2xl bg-card/80 border border-border/50 transition-colors hover:bg-accent"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-lg font-bold tracking-tight">Insights</h1>
        <button 
          onClick={() => setIsCalendarOpen(true)}
          className="size-11 flex items-center justify-center rounded-2xl bg-card/80 border border-border/50 transition-colors hover:bg-accent"
        >
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>
      
      {/* Daily Limit Control Section */}
      <section className="px-6 mb-6 animate-fade-up">
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TimerOff className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Usage Protection</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Daily App Limit</p>
              </div>
            </div>
            <Switch 
              checked={settings.dailyTimeLimitEnabled}
              onCheckedChange={toggleDailyTimeLimit}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {settings.dailyTimeLimitEnabled && (
            <div 
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all border",
                isTimeLimitExceeded 
                  ? "bg-destructive/5 border-destructive/20" 
                  : "bg-primary/5 border-primary/20"
              )}
            >
              <div className={cn(
                "size-10 rounded-full flex items-center justify-center shrink-0",
                isTimeLimitExceeded ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              )}>
                 {isTimeLimitExceeded ? <Ban className="w-5 h-5" /> : <Timer className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={cn("text-sm font-bold", isTimeLimitExceeded ? "text-destructive" : "text-foreground")}>
                    {isTimeLimitExceeded ? 'Limit Reached' : 'Current Limit'}
                  </p>
                  <Edit2 className="w-3 h-3 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {isTimeLimitExceeded ? 'Apps Blocked' : `${formatMinutes(remainingMinutes)} left • Used ${formatMinutes(dailyUsage)}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Weekly Focus Chart */}
      <section className="px-6 mb-6 animate-fade-up">
        <div className="bg-card rounded-2xl p-6 border border-border/50 zen-card-shadow">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">Focus Hours</p>
              <h2 className="text-4xl font-bold tracking-tight">{weeklyFocusHours.toFixed(1)}<span className="text-lg text-muted-foreground font-medium ml-1">hrs</span></h2>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${
              focusHoursChange >= 0 
                ? 'bg-emerald-500/15 text-emerald-500' 
                : 'bg-red-500/15 text-red-400'
                ? 'bg-emerald-500/15 text-emerald-500' 
                : 'bg-red-500/15 text-red-400'
            }`}>
              {focusHoursChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {focusHoursChange >= 0 ? '+' : ''}{focusHoursChange}%
            </div>
          </div>
          
          {/* Bar Chart */}
          <div className="relative h-40 mt-8">
            <div className="flex items-end justify-between h-32 gap-2">
              {weeklyData.map((data, index) => {
                const barHeight = maxHours > 0 ? Math.max((data.hours / maxHours) * 100, 4) : 4;
                const isToday = index === new Date().getDay() - 1 || (new Date().getDay() === 0 && index === 6);
                return (
                  <div key={data.day} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                    <div 
                      className={`w-full rounded-lg transition-all duration-700 ease-out animate-grow-up ${
                        isToday ? 'bg-gradient-to-t from-primary to-purple-500' : 'bg-primary/30'
                      }`}
                      style={{ 
                        height: `${barHeight}%`,
                        animationDelay: `${index * 0.08}s`
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-3">
              {weeklyData.map((data) => (
                <span key={data.day} className="text-[10px] font-bold text-muted-foreground/60 flex-1 text-center">
                  {data.day}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Time Saved vs Wasted */}
      <section className="px-6 mb-6 animate-fade-up stagger-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card-positive p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Time Saved</p>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{formatTime(weeklyFocusHours)}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Today: {formatTime(todaySavedHours)}
            </p>
          </div>
          <div className="stat-card-negative p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Hourglass className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Time Wasted</p>
            </div>
            <p className="text-2xl font-bold text-red-400">{formatTime(weeklyWastedHours)}</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Today: {formatTime(todayWastedHours)}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="px-6 grid grid-cols-2 gap-3 mb-6 animate-fade-up stagger-2">
        <div className="bg-card p-5 rounded-2xl border border-border/50">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Focus Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold gradient-text">{focusScore}</span>
            <span className={`text-[10px] font-bold ${focusScoreChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {focusScoreChange >= 0 ? '+' : ''}{focusScoreChange}%
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-2">
            {focusScoreChange >= 0 ? 'Better than last week' : 'Lower than last week'}
          </p>
        </div>
        <div className="bg-card p-5 rounded-2xl border border-border/50">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tasks Done</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold">{tasksCompleted}</span>
            <span className={`text-[10px] font-bold ${tasksChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {tasksChange >= 0 ? '+' : ''}{tasksChange}%
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-2">
            {tasksChange >= 0 ? 'Consistent progress' : 'Less than last week'}
          </p>
        </div>
      </section>

      {/* Deep Work Breakdown */}
      <section className="px-6 mb-6 animate-fade-up stagger-3">
        <div className="bg-card rounded-2xl p-5 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">Weekly Breakdown</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Deep Work</span>
                <span className="text-sm font-bold text-primary">{formatTime(deepWorkHours)}</span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${deepWorkProgress}%`, background: 'var(--gradient-primary)' }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <p className="text-[10px] text-muted-foreground">
                  {bestDay ? `Best: ${bestDay.day} (${bestDay.hours.toFixed(1)}h)` : 'Track more sessions'}
                </p>
                <p className="text-[10px] text-muted-foreground">Goal: {deepWorkGoal}h</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pro Insight */}
      <section className="px-6 mb-6 animate-fade-up stagger-4">
        <div className="relative rounded-2xl p-5 overflow-hidden gradient-border">
          <div className="absolute inset-0 bg-primary/5" />
          <div className="relative flex gap-4 items-start">
            <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-primary" style={{ fill: 'currentColor' }} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-1">Pro Insight</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {bestDay ? (
                  <>
                    You're most productive on <span className="text-primary font-semibold">{bestDay.day} mornings</span>. 
                    Schedule deep work between 8-11 AM for maximum focus.
                  </>
                ) : (
                  <>
                    Start tracking focus sessions to unlock personalized productivity insights.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <CalendarModal 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
      />

      <CustomTimeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(mins) => {
          const newSettings = { ...settings, dailyTimeLimitMinutes: mins };
          setSettings(newSettings);
          storage.saveSettings(newSettings);
          toast.success("Daily limit updated!");
        }}
        initialValue={settings.dailyTimeLimitMinutes}
        title="Adjust Daily Limit"
      />
    </div>
  );
}
