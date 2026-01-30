import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { storage, Task } from "@/lib/storage";
import AppBlocker, { isCapacitor } from "@/lib/app-blocker";
import { NotificationManager } from "@/utils/notifications";
import { 
  CheckCircle, 
  Edit, 
  ArrowRightLeft, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Play, 
  Pause, 
  Square 
} from "lucide-react";

export default function FocusTimer() {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTask, setCurrentTask] = useState("Deep Work Session");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [strictMode, setStrictMode] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [showTaskSelector, setShowTaskSelector] = useState(false);

  const finishSession = useCallback(async () => {
    // Android stopping logic is now handled by PersistentBlockerManager listening to session end
    
    storage.endFocusSession();
    NotificationManager.cancelRemainingTime();
    window.postMessage({ type: 'OMIT_SYNC_REQUEST', payload: { focusMode: false } }, '*');
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    const settings = storage.getSettings();
    setStrictMode(settings.strictMode);

    const session = storage.getActiveSession();
    if (!session) {
      navigate('/');
      return;
    }

    const remaining = session.endTime - Date.now();
    if (remaining <= 0) {
      finishSession();
      return;
    }

    setTimeRemaining(Math.floor(remaining / 1000));
    setTotalTime(session.duration * 60);

    const tasks = storage.getTasks();
    const incompleteTasks = tasks.filter(t => !t.completed);
    setAvailableTasks(incompleteTasks);
    
    const priorityTask = incompleteTasks.find(t => t.priority === 'high') || 
                         incompleteTasks[0];
    if (priorityTask) {
      setCurrentTask(priorityTask.title);
      setCurrentTaskId(priorityTask.id);
    }
  }, [navigate, finishSession]);

  useEffect(() => {
    if (isPaused) return;

    const session = storage.getActiveSession();
    if (!session) {
      navigate('/');
      return;
    }

    const interval = setInterval(() => {
      const currentSession = storage.getActiveSession();
      if (!currentSession) {
        navigate('/');
        return;
      }

      const remaining = currentSession.endTime - Date.now();
      if (remaining <= 0) {
        finishSession();
        return;
      }

      const remainingSeconds = Math.floor(remaining / 1000);
      setTimeRemaining(remainingSeconds);

      // Update notification every minute or at start
      if (remainingSeconds % 60 === 0 || remainingSeconds === Math.floor((currentSession.endTime - Date.now()) / 1000)) {
        NotificationManager.updateRemainingTime(remainingSeconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, navigate, finishSession]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleEndSession = () => {
    if (strictMode) return;
    finishSession();
  };

  const handleCompleteTask = () => {
    if (currentTaskId) {
      const tasks = storage.getTasks();
      const taskToComplete = tasks.find(t => t.id === currentTaskId);
      if (taskToComplete) {
        storage.saveTask({ ...taskToComplete, completed: true });
      }
      
      const updatedTasks = storage.getTasks();
      const incompleteTasks = updatedTasks.filter(t => !t.completed);
      setAvailableTasks(incompleteTasks);
      
      const nextTask = incompleteTasks.find(t => t.priority === 'high') || 
                       incompleteTasks[0];
      if (nextTask) {
        setCurrentTask(nextTask.title);
        setCurrentTaskId(nextTask.id);
      } else {
        setCurrentTask("No more tasks");
        setCurrentTaskId(null);
      }
    }
  };

  const handleSelectTask = (task: Task) => {
    setCurrentTask(task.title);
    setCurrentTaskId(task.id);
    setShowTaskSelector(false);
  };

  const progressPercent = totalTime > 0 ? Math.round(((totalTime - timeRemaining) / totalTime) * 100) : 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = totalTime > 0 ? circumference * (timeRemaining / totalTime) : circumference;

  return (
    <div className="min-h-screen flex flex-col items-center justify-between text-foreground relative overflow-hidden">
      {/* Deep Atmospheric Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-black/40" />
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-subtle-pulse" />
      
      {/* Noise overlay for texture */}
      <div className="absolute inset-0 noise-overlay pointer-events-none" />

      {/* Session Header */}
      <header className="w-full pt-16 px-8 flex flex-col items-center gap-3 animate-fade-up relative z-10">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary animate-subtle-pulse" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-primary/80 font-bold">
            Focus Session
          </span>
        </div>
        <h2 className="text-foreground/60 text-sm font-medium tracking-wide uppercase">
          Deep Work Mode
        </h2>
      </header>

      {/* Central Timer Display */}
      <main className="relative flex flex-col items-center justify-center flex-grow w-full z-10 -mt-8">
        {/* Timer Container */}
        <div className="relative w-80 h-80 flex items-center justify-center">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-subtle-pulse" />
          
          {/* SVG Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background track */}
            <circle 
              className="text-foreground/5" 
              cx="50" 
              cy="50" 
              fill="transparent" 
              r={radius} 
              stroke="currentColor" 
              strokeWidth="1"
            />
            {/* Progress ring */}
            <circle 
              cx="50" 
              cy="50" 
              fill="transparent" 
              r={radius} 
              stroke="url(#timerGradient)" 
              strokeDasharray={circumference} 
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" 
              strokeWidth="2"
              className="timer-ring"
              style={{ 
                willChange: 'stroke-dashoffset',
                transition: 'stroke-dashoffset 1s linear',
                filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))'
              }}
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(258, 85%, 65%)" />
                <stop offset="100%" stopColor="hsl(280, 80%, 58%)" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Time Display */}
          <div className="flex flex-col items-center text-center animate-breathe">
            <span className="focus-timer-display text-7xl tracking-tighter text-foreground tabular-nums">
              {formatTime(timeRemaining)}
            </span>
            <span className="text-muted-foreground/60 text-xs font-medium uppercase tracking-widest mt-2">
              remaining
            </span>
          </div>
        </div>

        {/* Current Task Pill */}
        <div className="mt-10 flex flex-col items-center gap-3 relative">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCompleteTask}
              disabled={!currentTaskId}
              className="flex items-center gap-3 px-5 py-3 bg-card rounded-2xl border border-border/30 transition-all hover:bg-card/80 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className={`size-6 rounded-lg flex items-center justify-center transition-colors ${
                currentTaskId ? 'bg-primary/20 group-hover:bg-primary/30' : 'bg-muted'
              }`}>
                <span className="text-primary flex items-center justify-center">
                  {currentTaskId ? <CheckCircle className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                </span>
              </div>
              <div className="text-left">
                <p className="text-foreground/50 text-[10px] uppercase tracking-wider font-medium">
                  {currentTaskId ? 'Tap to complete' : 'Current task'}
                </p>
                <p className="text-foreground text-sm font-semibold max-w-[200px] truncate">
                  {currentTask}
                </p>
              </div>
            </button>
            
            {availableTasks.length > 1 && (
              <button
                onClick={() => setShowTaskSelector(!showTaskSelector)}
                className="p-3 bg-card rounded-xl border border-border/30 transition-all hover:bg-card/80 active:scale-95"
                title="Switch task"
              >
                <ArrowRightLeft className="w-5 h-5 text-foreground/60" />
              </button>
            )}
          </div>
          
          {/* Task Selector Dropdown */}
          {showTaskSelector && availableTasks.length > 0 && (
            <div className="absolute top-full mt-2 w-72 max-h-60 overflow-y-auto bg-card rounded-2xl border border-border/40 shadow-xl z-50 animate-scale-in">
              <div className="p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold px-3 py-2">
                  Select a task
                </p>
                {availableTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 ${
                      task.id === currentTaskId 
                        ? 'bg-primary/15 text-primary' 
                        : 'hover:bg-accent text-foreground/80'
                    }`}
                  >
                    <span className="text-base flex items-center justify-center">
                      {task.priority === 'high' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </span>
                    <span className="text-sm font-medium truncate flex-1">{task.title}</span>
                    {task.priority === 'high' && (
                      <span className="text-[10px] px-2 py-0.5 bg-highlight/20 text-highlight rounded-full font-bold">
                        High
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Controls */}
      <footer className="w-full max-w-[400px] px-6 pb-10 flex flex-col gap-5 relative z-10">
        {/* Progress Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <p className="text-foreground/40 text-[10px] font-semibold uppercase tracking-widest">Progress</p>
            <p className="text-foreground/70 text-sm font-bold">{progressPercent}%</p>
          </div>
          <div className="h-1 w-full bg-foreground/10 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out" 
              style={{ 
                width: `${progressPercent}%`,
                background: 'var(--gradient-primary)'
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 items-center">
          <button 
            onClick={() => !strictMode && setIsPaused(!isPaused)}
            disabled={strictMode}
            className={`flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl font-semibold text-sm transition-all ${
              strictMode
                ? 'bg-muted/50 text-muted-foreground cursor-not-allowed border border-border/30'
                : 'bg-card border border-border/40 text-foreground active:scale-[0.98] hover:bg-card'
            }`}
          >
            <span className="text-lg flex items-center justify-center">
              {strictMode ? <Lock className="w-5 h-5" /> : isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </span>
            <span>{strictMode ? 'Locked' : isPaused ? 'Resume' : 'Pause'}</span>
          </button>
          <button 
            onClick={handleEndSession}
            disabled={strictMode}
            className={`flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl font-semibold text-sm transition-all ${
              strictMode 
                ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' 
                : 'text-white active:scale-[0.98]'
            }`}
            style={!strictMode ? { background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' } : {}}
          >
            <span className="text-lg flex items-center justify-center">{strictMode ? <Lock className="w-5 h-5" /> : <Square className="w-5 h-5" fill="currentColor" />}</span>
            <span>{strictMode ? 'Strict Mode' : 'End Session'}</span>
          </button>
        </div>
      </footer>

      {/* Bottom vignette overlay */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-t from-background/60 via-transparent to-transparent" />
    </div>
  );
}
