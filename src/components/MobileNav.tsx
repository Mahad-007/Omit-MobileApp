import { NavLink as RouterNavLink } from "react-router-dom";
import { LayoutDashboard, Shield, ListTodo, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { storage } from "@/lib/storage";

const navigation = [
  { name: "Focus", href: "/", icon: LayoutDashboard },
  { name: "Blocker", href: "/blocker", icon: Shield },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "More", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");

  const handleQuickAdd = () => {
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    
    storage.saveTask({
      id: Date.now().toString(),
      title: taskTitle.trim(),
      notes: "",
      datetime: "",
      completed: false,
    });
    
    toast.success("Task added!");
    setTaskTitle("");
    setIsQuickAddOpen(false);
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-premium safe-area-bottom">
        <div className="flex items-center justify-between px-8 py-3">
          {/* Left nav items */}
          {navigation.slice(0, 2).map((item) => (
            <RouterNavLink
              key={item.name}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px] relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "p-1.5 rounded-lg transition-all duration-300",
                    isActive && "bg-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                  )}>
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform duration-200",
                      isActive && "scale-110"
                    )} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter">{item.name}</span>
                </>
              )}
            </RouterNavLink>
          ))}
          
          {/* Center floating add button - Quick Add Task */}
          <div className="relative -top-6">
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-xl hover:scale-105 press-effect transition-all animate-subtle-pulse hover:animate-none"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          
          {/* Right nav items */}
          {navigation.slice(2, 4).map((item) => (
            <RouterNavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px] relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "p-1.5 rounded-lg transition-all duration-300",
                    isActive && "bg-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                  )}>
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform duration-200",
                      isActive && "scale-110"
                    )} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter">{item.name}</span>
                </>
              )}
            </RouterNavLink>
          ))}
        </div>
      </nav>

      {/* Quick Add Task Dialog */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Quick Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="What needs to be done?"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
              className="h-12 rounded-xl"
              autoFocus
            />
            <Button onClick={handleQuickAdd} className="w-full h-12 rounded-xl">
              Save Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
