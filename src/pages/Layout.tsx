import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import QuickAddTaskModal from "@/components/QuickAddTaskModal";
import { storage, Task } from "@/lib/storage";
import { toast } from "sonner";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddTask = (newTask: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    const tasks = storage.getTasks();
    const task: Task = {
      ...newTask,
      id: Date.now().toString(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    storage.saveTasks([...tasks, task]);
    toast.success("Task added");
  };

  // Check if we're on a page that should hide the nav (like timer)
  const hideNav = location.pathname === '/timer' || location.pathname === '/blocked';

  const navItems = [
    { path: '/', icon: 'grid_view', label: 'Focus' },
    { path: '/tasks', icon: 'checklist', label: 'Tasks' },
    { path: '/stats', icon: 'bar_chart', label: 'Stats' },
    { path: '/settings', icon: 'person', label: 'Profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-container bg-background min-h-screen">
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar - iOS Style */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-background/80 backdrop-blur-xl border-t border-border/30 px-8 py-4 flex justify-between items-center z-10">
          {navItems.slice(0, 2).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive(item.path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}

          {/* Center Add Button */}
          <div className="relative -top-8">
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex size-14 items-center justify-center rounded-full bg-card border border-border text-foreground zen-card-shadow hover:bg-card/80 transition-colors"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>

          {navItems.slice(2).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive(item.path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Bottom Safe Area Spacer */}
      {!hideNav && <div className="h-20"></div>}

      {/* Quick Add Modal */}
      <QuickAddTaskModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onAddTask={handleAddTask}
      />
    </div>
  );
}
