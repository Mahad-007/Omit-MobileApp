import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { storage, Task } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusHours, setFocusHours] = useState(0);
  const [focusModeActive, setFocusModeActive] = useState(false);

  useEffect(() => {
    // Load initial data
    const loadData = () => {
      setTasks(storage.getTasks());
      setFocusHours(storage.getSavedTime());
      
      // Check for active focus session
      const session = storage.getActiveSession();
      if (session) {
        setFocusModeActive(true);
      } else {
        setFocusModeActive(false);
      }
    };
    loadData();

    // Subscribe to storage changes for real-time updates
    const unsubscribeTasks = storage.onChange('tasks', loadData);
    const unsubscribeStats = storage.onChange('stats', loadData);
    const unsubscribeAll = storage.onChange('all', loadData);
    
    // Also listen for cross-tab storage changes
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      unsubscribeTasks();
      unsubscribeStats();
      unsubscribeAll();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const remainingTasks = tasks.filter(t => !t.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get current date
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-US', options);
  
  // Get greeting based on time
  const hour = now.getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

  // Get user's first name
  const userName = user?.email?.split('@')[0] || 'there';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  // Get priority task
  const priorityTask = tasks.find(t => !t.completed && t.priority === 'high') || 
                       tasks.find(t => !t.completed);

  const handleStartFocus = () => {
    if (focusModeActive) {
      navigate('/timer');
    } else {
      navigate('/blocker');
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header Section */}
      <header className="flex items-center bg-transparent pt-12 px-6 pb-8 justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-primary font-semibold text-xs tracking-[0.2em] uppercase">
            Today • {dateStr}
          </p>
          <h2 className="text-foreground text-3xl font-bold leading-tight tracking-tight">
            {greeting}, {displayName}
          </h2>
        </div>
        <div className="flex size-12 items-center justify-end">
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center rounded-full h-12 w-12 bg-card text-foreground hover:bg-primary/20 transition-colors border border-border"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <section className="flex gap-4 px-6 mb-8">
        <div className="flex-1 flex flex-col gap-2 rounded-xl p-5 border border-border bg-card/40 zen-card-shadow">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">checklist</span>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Remaining</p>
          </div>
          <p className="text-foreground text-2xl font-bold">{remainingTasks}</p>
        </div>
        <div className="flex-1 flex flex-col gap-2 rounded-xl p-5 border border-border bg-card/40 zen-card-shadow">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">hourglass_empty</span>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Deep Work</p>
          </div>
          <p className="text-foreground text-2xl font-bold">{focusHours.toFixed(1)}h</p>
        </div>
      </section>

      {/* Primary Focus Card */}
      <main className="px-6 mb-10">
        <div className="flex flex-col items-stretch justify-start rounded-xl overflow-hidden bg-card zen-card-shadow">
          <div 
            className="w-full h-48 bg-center bg-no-repeat bg-cover relative"
            style={{
              backgroundImage: 'linear-gradient(135deg, hsl(200 35% 25%) 0%, hsl(208 30% 35%) 100%)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent"></div>
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-primary/80 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                {focusModeActive ? 'In Progress' : 'Priority One'}
              </span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 p-6">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">Primary Focus</p>
            <h3 className="text-foreground text-2xl font-bold leading-tight tracking-tight">
              {priorityTask?.title || 'No tasks yet'}
            </h3>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span className="text-sm font-medium">
                  {focusModeActive ? 'Session active' : '25 min session'}
                </span>
              </div>
              <button 
                onClick={() => navigate('/tasks')}
                className="flex items-center justify-center rounded-lg h-9 px-4 bg-primary/20 text-primary border border-primary/30 text-sm font-bold"
              >
                <span>Details</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Progress Section */}
      <section className="px-6 mb-12">
        <div className="flex flex-col gap-3 p-6 rounded-xl border border-border/50 bg-card/20">
          <div className="flex justify-between items-end">
            <p className="text-foreground text-sm font-medium">Daily Progress</p>
            <p className="text-primary text-lg font-bold">{progressPercent}%</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div 
              className="h-full rounded-full bg-primary transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-muted-foreground text-xs italic">
            {progressPercent >= 100 ? 'All tasks completed!' : 
             progressPercent >= 50 ? 'Almost at your daily goal' : 
             'Keep pushing forward'}
          </p>
        </div>
      </section>

      {/* Centered Action Button */}
      <section className="flex px-6 pb-20 justify-center">
        <button 
          onClick={handleStartFocus}
          className="group flex min-w-[200px] items-center justify-center rounded-full h-16 px-8 bg-primary text-white gap-3 text-lg font-bold tracking-tight soft-glow active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined fill-current group-hover:scale-110 transition-transform">
            {focusModeActive ? 'timer' : 'play_arrow'}
          </span>
          <span>{focusModeActive ? 'View Timer' : 'Start Focus'}</span>
        </button>
      </section>
    </div>
  );
}
