import { useState, useEffect } from "react";
import { toast } from "sonner";
import { storage, Task } from "@/lib/storage";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import QuickAddTaskModal from "@/components/QuickAddTaskModal";

export default function Tasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const loadTasks = () => setTasks(storage.getTasks());
    loadTasks();
    
    const unsubscribe = storage.onChange('tasks', loadTasks);
    return () => unsubscribe();
  }, []);

  const toggleComplete = (id: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    storage.saveTasks(updatedTasks);
  };

  const deleteTask = (id: string) => {
    const updatedTasks = tasks.filter(task => task.id !== id);
    setTasks(updatedTasks);
    storage.saveTasks(updatedTasks);
    toast.success("Task deleted");
  };

  const handleAddTask = (newTask: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    const task: Task = {
      ...newTask,
      id: Date.now().toString(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    storage.saveTasks(updatedTasks);
    toast.success("Task added");
  };

  const normalizeDate = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const isToday = (dateStr: string) => {
    if (!dateStr) return false;
    const today = normalizeDate(new Date());
    const date = normalizeDate(new Date(dateStr));
    return date.getTime() === today.getTime();
  };

  const isTomorrow = (dateStr: string) => {
    if (!dateStr) return false;
    const tomorrow = normalizeDate(new Date());
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = normalizeDate(new Date(dateStr));
    return date.getTime() === tomorrow.getTime();
  };

  const isUpcoming = (dateStr: string) => {
    if (!dateStr) return false;
    const today = normalizeDate(new Date());
    const date = normalizeDate(new Date(dateStr));
    return date.getTime() > today.getTime();
  };

  const todayTasks = tasks.filter(t => isToday(t.dueDate) || !t.dueDate);
  const tomorrowTasks = tasks.filter(t => isTomorrow(t.dueDate));
  const laterTasks = tasks.filter(t => 
    t.dueDate && !isToday(t.dueDate) && !isTomorrow(t.dueDate) && isUpcoming(t.dueDate)
  );

  const remainingSessions = tasks.filter(t => !t.completed).length;
  const completedToday = todayTasks.filter(t => t.completed).length;

  const renderTaskItem = (task: Task, index: number) => (
    <div 
      key={task.id}
      className="flex items-center group gap-4 py-4 px-4 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm transition-all hover:bg-card/80 animate-fade-up"
      style={{ animationDelay: `${index * 0.05}s`, opacity: 0, animationFillMode: 'forwards' }}
    >
      <button
        onClick={() => toggleComplete(task.id)}
        className={`flex-shrink-0 size-6 rounded-lg border-2 transition-all flex items-center justify-center ${
          task.completed 
            ? 'bg-primary border-primary' 
            : task.priority === 'high' 
              ? 'border-highlight/60 hover:border-highlight' 
              : 'border-border hover:border-primary/50'
        }`}
      >
        {task.completed && (
          <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'wght' 500" }}>check</span>
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {task.priority === 'high' && !task.completed && (
            <div className="priority-dot high" />
          )}
          <p className={`text-base font-medium truncate ${
            task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}>
            {task.title}
          </p>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
        )}
      </div>
      
      <button
        onClick={() => deleteTask(task.id)}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-xl transition-all"
      >
        <span className="material-symbols-outlined text-muted-foreground hover:text-destructive text-lg">delete</span>
      </button>
    </div>
  );

  const renderSection = (title: string, taskList: Task[], emptyMessage: string) => (
    <section className="space-y-3 mb-8">
      <div className="flex items-center gap-3 px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{title}</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        <span className="text-xs font-medium text-muted-foreground">{taskList.length}</span>
      </div>
      {taskList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-muted-foreground text-2xl">task_alt</span>
          </div>
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {taskList.map((task, index) => renderTaskItem(task, index))}
        </div>
      )}
    </section>
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
      {/* Atmospheric backgrounds */}
      <div className="absolute -top-32 -right-32 size-80 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-32 -left-32 size-64 bg-highlight/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="flex flex-col px-6 pt-14 pb-4 gap-4 sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Inbox</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {remainingSessions} tasks remaining
              {completedToday > 0 && <span className="text-primary"> · {completedToday} done today</span>}
            </p>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="size-11 rounded-2xl overflow-hidden border border-border/50 bg-card/80 flex items-center justify-center hover:bg-accent transition-colors"
          >
            <span className="material-symbols-outlined text-muted-foreground">person</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <nav className="flex gap-1 p-1 rounded-2xl bg-muted/50">
          <button 
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'today' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Today
          </button>
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'upcoming' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Upcoming
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-6">
        {activeTab === 'today' ? (
          renderSection('Today', todayTasks, 'No tasks for today. Enjoy your free time!')
        ) : (
          <>
            {tomorrowTasks.length > 0 && renderSection('Tomorrow', tomorrowTasks, '')}
            {laterTasks.length > 0 && renderSection('Later', laterTasks, '')}
            {tomorrowTasks.length === 0 && laterTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary text-3xl">event_available</span>
                </div>
                <p className="text-foreground font-medium mb-1">All caught up!</p>
                <p className="text-muted-foreground text-sm">No upcoming tasks scheduled</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Quick Add Modal */}
      <QuickAddTaskModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onAddTask={handleAddTask}
      />
    </div>
  );
}
