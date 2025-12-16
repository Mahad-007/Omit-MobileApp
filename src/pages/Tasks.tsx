import { DashboardCard } from "@/components/DashboardCard";
import { CheckSquare, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { storage, Task } from "@/lib/storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    notes: "",
    datetime: "",
  });

  useEffect(() => {
    setTasks(storage.getTasks());
    // Force sync to ensure extension has latest data even if no changes made yet
    storage.forceSync();
  }, []);

  const handleSubmit = () => {
    if (!formData.title) {
      toast.error("Please fill in the title");
      return;
    }

    if (editingTask) {
      const updatedTask = { ...editingTask, ...formData };
      storage.saveTask(updatedTask);
      toast.success("Task updated successfully");
    } else {
      const newTask = {
        id: Date.now().toString(), // Helper in storage handles this if omitted, but for now we do it here or let storage handle it. logic in storage.ts expects full task for update or new task.
        ...formData,
        completed: false,
      };
      // actually saveTask handles ID generation if we want, but let's stick to what we defined
      storage.saveTask(newTask as Task); 
      toast.success("Task added successfully");
    }
    
    // Refresh tasks
    setTasks(storage.getTasks());

    setFormData({ title: "", notes: "", datetime: "" });
    setEditingTask(null);
    setIsOpen(false);
  };

  const toggleComplete = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      storage.saveTask(task);
      setTasks(storage.getTasks());
    }
  };

  const deleteTask = (id: string) => {
    storage.deleteTask(id);
    setTasks(storage.getTasks());
    toast.success("Task deleted");
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      notes: task.notes,
      datetime: task.datetime,
    });
    setIsOpen(true);
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Task Reminders</h2>
          <p className="text-muted-foreground">
            {completedCount} of {tasks.length} tasks completed
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Date & Time</label>
                <Input
                  type="datetime-local"
                  value={formData.datetime}
                  onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingTask ? "Update Task" : "Add Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DashboardCard title="Your Tasks" icon={CheckSquare}>
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tasks yet. Add your first task to get started!</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-all ${
                  task.completed ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleComplete(task.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4
                      className={`font-medium text-foreground ${
                        task.completed ? "line-through" : ""
                      }`}
                    >
                      {task.title}
                    </h4>
                    {task.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
                    )}
                    {task.datetime && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(task.datetime).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(task)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
