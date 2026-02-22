import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storage, DailyStats, Settings } from "@/lib/storage";
import { useTasks } from "@/lib/api";
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
  Lightbulb,
  Zap,
  Target
} from "lucide-react";

interface WeeklyData {
  day: string;
  hours: number;
  date: string;
}

export default function Stats() {
  const navigate = useNavigate();
  const { data: tasks = [] } = useTasks();

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
      
      const score = Math.min(100, Math.round((totalWeeklyHours / 40) * 100)); // Simple scoring based on 40h workweek goal
      setFocusScore(score);
      
      const previousScore = Math.min(100, Math.round((previousWeekHours / 40) * 100));
      const scoreChange = storage.calculatePercentageChange(score, previousScore);
      setFocusScoreChange(scoreChange);
      
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
    
    return () => {
      unsubscribeStats();
    };
  }, []);

  // Calculate task stats from API data whenever it changes
  useEffect(() => {
    // Helper to get start of current week (Monday)
    const getWeekStart = (d: Date = new Date()) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(d);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      return start;
    };

    const weekStart = getWeekStart();
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const currentWeekTasks = tasks.filter(t => {
      if (!t.completed) return false;
      const dateStr = t.completedAt || t.createdAt;
      if (!dateStr) return true;
      const date = new Date(dateStr);
      return date >= weekStart;
    }).length;

    const lastWeekTasks = tasks.filter(t => {
      if (!t.completed) return false;
      const dateStr = t.completedAt || t.createdAt;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return date >= lastWeekStart && date < weekStart;
    }).length;

    setTasksCompleted(currentWeekTasks);
    setTasksChange(storage.calculatePercentageChange(currentWeekTasks, lastWeekTasks));

  }, [tasks]);

  const maxHours = Math.max(...weeklyData.map(d => d.hours), 1);
  const deepWorkGoal = 20;
  const deepWorkProgress = Math.min(100, (deepWorkHours / deepWorkGoal) * 100);

  const formatHoursToTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };
  
  const formatMinutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
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

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden pb-safe-area-bottom">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      
      {/* Header - Compact */}
      <header className="flex items-center justify-between px-6 safe-area-top pt-6 pb-2 relative z-10 animate-fade-up">
        <button 
          onClick={() => navigate('/')}
          className="size-10 flex items-center justify-center rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 transition-colors hover:bg-white/80 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <span className="text-sm font-bold tracking-tight bg-secondary/50 px-3 py-1 rounded-full backdrop-blur-sm">Insights</span>
        <button 
          onClick={() => setIsCalendarOpen(true)}
          className="size-10 flex items-center justify-center rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 transition-colors hover:bg-white/80 active:scale-95"
        >
          <Calendar className="w-5 h-5 text-foreground" />
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar space-y-3">
        
        {/* Daily Limit Control - Compact */}
        <section className="animate-fade-up stagger-1">
          <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/20 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <TimerOff className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <p className="text-xs font-bold text-foreground">Usage Limit</p>
                  <p className="text-[10px] text-muted-foreground">{settings.dailyTimeLimitEnabled ? (isTimeLimitExceeded ? "Limit Reached" : `${formatMinutesToTime(remainingMinutes)} left`) : "Disabled"}</p>
                </div>
              </div>
              <Switch 
                checked={settings.dailyTimeLimitEnabled}
                onCheckedChange={toggleDailyTimeLimit}
                className="scale-75 origin-right data-[state=checked]:bg-primary"
              />
            </div>

            {settings.dailyTimeLimitEnabled && (
              <div 
                onClick={() => setIsModalOpen(true)}
                className={cn(
                  "h-8 px-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-black/5 transition-all border w-full",
                  isTimeLimitExceeded 
                    ? "bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-800/30" 
                    : "bg-indigo-50/30 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800/30"
                )}
              >
                  <span className="text-[10px] font-medium text-muted-foreground">Used: {formatMinutesToTime(dailyUsage)}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-foreground">{formatMinutesToTime(settings.dailyTimeLimitMinutes)} limit</span>
                    <Edit2 className="w-3 h-3 text-muted-foreground ml-1" />
                  </div>
              </div>
            )}
          </div>
        </section>

        {/* Weekly Focus & Charts - Combined BENTO */}
        <section className="grid grid-cols-2 gap-3 animate-fade-up stagger-2">
            
            {/* Main Focus Stat */}
            <div className="col-span-2 bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-border shadow-sm flex flex-col justify-between min-h-[160px]">
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">{weeklyFocusHours.toFixed(1)}<span className="text-sm text-muted-foreground font-medium ml-1">h</span></h2>
                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">Focus Time</p>
                  </div>
                   <div className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1",
                    focusHoursChange >= 0 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}>
                    {focusHoursChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(focusHoursChange)}%
                  </div>
               </div>

               {/* Mini Bar Chart */}
               <div className="flex items-end justify-between h-16 gap-2 mt-4">
                  {weeklyData.map((data, index) => {
                    const barHeight = maxHours > 0 ? Math.max((data.hours / maxHours) * 100, 10) : 10;
                    const isToday = index === new Date().getDay() - 1 || (new Date().getDay() === 0 && index === 6);
                    return (
                      <div key={data.day} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div 
                          className={cn(
                            "w-full rounded-md transition-all duration-700 ease-out",
                            isToday 
                              ? "bg-primary shadow-[0_0_8px_rgba(99,102,241,0.4)]" 
                              : "bg-muted"
                          )}
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>
                    );
                  })}
               </div>
               <div className="flex justify-between mt-2">
                 {weeklyData.map(d => (
                   <span key={d.day} className="text-[8px] font-bold text-muted-foreground/50 w-full text-center">{d.day.charAt(0)}</span>
                 ))}
               </div>
            </div>

            {/* Focus Score - Informational */}
            <div 
              onClick={() => toast.info("Score based on 40h weekly goal. Keep focusing!")}
              className="bg-white/60 dark:bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-border shadow-sm flex flex-col justify-center cursor-pointer hover:bg-white/80 active:scale-95 transition-all"
            >
               <div className="flex items-center justify-between mb-2">
                  <div className="size-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                     <Target className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">SCORE</span>
               </div>
               <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold gradient-text">{focusScore}</span>
                  <span className="text-[10px] text-muted-foreground">/100</span>
               </div>
            </div>

            {/* Saved Time - Navigates to Focus Mode */}
            <div 
              onClick={() => navigate('/')}
              className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800/20 flex flex-col justify-center cursor-pointer hover:bg-emerald-100/50 active:scale-95 transition-all"
            >
               <div className="flex items-center justify-between mb-2">
                  <div className="size-8 rounded-full bg-white dark:bg-emerald-900/40 flex items-center justify-center text-emerald-500 shadow-sm">
                     <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600/70">SAVED</span>
               </div>
               {/* todaySavedHours is in hours */}
               <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{formatHoursToTime(todaySavedHours)}</span>
            </div>
            
             {/* Wasted Time - Navigates to Blocker */}
            <div 
              onClick={() => navigate('/blocker')}
              className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-3xl border border-red-100 dark:border-red-800/20 flex flex-col justify-center cursor-pointer hover:bg-red-100/50 active:scale-95 transition-all"
            >
               <div className="flex items-center justify-between mb-2">
                  <div className="size-8 rounded-full bg-white dark:bg-red-900/40 flex items-center justify-center text-red-500 shadow-sm">
                     <Hourglass className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-red-600/70">WASTED</span>
               </div>
               {/* dailyUsage is in minutes, convert to readable time */}
               <span title={formatMinutesToTime(dailyUsage)} className="text-xl font-bold text-red-700 dark:text-red-400 truncate w-full block">{formatMinutesToTime(dailyUsage)}</span>
            </div>

             {/* Tasks Done - Navigates to Tasks */}
            <div 
              onClick={() => navigate('/tasks')}
              className="bg-white/60 dark:bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-border shadow-sm flex flex-col justify-center cursor-pointer hover:bg-white/80 active:scale-95 transition-all"
            >
               <div className="flex items-center justify-between mb-2">
                  <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                     <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">TASKS</span>
               </div>
               <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">{tasksCompleted}</span>
                  <span className="text-[10px] text-muted-foreground">Done</span>
               </div>
            </div>

        </section>

        {/* Pro Insight - Compact Banner */}
        <section className="animate-fade-up stagger-3">
          <div className="relative rounded-2xl p-4 overflow-hidden border border-primary/20 bg-gradient-to-r from-primary/5 via-purple-500/5 to-transparent">
             <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center shrink-0 shadow-md">
                   <Lightbulb className="w-4 h-4 text-white fill-current" />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Insight</p>
                   <p className="text-xs text-muted-foreground font-medium leading-snug line-clamp-2">
                      {bestDay ? `Most productive on ${bestDay.day} mornings. Schedule deep work 8-11 AM.` : 'Track more sessions to get personalized insights.'}
                   </p>
                </div>
             </div>
          </div>
        </section>

      </div>

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
