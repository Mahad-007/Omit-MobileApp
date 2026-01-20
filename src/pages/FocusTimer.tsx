import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { storage, Task } from "@/lib/storage";
import AppBlocker, { isCapacitor } from "@/lib/app-blocker";

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
    if (isCapacitor()) {
      try {
        await AppBlocker.stopMonitoring();
        localStorage.setItem("android_monitoring", "false");
      } catch (e) {
        console.error("Failed to stop blocking", e);
      }
    }
    storage.endFocusSession();
    window.postMessage({ type: 'OMIT_SYNC_REQUEST', payload: { focusMode: false } }, '*');
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    // Load strict mode setting
    const settings = storage.getSettings();
    setStrictMode(settings.strictMode);

    // Check for active session
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

    // Get all tasks and set available (incomplete) tasks
    const tasks = storage.getTasks();
    const incompleteTasks = tasks.filter(t => !t.completed);
    setAvailableTasks(incompleteTasks);
    
    // Get priority task as default
    const priorityTask = incompleteTasks.find(t => t.priority === 'high') || 
                         incompleteTasks[0];
    if (priorityTask) {
      setCurrentTask(priorityTask.title);
      setCurrentTaskId(priorityTask.id);
    }
  }, [navigate, finishSession]);

  useEffect(() => {
    if (isPaused) return;

    // Initial check for valid session
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

      setTimeRemaining(Math.floor(remaining / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, navigate, finishSession]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleEndSession = () => {
    // In strict mode, prevent ending the session early
    if (strictMode) {
      return;
    }
    
    finishSession();
  };

  const handleCompleteTask = () => {
    if (currentTaskId) {
      // Get the full task and update it
      const tasks = storage.getTasks();
      const taskToComplete = tasks.find(t => t.id === currentTaskId);
      if (taskToComplete) {
        storage.saveTask({ ...taskToComplete, completed: true });
      }
      
      // Find next task from available incomplete tasks
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
  const radius = 45; // Radius in viewBox units
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = totalTime > 0 ? circumference * (timeRemaining / totalTime) : circumference;

  return (
    <div className="min-h-screen flex flex-col items-center justify-between font-display text-foreground">
      {/* Subtle Session Indicator at the Top */}
      <header className="w-full pt-16 px-8 flex flex-col items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.4em] text-primary font-bold opacity-80">
          Current Session
        </span>
        <h2 className="text-foreground/90 text-sm font-medium tracking-tight">DEEP WORK</h2>
      </header>

      {/* Central Immersive Timer */}
      <main className="relative flex flex-col items-center justify-center flex-grow w-full">
        {/* Circular Progress SVG Container */}
        <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center">
          {/* Background Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle 
              className="text-foreground/5" 
              cx="50" 
              cy="50" 
              fill="transparent" 
              r={radius} 
              stroke="currentColor" 
              strokeWidth="1.5"
            ></circle>
            {/* Progress Ring */}
            <circle 
              className="text-primary timer-ring" 
              cx="50" 
              cy="50" 
              fill="transparent" 
              r={radius} 
              stroke="currentColor" 
              strokeDasharray={circumference} 
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" 
              strokeWidth="2"
              style={{ 
                willChange: 'stroke-dashoffset',
                transition: 'stroke-dashoffset 1s linear'
              }}
            ></circle>
          </svg>
          {/* Digital Clock Display */}
          <div className="flex flex-col items-center text-center">
            <span className="text-7xl font-extralight tracking-tighter text-foreground tabular-nums">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        {/* Task Label Below Timer */}
        <div className="mt-12 flex flex-col items-center gap-3 relative">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCompleteTask}
              disabled={!currentTaskId}
              className="flex items-center gap-2 px-4 py-2 bg-foreground/5 rounded-full backdrop-blur-sm border border-foreground/10 transition-all hover:bg-foreground/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">
                {currentTaskId ? 'check_circle' : 'edit_note'}
              </span>
              <p className="text-foreground/60 text-sm font-light leading-normal">
                {currentTaskId ? (
                  <>Tap to complete: <span className="text-foreground/90 font-normal">{currentTask}</span></>
                ) : (
                  <span className="text-foreground/90 font-normal">{currentTask}</span>
                )}
              </p>
            </button>
            {availableTasks.length > 1 && (
              <button
                onClick={() => setShowTaskSelector(!showTaskSelector)}
                className="p-2 bg-foreground/5 rounded-full backdrop-blur-sm border border-foreground/10 transition-all hover:bg-foreground/10 active:scale-95"
                title="Change task"
              >
                <span className="material-symbols-outlined text-[18px] text-foreground/60">
                  swap_horiz
                </span>
              </button>
            )}
          </div>
          
          {/* Task Selector Dropdown */}
          {showTaskSelector && availableTasks.length > 0 && (
            <div className="absolute top-full mt-2 w-72 max-h-60 overflow-y-auto bg-background/95 backdrop-blur-md rounded-xl border border-foreground/10 shadow-xl z-50">
              <div className="p-2">
                <p className="text-xs text-foreground/50 uppercase tracking-wider px-3 py-2">
                  Select a task
                </p>
                {availableTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2 ${
                      task.id === currentTaskId 
                        ? 'bg-primary/20 text-primary' 
                        : 'hover:bg-foreground/5 text-foreground/80'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {task.priority === 'high' ? 'priority_high' : 'task_alt'}
                    </span>
                    <span className="text-sm truncate">{task.title}</span>
                    {task.priority === 'high' && (
                      <span className="ml-auto text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
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

      {/* Minimal Bottom Controls */}
      <footer className="w-full max-w-[480px] px-8 pb-12 flex flex-col gap-6">
        {/* Progress Bar */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-6 justify-between items-end">
            <p className="text-foreground/40 text-xs font-medium uppercase tracking-widest">Elapsed</p>
            <p className="text-foreground/80 text-sm font-medium">{progressPercent}%</p>
          </div>
          <div className="h-[2px] w-full bg-foreground/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-1000" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Button Actions */}
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => !strictMode && setIsPaused(!isPaused)}
            disabled={strictMode}
            className={`flex-1 h-14 flex items-center justify-center gap-2 rounded-xl font-semibold text-base transition-all ${
              strictMode
                ? 'bg-muted text-muted-foreground cursor-not-allowed border border-foreground/10'
                : 'bg-foreground/5 border border-foreground/10 text-foreground active:scale-95 hover:bg-foreground/10'
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {strictMode ? 'lock' : isPaused ? 'play_arrow' : 'pause'}
            </span>
            <span>{strictMode ? 'Locked' : isPaused ? 'Resume' : 'Pause'}</span>
          </button>
          <button 
            onClick={handleEndSession}
            disabled={strictMode}
            className={`flex-1 h-14 flex items-center justify-center gap-2 rounded-xl font-semibold text-base transition-all ${
              strictMode 
                ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                : 'bg-primary text-white shadow-xl shadow-primary/20 active:scale-95 hover:brightness-110'
            }`}
          >
            <span className="material-symbols-outlined text-xl">{strictMode ? 'lock' : 'stop'}</span>
            <span>{strictMode ? 'Strict Mode' : 'End Session'}</span>
          </button>
        </div>

        {/* Home Indicator Safe Area Space */}
        <div className="h-2"></div>
      </footer>

      {/* Distraction Free Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/40"></div>
    </div>
  );
}
