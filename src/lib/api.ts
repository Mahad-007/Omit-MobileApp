import { supabase } from './supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BlockedApp, FocusSession, Task, Settings } from './storage';

// --- Types (aligned with DB schema) ---

export interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  created_at: string;
}

// --- API Service ---

/**
 * Supabase API Service
 * Replaces LocalStorageService with authenticated DB calls.
 * Adheres to Supabase & Vercel best practices (RLS, atomic updates).
 */
export const api = {
  // Tasks
  getTasks: async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map((task: any) => ({
      ...task,
      dueDate: task.due_date,
      createdAt: task.created_at,
    })) as Task[];
  },

  createTask: async (task: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const dbTask = {
      title: task.title,
      description: task.description,
      due_date: task.dueDate,
      priority: task.priority,
      user_id: user.id
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(dbTask)
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      dueDate: data.due_date,
      createdAt: data.created_at,
    } as Task;
  },

  updateTask: async (taskId: string, updates: Partial<Task>) => {
    const dbUpdates: any = { ...updates };
    
    if (updates.dueDate !== undefined) {
      dbUpdates.due_date = updates.dueDate;
      delete dbUpdates.dueDate;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      dueDate: data.due_date,
      createdAt: data.created_at,
    };
  },

  deleteTask: async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  },

  // Blocked Apps
  getBlockedApps: async () => {
    const { data, error } = await supabase
      .from('blocked_apps')
      .select('*');

    if (error) throw error;
    
    // Map snake_case to camelCase
    return (data || []).map((app: any) => ({
      ...app,
      isEnabled: app.blocked ?? app.is_enabled ?? false, // Prefer blocked, fallback to is_enabled just in case
      blockMode: app.block_mode ?? app.blockMode ?? 'focus',
    })) as BlockedApp[];
  },

  toggleBlockedApp: async (id: string, isEnabled: boolean) => {
    // Note: Schema uses 'is_enabled' column
    const { data, error } = await supabase
      .from('blocked_apps')
      .update({ is_enabled: isEnabled }) 
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  createBlockedApp: async (app: Omit<BlockedApp, 'id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Map camelCase to snake_case for DB
    const dbApp = {
      name: app.name,
      url: app.url, 
      is_enabled: app.isEnabled !== undefined ? app.isEnabled : app.blocked, // Fallback to blocked if isEnabled missing
      block_mode: app.blockMode,
      icon: app.icon,
      user_id: user.id
    };

    const { data, error } = await supabase
      .from('blocked_apps')
      .insert(dbApp)
      .select()
      .single();

    if (error) throw error;
    
    // Map response back
    const result = data as any;
    return {
      ...result,
      isEnabled: result.blocked ?? result.is_enabled ?? false,
      blockMode: result.block_mode ?? result.blockMode ?? 'focus',
    } as BlockedApp;
  },

  // Focus Sessions
  addFocusSession: async (session: Omit<FocusSession, 'id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({ ...session, user_id: user.id } as any)
      .select()
      .single();

    if (error) throw error;
    return data as FocusSession;
  },

  getStats: async () => {
     const { data, error } = await supabase
      .from('focus_sessions')
      .select('*'); // Aggregate logic usually server-side or computed on client
    
     if(error) throw error;
     return (data || []) as FocusSession[];
  }
};

// --- React Query Hooks ---

export function useTasks() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tasks'],
    queryFn: api.getTasks,
  });

  const createTask = useMutation({
    mutationFn: api.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<Task> }) => 
      api.updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return { ...query, createTask, updateTask, deleteTask };
}

export function useBlockedApps() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['blockedApps'],
    queryFn: api.getBlockedApps,
  });

  const toggle = useMutation({
    mutationFn: ({ id, blocked }: { id: string, blocked: boolean }) => api.toggleBlockedApp(id, blocked),
    onSuccess: () => {
      // Optimistic update or invalidation
      queryClient.invalidateQueries({ queryKey: ['blockedApps'] });
    }
  });

  return { ...query, toggle };
}
