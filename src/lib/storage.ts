// Types
export interface Task {
  id: string;
  title: string;
  notes: string;
  datetime?: string;
  completed: boolean;
}

export interface BlockedApp {
  id: string;
  name: string;
  url: string;
  blocked: boolean;
  blockMode: "always" | "focus";
  icon?: string;
}

export interface FocusSession {
  id: string;
  startTime: string; // ISO string
  durationMinutes: number;
  completed: boolean;
  appsBlockedCount: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  savedHours: number;
  wastedHours: number;
}

export interface Settings {
  taskReminders: boolean;
  focusAlerts: boolean;
  strictMode: boolean;
  defaultFocusDuration: number;
}

const STORAGE_KEYS = {
  TASKS: 'focussphere_tasks',
  BLOCKED_APPS: 'focussphere_blocked_apps',
  FOCUS_SESSIONS: 'focussphere_focus_sessions',
  DAILY_STATS: 'focussphere_daily_stats',
  SETTINGS: 'focussphere_settings',
};

class LocalStorageService {
  // Helper to keep extension synced whenever data changes
  public forceSync() {
    try {
        const tasks = this.getTasks().filter(t => !t.completed); 
        const blockedApps = this.getBlockedApps();
        const settings = this.getSettings();
        
        // CHECK FOR ACTIVE SESSION
        let isFocusActive = false;
        try {
            const sessionData = localStorage.getItem('focussphere_current_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session.endTime > Date.now()) {
                    isFocusActive = true;
                }
            }
        } catch (e) {
            console.error("Error checking focus session", e);
        }

        const existingStr = localStorage.getItem('focussphere_sync');
        let syncData: any = {};
        if (existingStr) {
            syncData = JSON.parse(existingStr);
        }
        
        syncData.tasks = tasks;
        syncData.blockedApps = blockedApps;
        syncData.settings = settings;
        syncData.focusMode = isFocusActive; // Explicitly set focus mode based on session validity
        syncData.timestamp = Date.now();
        
        localStorage.setItem('focussphere_sync', JSON.stringify(syncData));
        
        // Notify extension immediately via window message
        window.postMessage({
            type: 'FOCUS_SPHERE_SYNC',
            payload: {
                action: 'updateSyncData', // Direct update
                syncData: syncData
            }
        }, '*');
    } catch (e) {
        console.error("Failed to update extension sync", e);
    }
  }

  private _updateExtensionSync() {
      this.forceSync();
  }

  // --- SETTINGS ---
  getSettings(): Settings {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : { 
      taskReminders: true, 
      focusAlerts: true,
      strictMode: false,
      defaultFocusDuration: 60
    };
  }

  saveSettings(settings: Settings): Settings {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this._updateExtensionSync();
    return settings;
  }

  // --- TASKS ---
  getTasks(): Task[] {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  }

  saveTask(task: Task): Task {
    const tasks = this.getTasks();
    const existingIndex = tasks.findIndex((t) => t.id === task.id);
    
    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks.push(task);
    }
    
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this._updateExtensionSync();
    return task;
  }

  deleteTask(id: string): void {
    const tasks = this.getTasks().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this._updateExtensionSync();
  }

  // --- BLOCKED APPS ---
  getBlockedApps(): BlockedApp[] {
    const data = localStorage.getItem(STORAGE_KEYS.BLOCKED_APPS);
    if (!data) return [];
    
    try {
        const rawApps: any[] = JSON.parse(data);
        if (!Array.isArray(rawApps)) return [];
        
        // Deduplicate and Sanitize
        const uniqueApps = new Map<string, BlockedApp>();
        
        rawApps.forEach(app => {
            if (!app.id || !app.url) return;
            
            // Ensure boolean
            const blocked = app.blocked === true || app.blocked === "true";
            
            // Ensure valid mode
            const blockMode = (app.blockMode === "focus" || app.blockMode === "always") 
                ? app.blockMode 
                : "focus"; // Default to focus only for safety
            
            uniqueApps.set(app.id, {
                ...app,
                blocked,
                blockMode
            });
        });
        
        return Array.from(uniqueApps.values());
    } catch (e) {
        console.error("Error parsing blocked apps", e);
        return [];
    }
  }

  saveBlockedApp(app: Omit<BlockedApp, 'id'> | BlockedApp): BlockedApp {
    const apps = this.getBlockedApps();
    let savedApp: BlockedApp;

    if ('id' in app) {
      const index = apps.findIndex((a) => a.id === app.id);
      if (index >= 0) {
        apps[index] = app as BlockedApp;
        savedApp = app as BlockedApp;
      } else {
        savedApp = { ...app, id: crypto.randomUUID() } as BlockedApp; // Should not happen often if we pass ID
        apps.push(savedApp);
      }
    } else {
      savedApp = { ...app, id: crypto.randomUUID() };
      apps.push(savedApp);
    }

    localStorage.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
    this._updateExtensionSync();
    return savedApp;
  }

  deleteBlockedApp(id: string): void {
    const apps = this.getBlockedApps().filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
    this._updateExtensionSync();
  }

  toggleAppBlock(id: string): BlockedApp | null {
    const apps = this.getBlockedApps();
    const app = apps.find((a) => a.id === id);
    if (app) {
      app.blocked = !app.blocked;
      localStorage.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
      this._updateExtensionSync();
      return app;
    }
    return null;
  }
  
  toggleAppBlockMode(id: string): BlockedApp | null {
    const apps = this.getBlockedApps();
    const app = apps.find((a) => a.id === id);
    if (app) {
      app.blockMode = app.blockMode === 'always' ? 'focus' : 'always';
      localStorage.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
      this._updateExtensionSync();
      return app;
    }
    return null;
  }


  // --- FOCUS SESSIONS ---
  getFocusSessions(): FocusSession[] {
    const data = localStorage.getItem(STORAGE_KEYS.FOCUS_SESSIONS);
    return data ? JSON.parse(data) : [];
  }

  addFocusSession(session: Omit<FocusSession, 'id'>): FocusSession {
    const sessions = this.getFocusSessions();
    const newSession = { ...session, id: crypto.randomUUID() };
    sessions.push(newSession);
    localStorage.setItem(STORAGE_KEYS.FOCUS_SESSIONS, JSON.stringify(sessions));
    
    // Update daily stats
    this.updateDailyStats(newSession.durationMinutes / 60, 0); // Assuming session time is "saved"
    
    return newSession;
  }

  // --- STATS ---
  // Helper to get or initialize stats for today
  getTodayStats(): DailyStats {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];
    const today = new Date().toISOString().split('T')[0];
    
    let stats = allStats.find(s => s.date === today);
    if (!stats) {
      // Mock random "wasted" time for realism if it's a new day, or start at 0
      // The user wants dynamic data, but we don't track "wasted" reliably yet.
      // Let's start with 0 saved, and maybe a small random wasted amount for "baseline distractions"
      stats = { date: today, savedHours: 0, wastedHours: Math.random() * 0.5 }; 
      allStats.push(stats);
      localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(allStats));
    }
    return stats;
  }

  updateDailyStats(savedAdd: number, wastedAdd: number) {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];
    const today = new Date().toISOString().split('T')[0];
    
    const index = allStats.findIndex(s => s.date === today);
    if (index >= 0) {
      allStats[index].savedHours += savedAdd;
      allStats[index].wastedHours += wastedAdd;
    } else {
      allStats.push({ 
        date: today, 
        savedHours: savedAdd, 
        wastedHours: wastedAdd + (Math.random() * 0.5) 
      });
    }
    localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(allStats));
  }
  
  // Real-time accumulation from Extension
  addSavedTime(hours: number) {
      if (hours <= 0) return;
      this.updateDailyStats(hours, 0);
  }
  
  // For the chart
  getProductivityData() {
      // This matches the format expected by the Dashboard chart
      // We'll generate hourly data points based on the accumulated daily stats distributed?
      // Or just return the static structure but populated with real total if we want to be simple first.
      
      // Let's make it slightly smarter: distribute the 'saved' hours across the work day so far
      const todayStats = this.getTodayStats();
      const currentHour = new Date().getHours();
      
      const data = [];
      const startHour = 9; // 9 AM
      
      let accumulatedSaved = 0;
      let accumulatedWasted = 0;
      
      // Simple linear distribution for visualization purposes
      // real app would need hourly tracking
      const hoursPassed = Math.max(1, currentHour - startHour);
      const savedPerHour = todayStats.savedHours / hoursPassed;
      const wastedPerHour = todayStats.wastedHours / hoursPassed;

      for (let h = startHour; h <= 17; h++) { // 9 AM to 5 PM
        if (h <= currentHour) {
            accumulatedSaved += savedPerHour * (0.8 + Math.random() * 0.4); // Add some noise
            accumulatedWasted += wastedPerHour * (0.8 + Math.random() * 0.4);
        }
        
        // Cap at today's totals for the last entry displayed
        if (h === currentHour) {
            accumulatedSaved = todayStats.savedHours;
            accumulatedWasted = todayStats.wastedHours;
        }

        const hourLabel = h > 12 ? `${h - 12} PM` : (h === 12 ? '12 PM' : `${h} AM`);
        data.push({
            time: hourLabel,
            saved: Number(accumulatedSaved.toFixed(1)),
            wasted: Number(accumulatedWasted.toFixed(1))
        });
      }
      
      return data;
  }
  
  getTotalStats() {
      const today = this.getTodayStats();
      return {
          saved: today.savedHours,
          wasted: today.wastedHours,
          efficiency: today.savedHours + today.wastedHours > 0 
            ? Math.round((today.savedHours / (today.savedHours + today.wastedHours)) * 100) 
            : 0
      };
  }
}

export const storage = new LocalStorageService();
