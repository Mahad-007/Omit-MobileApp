import { useState } from "react";
import { toast } from "sonner";
import { Task } from "@/lib/storage";
import { useTasks } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import QuickAddTaskModal from "@/components/QuickAddTaskModal";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Check, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  Plus, 
  User, 
  CalendarCheck 
} from "lucide-react";

export default function Tasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tasks = [], isLoading, createTask, updateTask, deleteTask } = useTasks();
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  const [showAddModal, setShowAddModal] = useState(false);

  // Task Handlers using React Query Mutations
  const handleToggleComplete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id, updates: { completed: !task.completed } });
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const handleAddTask = async (newTask: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    try {
      await createTask.mutateAsync(newTask);
      toast.success("Task added");
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  // Date Logic Helpers
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

  const isOverdue = (dateStr: string) => {
    if (!dateStr) return false;
    const now = new Date();
    const date = new Date(dateStr);
    return date.getTime() < now.getTime();
  };

  // Filter Tasks
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && isOverdue(t.dueDate) && !isToday(t.dueDate));
  const todayTasks = tasks.filter(t => isToday(t.dueDate) || !t.dueDate);
  const tomorrowTasks = tasks.filter(t => isTomorrow(t.dueDate));
  const laterTasks = tasks.filter(t => 
    t.dueDate && !isToday(t.dueDate) && !isTomorrow(t.dueDate) && isUpcoming(t.dueDate) && !overdueTasks.includes(t)
  );

  const remainingSessions = tasks.filter(t => !t.completed).length;
  const completedToday = todayTasks.filter(t => t.completed).length;

  const renderTaskItem = (task: Task, index: number) => (
    <div 
      key={task.id}
      className="flex items-center group gap-4 py-4 px-4 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-sm transition-all hover:bg-card/80 animate-fade-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <button
        onClick={() => handleToggleComplete(task.id)}
        className={`flex-shrink-0 size-6 rounded-lg border-2 transition-all flex items-center justify-center ${
          task.completed 
            ? 'bg-primary border-primary' 
            : task.priority === 'high' 
              ? 'border-highlight/60 hover:border-highlight' 
              : 'border-border hover:border-primary/50'
        }`}
      >
        {task.completed && (
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
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
        <div className="flex items-center gap-2 mt-1">
          {task.dueDate && task.dueDate.includes('T') && (
            <div className="flex items-center gap-1 text-[10px] text-primary/70 font-bold uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              <span>{new Date(task.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
            </div>
          )}
          {!task.completed && task.dueDate && isOverdue(task.dueDate) && !isToday(task.dueDate) && (
            <span className="text-[9px] font-black bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-md uppercase tracking-wider">Overdue</span>
          )}
        </div>
      </div>
      
      <button
        onClick={() => handleDeleteTask(task.id)}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-xl transition-all"
      >
        <Trash2 className="w-5 h-5 text-muted-foreground hover:text-destructive" />
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
            <CheckCircle2 className="w-7 h-7 text-muted-foreground" />
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
      {/* Skeleton Loading State */}
      {isLoading ? (
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-20 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      ) : (
        <>
        {/* Atmospheric backgrounds */}
        <div className="absolute -top-32 -right-32 size-80 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-32 -left-32 size-64 bg-highlight/5 rounded-full blur-3xl pointer-events-none" />
  
        {/* Header */}
        <header className="flex flex-col px-6 pt-14 pb-4 gap-4 sticky top-0 z-20 bg-background border-b border-border/30">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Inbox</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {remainingSessions} tasks remaining
                {completedToday > 0 && <span className="text-primary"> · {completedToday} done today</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowAddModal(true)}
                className="size-11 rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-all hover-lift active:scale-95"
                aria-label="Add Task"
              >
                <Plus className="w-6 h-6 text-primary" />
              </button>
              <button 
                onClick={() => navigate('/settings')}
                className="size-11 rounded-2xl overflow-hidden border border-border/50 bg-card/80 flex items-center justify-center hover:bg-accent transition-colors"
                aria-label="Profile"
              >
                <User className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>
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
            <>
              {overdueTasks.length > 0 && renderSection('Overdue', overdueTasks, '')}
              {renderSection('Today', todayTasks, 'No tasks for today. Enjoy your free time!')}
            </>
          ) : (
            <>
              {tomorrowTasks.length > 0 && renderSection('Tomorrow', tomorrowTasks, '')}
              {laterTasks.length > 0 && renderSection('Later', laterTasks, '')}
              {tomorrowTasks.length === 0 && laterTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <CalendarCheck className="w-8 h-8 text-primary" />
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
        </>
      )}
    </div>
  );
}
