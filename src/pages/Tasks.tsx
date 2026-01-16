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
    
    // Subscribe to task changes for real-time updates
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

  // Date helpers - normalize dates to midnight for accurate comparison
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

  const isPast = (dateStr: string) => {
    if (!dateStr) return false;
    const today = normalizeDate(new Date());
    const date = normalizeDate(new Date(dateStr));
    return date.getTime() < today.getTime();
  };

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter(task => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeTab === 'today') {
      // Today tab: show tasks due today or with no due date, excluding past tasks
      return isToday(task.dueDate) || !task.dueDate;
    }
    // Upcoming tab: show tasks due after today
    return isUpcoming(task.dueDate) && !isToday(task.dueDate);
  });

  const todayTasks = tasks.filter(t => isToday(t.dueDate) || !t.dueDate);
  const tomorrowTasks = tasks.filter(t => isTomorrow(t.dueDate));
  const laterTasks = tasks.filter(t => 
    t.dueDate && !isToday(t.dueDate) && !isTomorrow(t.dueDate) && isUpcoming(t.dueDate)
  );

  const remainingSessions = tasks.filter(t => !t.completed).length;
  const userName = user?.email?.split('@')[0] || 'there';

  const renderTaskItem = (task: Task, opacity: string = '') => (
    <div 
      key={task.id}
      className={`flex items-center group gap-6 py-2 ${opacity}`}
    >
      <div className="flex-shrink-0">
        <button
          onClick={() => toggleComplete(task.id)}
          className={`size-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
            task.completed 
              ? 'bg-primary border-primary' 
              : task.priority === 'high' 
                ? 'border-primary/60' 
                : 'border-primary/40'
          }`}
        >
          {task.completed && (
            <span className="material-symbols-outlined text-white text-base">check</span>
          )}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {task.priority === 'high' && (
            <span className="material-symbols-outlined text-amber-500 text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              fiber_manual_record
            </span>
          )}
          <p className={`text-lg font-medium truncate group-active:opacity-70 ${
            task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
          }`}>
            {task.title}
          </p>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
        )}
      </div>
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => deleteTask(task.id)}
          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-muted-foreground hover:text-destructive text-xl">delete</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
      {/* Header Section */}
      <header className="flex flex-col px-6 pt-12 pb-6 gap-2 sticky top-0 z-20 bg-background/80 backdrop-blur-md">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Inbox</h1>
          <div className="flex gap-4">
            <button className="p-2 rounded-full hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-2xl">search</span>
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="size-10 rounded-full overflow-hidden border-2 border-primary/20 bg-card flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-muted-foreground">person</span>
            </button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm font-medium tracking-wide">
          {remainingSessions} deep work sessions remaining
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32">
        {/* Tabs */}
        <nav className="flex gap-8 border-b border-border mb-8 sticky top-0 bg-background z-10 py-2">
          <button 
            onClick={() => setActiveTab('today')}
            className={`relative pb-3 text-sm font-bold tracking-widest uppercase transition-colors ${
              activeTab === 'today' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Today
            {activeTab === 'today' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`pb-3 text-sm font-bold tracking-widest uppercase transition-colors ${
              activeTab === 'upcoming' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Upcoming
            {activeTab === 'upcoming' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>
            )}
          </button>
        </nav>

        {activeTab === 'today' ? (
          <section className="space-y-8 mb-12">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
              Today <span className="h-px flex-1 bg-border"></span>
            </h2>
            {todayTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No tasks for today</p>
            ) : (
              todayTasks.map(task => renderTaskItem(task))
            )}
          </section>
        ) : (
          <>
            {tomorrowTasks.length > 0 && (
              <section className="space-y-4 mb-8">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                  Tomorrow <span className="h-px flex-1 bg-border"></span>
                </h2>
                <div className="space-y-2">
                  {tomorrowTasks.map(task => renderTaskItem(task, 'opacity-60'))}
                </div>
              </section>
            )}
            {laterTasks.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                  Later <span className="h-px flex-1 bg-border"></span>
                </h2>
                <div className="space-y-2">
                  {laterTasks.map(task => renderTaskItem(task, 'opacity-60'))}
                </div>
              </section>
            )}
            {tomorrowTasks.length === 0 && laterTasks.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No upcoming tasks</p>
            )}
          </>
        )}
      </main>



      {/* Visual Background Accents */}
      <div className="absolute -top-24 -right-24 size-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-48 -left-24 size-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Quick Add Modal */}
      <QuickAddTaskModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onAddTask={handleAddTask}
      />
    </div>
  );
}
