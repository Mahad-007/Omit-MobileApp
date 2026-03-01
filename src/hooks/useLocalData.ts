import { useState, useEffect } from 'react';
import { storage, Task, BlockedApp } from '@/lib/storage';

/**
 * Local-storage-based task hook.
 * Works for guests (local only) and authenticated users (syncs to Supabase via storage.ts).
 * Mirrors the shape of useTasks() from api.ts so components can swap without other changes.
 */
export function useLocalTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => storage.getTasks());

  useEffect(() => {
    return storage.onChange('tasks', () => setTasks(storage.getTasks()));
  }, []);

  const createTask = {
    mutateAsync: async (task: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
      return storage.saveTask({
        ...task,
        id: crypto.randomUUID(),
        completed: false,
        createdAt: new Date().toISOString(),
      });
    },
  };

  const updateTask = {
    mutateAsync: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const current = storage.getTasks().find(t => t.id === id);
      if (!current) throw new Error('Task not found');
      return storage.saveTask({ ...current, ...updates });
    },
  };

  const deleteTask = {
    mutateAsync: async (id: string) => {
      storage.deleteTask(id);
    },
  };

  return { data: tasks, isLoading: false, isError: false, createTask, updateTask, deleteTask };
}

/**
 * Local-storage-based blocked apps hook.
 * Works for guests (local only) and authenticated users (syncs to Supabase via storage.ts).
 * Mirrors the shape of useBlockedApps() from api.ts.
 */
export function useLocalBlockedApps() {
  const [apps, setApps] = useState<BlockedApp[]>(() => storage.getBlockedApps());

  useEffect(() => {
    return storage.onChange('blockedApps', () => setApps(storage.getBlockedApps()));
  }, []);

  const toggle = {
    mutateAsync: async ({ id }: { id: string; blocked: boolean }) => {
      storage.toggleAppBlock(id);
    },
  };

  return { data: apps, isLoading: false, isError: false, toggle };
}
