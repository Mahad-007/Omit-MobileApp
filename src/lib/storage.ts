// Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  notes?: string; // legacy
  dueDate?: string;
  datetime?: string; // legacy
  priority?: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt?: string;
}

export interface BlockedApp {
  id: string;
  name: string;
  url: string;
  blocked?: boolean; // legacy
  isEnabled?: boolean; // new
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
  dailyTimeLimitEnabled: boolean;
  dailyTimeLimitMinutes: number;
}

const STORAGE_KEYS = {
  TASKS: 'focussphere_tasks',
  BLOCKED_APPS: 'focussphere_blocked_apps',
  FOCUS_SESSIONS: 'focussphere_focus_sessions',
  DAILY_STATS: 'focussphere_daily_stats',
  SETTINGS: 'focussphere_settings',
  DAILY_APP_USAGE: 'focussphere_daily_app_usage',
};

// Event system for real-time updates
type DataChangeListener = () => void;
type DataChangeType = 'tasks' | 'blockedApps' | 'focusSessions' | 'stats' | 'settings' | 'all';

class LocalStorageService {
  private listeners: Map<DataChangeType, Set<DataChangeListener>> = new Map();

  constructor() {
    // Initialize listener sets for each type
    const types: DataChangeType[] = ['tasks', 'blockedApps', 'focusSessions', 'stats', 'settings', 'all'];
    types.forEach(type => this.listeners.set(type, new Set()));
  }

  // Subscribe to data changes
  onChange(type: DataChangeType, listener: DataChangeListener): () => void {
    this.listeners.get(type)?.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  // Backward compatible method
  onStatsChange(listener: DataChangeListener): () => void {
    return this.onChange('stats', listener);
  }

  // Notify listeners of data changes
  private notifyChange(type: DataChangeType) {
    this.listeners.get(type)?.forEach(listener => listener());
    this.listeners.get('all')?.forEach(listener => listener());
  }

  // Notify all listeners of stats changes (keeping for backward compatibility)
  private notifyStatsChange() {
    this.notifyChange('stats');
  }
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
            type: 'OMIT_SYNC',
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
      defaultFocusDuration: 60,
      dailyTimeLimitEnabled: false,
      dailyTimeLimitMinutes: 60
    };
  }

  saveSettings(settings: Settings): Settings {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this._updateExtensionSync();
    this.notifyChange('settings');
    return settings;
  }

  // --- DAILY APP USAGE ---
  private getLocalDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getDailyAppUsage(): number {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_APP_USAGE);
    if (!data) return 0;
    
    try {
      const usage = JSON.parse(data);
      const today = this.getLocalDateString();
      
      // Reset if it's a new day
      if (usage.date !== today) {
        return 0;
      }
      return usage.minutes || 0;
    } catch {
      return 0;
    }
  }

  addAppUsageTime(minutes: number): void {
    if (minutes <= 0) return;
    
    const today = this.getLocalDateString();
    const currentUsage = this.getDailyAppUsage();
    
    const usage = {
      date: today,
      minutes: currentUsage + minutes
    };
    
    localStorage.setItem(STORAGE_KEYS.DAILY_APP_USAGE, JSON.stringify(usage));
    this.notifyChange('stats');
  }

  isTimeLimitExceeded(): boolean {
    const settings = this.getSettings();
    if (!settings.dailyTimeLimitEnabled) return false;
    
    const usage = this.getDailyAppUsage();
    return usage >= settings.dailyTimeLimitMinutes;
  }

  getRemainingTime(): number {
    const settings = this.getSettings();
    if (!settings.dailyTimeLimitEnabled) return Infinity;
    
    const usage = this.getDailyAppUsage();
    return Math.max(0, settings.dailyTimeLimitMinutes - usage);
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
    this.notifyChange('tasks');
    return task;
  }

  deleteTask(id: string): void {
    const tasks = this.getTasks().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this._updateExtensionSync();
    this.notifyChange('tasks');
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
    this.notifyChange('blockedApps');
    return savedApp;
  }

  deleteBlockedApp(id: string): void {
    const apps = this.getBlockedApps().filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
    this._updateExtensionSync();
    this.notifyChange('blockedApps');
  }

  toggleAppBlock(id: string): BlockedApp | null {
    const apps = this.getBlockedApps();
    const app = apps.find((a) => a.id === id);
    if (app) {
      app.blocked = !app.blocked;
      localStorage.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
      this._updateExtensionSync();
      this.notifyChange('blockedApps');
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
      this.notifyChange('blockedApps');
      return app;
    }
    return null;
  }

  // --- PERSISTENT BLOCKING HELPERS ---
  
  // Get all apps that should be blocked based on session state
  getEffectiveBlockedApps(sessionActive: boolean): BlockedApp[] {
      const allApps = this.getBlockedApps();
      return allApps.filter(app => {
          // Always block if mode is 'always'
          // Note: we check isEnabled as well for safety, but UI should likely enforce isEnabled=true if blockMode=always
          // For now, let's assume 'always' implies it CAN be blocked, but we still respect the main toggle?
          // Actually, usually "Always Block" overrides the main toggle, OR the main toggle enables the feature and 'always'/ 'focus' selects the mode.
          // Looking at SocialBlocker.tsx, `app.isEnabled` seems to be the main "on/off" switch.
          // So we should probably check isEnabled first.
          if (!app.isEnabled) return false;

          if (app.blockMode === 'always') return true;
          
          // If session is active, block if enabled
          if (sessionActive) return true;
          
          return false;
      });
  }

  // Check if there are any apps that are set to always block
  hasPersistentApps(): boolean {
      const allApps = this.getBlockedApps();
      return allApps.some(app => app.isEnabled && app.blockMode === 'always');
  }


  // --- NATIVE ANDROID APPS ---
  
  getAndroidSessionApps(): string[] {
      const data = localStorage.getItem('android_blocked_apps'); // Legacy key
      return data ? JSON.parse(data) : [];
  }

  getAndroidPersistentApps(): string[] {
      const data = localStorage.getItem('android_persistent_apps'); // New key
      return data ? JSON.parse(data) : [];
  }

  saveAndroidSessionApps(packageNames: string[]): void {
      localStorage.setItem('android_blocked_apps', JSON.stringify(packageNames));
      this._updateExtensionSync();
      this.notifyChange('blockedApps'); // Reuse this event or add 'androidApps'
  }

  saveAndroidPersistentApps(packageNames: string[]): void {
      localStorage.setItem('android_persistent_apps', JSON.stringify(packageNames));
      this._updateExtensionSync();
      this.notifyChange('blockedApps');
  }

  toggleAndroidApp(packageName: string, mode: 'session' | 'persistent' | 'off'): void {
      const sessionApps = this.getAndroidSessionApps();
      const persistentApps = this.getAndroidPersistentApps();
      
      // Remove from both first
      const uniqueSession = sessionApps.filter(p => p !== packageName);
      const uniquePersistent = persistentApps.filter(p => p !== packageName);
      
      if (mode === 'session') {
          uniqueSession.push(packageName);
      } else if (mode === 'persistent') {
          uniquePersistent.push(packageName);
      }
      
      this.saveAndroidSessionApps(uniqueSession);
      this.saveAndroidPersistentApps(uniquePersistent);
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
    const today = this.getLocalDateString();
    
    let stats = allStats.find(s => s.date === today);
    if (!stats) {
      stats = { date: today, savedHours: 0, wastedHours: 0 };
      allStats.push(stats);
      localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(allStats));
    } else if (stats.savedHours === 0 && stats.wastedHours > 0 && stats.wastedHours < 0.5) {
      // Fix old random wasted data (was initialized with Math.random() * 0.5)
      stats.wastedHours = 0;
      localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(allStats));
    }
    return stats;
  }
  
  // Get stats for a specific date
  getStatsForDate(dateStr: string): DailyStats {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];
    
    const stats = allStats.find(s => s.date === dateStr);
    return stats || { date: dateStr, savedHours: 0, wastedHours: 0 };
  }
  
  // Get all stats for a month
  getMonthStats(year: number, month: number): DailyStats[] {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];
    
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    return allStats.filter(s => s.date.startsWith(monthStr));
  }
  
  // Get tasks completed on a specific date
  getTasksCompletedOnDate(dateStr: string): number {
    const tasks = this.getTasks();
    return tasks.filter(t => {
      if (!t.completed) return false;
      if (t.createdAt) {
        return t.createdAt.split('T')[0] === dateStr;
      }
      return false;
    }).length;
  }

  updateDailyStats(savedAdd: number, wastedAdd: number) {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];
    const today = this.getLocalDateString();
    
    const index = allStats.findIndex(s => s.date === today);
    if (index >= 0) {
      allStats[index].savedHours += savedAdd;
      allStats[index].wastedHours += wastedAdd;
    } else {
      allStats.push({
        date: today,
        savedHours: savedAdd,
        wastedHours: wastedAdd
      });
    }
    localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(allStats));
    this.notifyStatsChange(); // Notify listeners for real-time updates
  }
  
  // Real-time accumulation from Extension
  addSavedTime(hours: number) {
      if (hours <= 0) return;
      this.updateDailyStats(hours, 0);
  }
  
  // Real-time wasted time accumulation from Extension
  addWastedTime(hours: number) {
      if (hours <= 0) return;
      this.updateDailyStats(0, hours);
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

  // Reset today's stats to zero
  resetTodayStats() {
      const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
      const allStats: DailyStats[] = data ? JSON.parse(data) : [];
      const today = this.getLocalDateString();

      const index = allStats.findIndex(s => s.date === today);
      if (index >= 0) {
          allStats[index] = { date: today, savedHours: 0, wastedHours: 0 };
      } else {
          allStats.push({ date: today, savedHours: 0, wastedHours: 0 });
      }
  }

  // --- BULK TASKS SAVE ---
  saveTasks(tasks: Task[]): void {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this._updateExtensionSync();
    this.notifyChange('tasks');
  }

  // --- BULK BLOCKED APPS SAVE ---
  saveBlockedApps(apps: BlockedApp[]): void {
    localStorage.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
    this._updateExtensionSync();
    this.notifyChange('blockedApps');
  }

  // --- WEEKLY STATISTICS ---
  
  // Get the start of the week (Monday)
  private getWeekStart(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  
  // Get all stats for this week (Mon-Sun)
  getWeeklyStats(): DailyStats[] {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];
    
    const weekStart = this.getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Generate all 7 days of the week
    const weeklyStats: DailyStats[] = [];
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const existingStat = allStats.find(s => s.date === dateStr);
      weeklyStats.push(existingStat || { date: dateStr, savedHours: 0, wastedHours: 0 });
    }
    
    return weeklyStats;
  }
  
  // Get total focus hours for this week
  getWeeklyFocusHours(): number {
    const weeklyStats = this.getWeeklyStats();
    return weeklyStats.reduce((sum, s) => sum + s.savedHours, 0);
  }
  
  // Get total focus hours for last week
  getPreviousWeekFocusHours(): number {
    const data = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];
    
    const thisWeekStart = this.getWeekStart();
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(lastWeekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const stat = allStats.find(s => s.date === dateStr);
      if (stat) {
        total += stat.savedHours;
      }
    }
    
    return total;
  }
  
  // Get the best productive day this week
  getBestProductiveDay(): { day: string; hours: number } | null {
    const weeklyStats = this.getWeeklyStats();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    let bestIndex = -1;
    let bestHours = 0;
    
    weeklyStats.forEach((stat, index) => {
      if (stat.savedHours > bestHours) {
        bestHours = stat.savedHours;
        bestIndex = index;
      }
    });
    
    if (bestIndex === -1 || bestHours === 0) return null;
    
    return { day: days[bestIndex], hours: bestHours };
  }
  
  // Get tasks completed this week
  getWeeklyTasksCompleted(): number {
    const tasks = this.getTasks();
    const weekStart = this.getWeekStart();
    
    return tasks.filter(t => {
      if (!t.completed) return false;
      // Check if task has createdAt within this week (as proxy for completion time)
      if (t.createdAt) {
        const taskDate = new Date(t.createdAt);
        return taskDate >= weekStart;
      }
      return true; // Count all completed tasks if no date
    }).length;
  }
  
  // Get tasks completed last week
  getPreviousWeekTasksCompleted(): number {
    const tasks = this.getTasks();
    const thisWeekStart = this.getWeekStart();
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    return tasks.filter(t => {
      if (!t.completed) return false;
      if (t.createdAt) {
        const taskDate = new Date(t.createdAt);
        return taskDate >= lastWeekStart && taskDate < thisWeekStart;
      }
      return false;
    }).length;
  }
  
  // Calculate percentage change between two values
  calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  // --- SAVED TIME (from completed focus sessions) ---
  getSavedTime(): number {
    const stats = this.getTodayStats();
    return stats.savedHours;
  }

  // --- WASTED TIME ---
  getWastedTime(): number {
    const stats = this.getTodayStats();
    return stats.wastedHours;
  }

  // --- ACTIVE FOCUS SESSION ---
  startFocusSession(durationMinutes: number): void {
    const endTime = Date.now() + (durationMinutes * 60 * 1000);
    const session = {
      startTime: Date.now(),
      endTime,
      duration: durationMinutes
    };
    localStorage.setItem('focussphere_current_session', JSON.stringify(session));
    this._updateExtensionSync();
  }

  endFocusSession(): void {
    const sessionData = localStorage.getItem('focussphere_current_session');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        const elapsedMs = Date.now() - session.startTime;
        const elapsedHours = elapsedMs / (1000 * 60 * 60);
        
        // Add to saved time
        this.addSavedTime(elapsedHours);
        
        // Record the session
        this.addFocusSession({
          startTime: new Date(session.startTime).toISOString(),
          durationMinutes: Math.round(elapsedMs / 60000),
          completed: true,
          appsBlockedCount: this.getBlockedApps().filter(a => a.isEnabled || a.blocked).length
        });
      } catch (e) {
        console.error('Error ending focus session', e);
      }
    }
    localStorage.removeItem('focussphere_current_session');
    this._updateExtensionSync();
    this.notifyChange('focusSessions');
  }

  getActiveSession(): { startTime: number; endTime: number; duration: number } | null {
    const sessionData = localStorage.getItem('focussphere_current_session');
    if (!sessionData) return null;
    
    try {
      const session = JSON.parse(sessionData);
      if (session.endTime > Date.now()) {
        return session;
      }
      // Session expired, clean up
      localStorage.removeItem('focussphere_current_session');
      return null;
    } catch (e) {
      return null;
    }
  }
}

export const storage = new LocalStorageService();
