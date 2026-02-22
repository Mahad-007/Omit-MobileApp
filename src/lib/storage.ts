import { Preferences } from "@capacitor/preferences";
import { api } from "./api";

// Types
export interface Task {
  id: string;
  title: string;
  description?: string;
  notes?: string; // legacy
  dueDate?: string;
  datetime?: string; // legacy
  priority?: "low" | "medium" | "high";
  completed: boolean;
  createdAt?: string;
  completedAt?: string;
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
  TASKS: "focussphere_tasks",
  BLOCKED_APPS: "focussphere_blocked_apps",
  FOCUS_SESSIONS: "focussphere_focus_sessions",
  DAILY_STATS: "focussphere_daily_stats",
  SETTINGS: "focussphere_settings",
  DAILY_APP_USAGE: "focussphere_daily_app_usage",
  ANDROID_BLOCKED_APPS: "android_blocked_apps",
  ANDROID_PERSISTENT_APPS: "android_persistent_apps",
  CURRENT_SESSION: "focussphere_current_session",
  EXTENSION_SYNC: "focussphere_sync",
};

// Event system for real-time updates
type DataChangeListener = () => void;
type DataChangeType =
  | "tasks"
  | "blockedApps"
  | "focusSessions"
  | "stats"
  | "settings"
  | "all";

class LocalStorageService {
  private listeners: Map<DataChangeType, Set<DataChangeListener>> = new Map();
  private cache: Map<string, string> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private userId: string | null = null;

  constructor() {
    // Initialize listener sets for each type
    const types: DataChangeType[] = [
      "tasks",
      "blockedApps",
      "focusSessions",
      "stats",
      "settings",
      "all",
    ];
    types.forEach((type) => this.listeners.set(type, new Set()));
  }

  // --- AUTH & SYNC ---
  setAuth(userId: string | null) {
    if (this.userId !== userId) {
      this.userId = userId;
      if (userId) {
        console.log("Storage: User authenticated, starting sync...");
        this.syncDown();
      }
    }
  }

  // Pull data from Server and merge/overwrite
  async syncDown() {
    if (!this.userId) return;
    try {
      // TASKS
      const serverTasks = await api.getTasks();
      // Bug Fix: Don't overwrite local tasks with empty list from server if we have local tasks,
      // unless server explicitly says so (which we can't fully know yet without sync tokens).
      // For now, safety check: if server has tasks, use them. If server is empty but we have local, KEEP local.
      if (serverTasks.length > 0) {
        this.saveTasks(serverTasks, false);
      } else if (this.getTasks().length === 0) {
        // If both are empty, that's fine.
        // If server is empty and local has data, we assume local is newer/offline work
        // and we should probably push UP instead (but that's a bigger sync rewrite).
        // For now, just don't delete local work.
      }

      // BLOCKED APPS
      const serverApps = await api.getBlockedApps();
      if (serverApps.length > 0) {
        this.saveBlockedApps(serverApps, false);
      }

      console.log("Storage: Sync down complete");
    } catch (e) {
      console.error("Storage: Sync down failed", e);
    }
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const keys = Object.values(STORAGE_KEYS);
      for (const key of keys) {
        try {
          const { value } = await Preferences.get({ key });
          if (value) {
            this.cache.set(key, value);
          } else {
            // Migration: Check localStorage
            const local = localStorage.getItem(key);
            if (local) {
              this.cache.set(key, local);
              await Preferences.set({ key, value: local });
            }
          }
        } catch (e) {
          console.error(`Failed to init key ${key}`, e);
        }
      }
      this.initialized = true;
      console.log("Storage initialized, migrated if needed.");
    })();
    return this.initPromise;
  }

  // Internal helper to get data (sync)
  private getItem(key: string): string | null {
    if (!this.initialized) {
      // Fallback allowed for initial render but discouraged
      return localStorage.getItem(key);
    }
    return this.cache.get(key) || null;
  }

  // Internal helper to set data (async persist, sync cache)
  private setItem(key: string, value: string): void {
    this.cache.set(key, value);
    // Persist asynchronously
    Preferences.set({ key, value }).catch((e) =>
      console.error(`Failed to persist ${key}`, e),
    );
    // Keep localStorage in sync for webview/extension safety (legacy)
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  private removeItem(key: string): void {
    this.cache.delete(key);
    Preferences.remove({ key }).catch((e) =>
      console.error(`Failed to remove ${key}`, e),
    );
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  // Subscribe to data changes
  onChange(type: DataChangeType, listener: DataChangeListener): () => void {
    this.listeners.get(type)?.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  // Backward compatible method
  onStatsChange(listener: DataChangeListener): () => void {
    return this.onChange("stats", listener);
  }

  // Notify listeners of data changes
  private notifyChange(type: DataChangeType) {
    this.listeners.get(type)?.forEach((listener) => listener());
    this.listeners.get("all")?.forEach((listener) => listener());
  }

  // Public wrapper for external components (e.g., AndroidAppBlocker)
  public notifyListeners(type: DataChangeType) {
    this.notifyChange(type);
  }

  // Notify all listeners of stats changes (keeping for backward compatibility)
  private notifyStatsChange() {
    this.notifyChange("stats");
  }
  // Helper to keep extension synced whenever data changes
  public forceSync() {
    try {
      const tasks = this.getTasks().filter((t) => !t.completed);
      const blockedApps = this.getBlockedApps();
      const settings = this.getSettings();

      // CHECK FOR ACTIVE SESSION
      let isFocusActive = false;
      try {
        const sessionData = this.getItem(STORAGE_KEYS.CURRENT_SESSION);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.endTime > Date.now()) {
            isFocusActive = true;
          }
        }
      } catch (e) {
        console.error("Error checking focus session", e);
      }

      const existingStr = this.getItem(STORAGE_KEYS.EXTENSION_SYNC);
      let syncData: any = {};
      if (existingStr) {
        syncData = JSON.parse(existingStr);
      }

      syncData.tasks = tasks;
      syncData.blockedApps = blockedApps;
      syncData.settings = settings;
      syncData.focusMode = isFocusActive; // Explicitly set focus mode based on session validity
      syncData.timestamp = Date.now();

      const syncStr = JSON.stringify(syncData);
      this.setItem(STORAGE_KEYS.EXTENSION_SYNC, syncStr);

      // Notify extension immediately via window message
      window.postMessage(
        {
          type: "OMIT_SYNC",
          payload: {
            action: "updateSyncData", // Direct update
            syncData: syncData,
          },
        },
        "*",
      );
    } catch (e) {
      console.error("Failed to update extension sync", e);
    }
  }

  private _updateExtensionSync() {
    this.forceSync();
  }

  // --- SETTINGS ---
  getSettings(): Settings {
    const data = this.getItem(STORAGE_KEYS.SETTINGS);
    return data
      ? JSON.parse(data)
      : {
          taskReminders: true,
          focusAlerts: true,
          strictMode: false,
          defaultFocusDuration: 60,
          dailyTimeLimitEnabled: false,
          dailyTimeLimitMinutes: 60,
        };
  }

  saveSettings(settings: Settings): Settings {
    this.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this._updateExtensionSync();
    this.notifyChange("settings");
    return settings;
  }

  // --- DAILY APP USAGE ---
  private getLocalDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  getDailyAppUsage(): number {
    const data = this.getItem(STORAGE_KEYS.DAILY_APP_USAGE);
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
      minutes: currentUsage + minutes,
    };

    this.setItem(STORAGE_KEYS.DAILY_APP_USAGE, JSON.stringify(usage));

    // Also update permanent daily stats for history (Wasted Time)
    this.updateDailyStats(0, minutes / 60);

    this.notifyChange("stats");
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
    const data = this.getItem(STORAGE_KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  }

  saveTask(task: Task, sync = true): Task {
    const tasks = this.getTasks();
    const existingIndex = tasks.findIndex((t) => t.id === task.id);

    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
      if (sync && this.userId)
        api.updateTask(task.id, task).catch(console.error);
    } else {
      tasks.push(task);
      // Bug 19 fix: Only send the fields that createTask expects
      if (sync && this.userId) {
        const {
          id: _id,
          completed: _c,
          createdAt: _ca,
          ...createPayload
        } = task;
        api.createTask(createPayload).catch(console.error);
      }
    }

    this.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this._updateExtensionSync();
    this.notifyChange("tasks");
    return task;
  }

  deleteTask(id: string, sync = true): void {
    const tasks = this.getTasks().filter((t) => t.id !== id);
    this.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this._updateExtensionSync();
    this.notifyChange("tasks");

    if (sync && this.userId) api.deleteTask(id).catch(console.error);
  }

  // --- BLOCKED APPS ---
  getBlockedApps(): BlockedApp[] {
    const data = this.getItem(STORAGE_KEYS.BLOCKED_APPS);
    if (!data) return [];

    try {
      const rawApps: any[] = JSON.parse(data);
      if (!Array.isArray(rawApps)) return [];

      // Deduplicate and Sanitize
      const uniqueApps = new Map<string, BlockedApp>();

      rawApps.forEach((app) => {
        if (!app.id || !app.url) return;

        // Ensure boolean
        const blocked = app.blocked === true || app.blocked === "true";

        // Ensure valid mode
        const blockMode =
          app.blockMode === "focus" || app.blockMode === "always"
            ? app.blockMode
            : "focus"; // Default to focus only for safety

        uniqueApps.set(app.id, {
          ...app,
          blocked,
          blockMode,
        });
      });

      return Array.from(uniqueApps.values());
    } catch (e) {
      console.error("Error parsing blocked apps", e);
      return [];
    }
  }

  saveBlockedApp(
    app: Omit<BlockedApp, "id"> | BlockedApp,
    sync = true,
  ): BlockedApp {
    const apps = this.getBlockedApps();
    let savedApp: BlockedApp;

    if ("id" in app) {
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

    this.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
    this._updateExtensionSync();
    this.notifyChange("blockedApps");

    if (sync && this.userId) {
      api.createBlockedApp(savedApp).catch(console.error);
    }

    return savedApp;
  }

  deleteBlockedApp(id: string, sync = true): void {
    const apps = this.getBlockedApps().filter((a) => a.id !== id);
    this.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
    this._updateExtensionSync();
    this.notifyChange("blockedApps");

    // Bug 18 fix: Sync deletion to server
    if (sync && this.userId) {
      api.deleteBlockedApp(id).catch(console.error);
    }
  }

  toggleAppBlock(id: string): BlockedApp | null {
    const apps = this.getBlockedApps();
    const appIndex = apps.findIndex((a) => a.id === id);
    if (appIndex >= 0) {
      // Bug 12 fix: Create a new object instead of mutating in-place
      const updatedApp = {
        ...apps[appIndex],
        blocked: !apps[appIndex].blocked,
      };
      updatedApp.isEnabled = updatedApp.blocked;
      apps[appIndex] = updatedApp;
      this.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
      this._updateExtensionSync();
      this.notifyChange("blockedApps");

      if (this.userId && updatedApp.isEnabled !== undefined) {
        api.toggleBlockedApp(id, updatedApp.isEnabled).catch(console.error);
      }
      return updatedApp;
    }
    return null;
  }

  toggleAppBlockMode(id: string): BlockedApp | null {
    const apps = this.getBlockedApps();
    const app = apps.find((a) => a.id === id);
    if (app) {
      app.blockMode = app.blockMode === "always" ? "focus" : "always";
      this.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
      this._updateExtensionSync();
      this.notifyChange("blockedApps");
      return app;
    }
    return null;
  }

  // --- PERSISTENT BLOCKING HELPERS ---

  // Get all apps that should be blocked based on session state
  getEffectiveBlockedApps(sessionActive: boolean): BlockedApp[] {
    const allApps = this.getBlockedApps();
    return allApps.filter((app) => {
      // Always block if mode is 'always'
      if (!app.isEnabled) return false;

      if (app.blockMode === "always") return true;

      // If session is active, block if enabled
      if (sessionActive) return true;

      return false;
    });
  }

  // Check if there are any apps that are set to always block
  hasPersistentApps(): boolean {
    const allApps = this.getBlockedApps();
    return allApps.some((app) => app.isEnabled && app.blockMode === "always");
  }

  // --- NATIVE ANDROID APPS ---

  getAndroidSessionApps(): string[] {
    const data = this.getItem(STORAGE_KEYS.ANDROID_BLOCKED_APPS);
    return data ? JSON.parse(data) : [];
  }

  getAndroidPersistentApps(): string[] {
    const data = this.getItem(STORAGE_KEYS.ANDROID_PERSISTENT_APPS);
    return data ? JSON.parse(data) : [];
  }

  saveAndroidSessionApps(packageNames: string[]): void {
    this.setItem(
      STORAGE_KEYS.ANDROID_BLOCKED_APPS,
      JSON.stringify(packageNames),
    );
    this._updateExtensionSync();
    this.notifyChange("blockedApps"); // Reuse this event or add 'androidApps'
  }

  saveAndroidPersistentApps(packageNames: string[]): void {
    this.setItem(
      STORAGE_KEYS.ANDROID_PERSISTENT_APPS,
      JSON.stringify(packageNames),
    );
    this._updateExtensionSync();
    this.notifyChange("blockedApps");
  }

  toggleAndroidApp(
    packageName: string,
    mode: "session" | "persistent" | "off",
  ): void {
    const sessionApps = this.getAndroidSessionApps();
    const persistentApps = this.getAndroidPersistentApps();

    // Remove from both first
    const uniqueSession = sessionApps.filter((p) => p !== packageName);
    const uniquePersistent = persistentApps.filter((p) => p !== packageName);

    if (mode === "session") {
      uniqueSession.push(packageName);
    } else if (mode === "persistent") {
      uniquePersistent.push(packageName);
    }

    this.saveAndroidSessionApps(uniqueSession);
    this.saveAndroidPersistentApps(uniquePersistent);

    // Send updated arrays down to Cap plugin immediately
    if (typeof window !== "undefined" && (window as any).Capacitor) {
      try {
        const allBlocked = Array.from(
          new Set([...uniqueSession, ...uniquePersistent]),
        );
        const AppBlocker = (window as any).Capacitor.Plugins.AppBlocker;
        if (AppBlocker && AppBlocker.setBlockedApps) {
          AppBlocker.setBlockedApps({ apps: allBlocked });
        }
      } catch (e) {
        console.error("Failed to sync blocks to Android plugin", e);
      }
    }
  }

  // --- FOCUS SESSIONS ---
  getFocusSessions(): FocusSession[] {
    const data = this.getItem(STORAGE_KEYS.FOCUS_SESSIONS);
    return data ? JSON.parse(data) : [];
  }

  addFocusSession(
    session: Omit<FocusSession, "id">,
    sync = true,
  ): FocusSession {
    const sessions = this.getFocusSessions();
    const newSession = { ...session, id: crypto.randomUUID() };
    sessions.push(newSession);
    this.setItem(STORAGE_KEYS.FOCUS_SESSIONS, JSON.stringify(sessions));

    // Update daily stats
    this.updateDailyStats(newSession.durationMinutes / 60, 0); // Assuming session time is "saved"

    if (sync && this.userId) {
      api.addFocusSession(newSession).catch(console.error);
    }

    return newSession;
  }

  // --- STATS ---
  // Helper to get or initialize stats for today
  getTodayStats(): DailyStats {
    const data = this.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];
    const today = this.getLocalDateString();

    let stats = allStats.find((s) => s.date === today);
    if (!stats) {
      stats = { date: today, savedHours: 0, wastedHours: 0 };
      allStats.push(stats);
      this.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(allStats));
    } else if (
      stats.savedHours === 0 &&
      stats.wastedHours > 0 &&
      stats.wastedHours < 0.5
    ) {
      // Fix old random wasted data
      stats.wastedHours = 0;
      this.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(allStats));
    }
    return stats;
  }

  // Get stats for a specific date
  getStatsForDate(dateStr: string): DailyStats {
    const data = this.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];

    const stats = allStats.find((s) => s.date === dateStr);
    return stats || { date: dateStr, savedHours: 0, wastedHours: 0 };
  }

  // Get all stats for a month
  getMonthStats(year: number, month: number): DailyStats[] {
    const data = this.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];

    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    return allStats.filter((s) => s.date.startsWith(monthStr));
  }

  // Get tasks completed on a specific date
  getTasksCompletedOnDate(dateStr: string): number {
    const tasks = this.getTasks();
    return tasks.filter((t) => {
      if (!t.completed) return false;
      // Bug 7 fix: Use completedAt (the actual completion date), fallback to createdAt
      const taskDateStr = t.completedAt || t.createdAt;
      if (taskDateStr) {
        return taskDateStr.split("T")[0] === dateStr;
      }
      return false;
    }).length;
  }

  updateDailyStats(savedAdd: number, wastedAdd: number) {
    const data = this.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];
    const today = this.getLocalDateString();

    const index = allStats.findIndex((s) => s.date === today);
    if (index >= 0) {
      allStats[index].savedHours += savedAdd;
      allStats[index].wastedHours += wastedAdd;
    } else {
      allStats.push({
        date: today,
        savedHours: savedAdd,
        wastedHours: wastedAdd,
      });
    }
    this.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(allStats));
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

    // Bug Fix: Handle pre-9AM correctly.
    // If currentHour < 9, we still want to show the chart starting at 9AM (empty) or show pre-9AM data?
    // Standard workday chart usually 9-5. If user works at 7AM, it might not show up well here without dynamic range.
    // We will stick to 9-5 fixed range for now but fix the loop so it returns structure.

    const hoursPassed =
      currentHour >= startHour ? Math.max(1, currentHour - startHour) : 0;
    const savedPerHour =
      hoursPassed > 0 ? todayStats.savedHours / hoursPassed : 0;
    const wastedPerHour =
      hoursPassed > 0 ? todayStats.wastedHours / hoursPassed : 0;

    for (let h = startHour; h <= 17; h++) {
      // 9 AM to 5 PM
      // Distribute for past hours
      if (h < currentHour) {
        accumulatedSaved += savedPerHour;
        accumulatedWasted += wastedPerHour;
      }
      // For the current hour (and future if we wanted projection, but we don't), cap at actuals
      else if (
        h === currentHour ||
        (currentHour < startHour && h === startHour)
      ) {
        // If we are at or past the current hour, or if it's early morning (show 0 at 9am),
        // Just show the current total? No, if it's 2 PM, 5 PM should show empty or projected?
        // The original code was accumulating.

        // Simplification:
        // If h <= currentHour, show accumulated.
        // If h > currentHour, show same as current (flatline) or 0?
        // Usually charts show "current status" continuing or stopping.
        // Let's stop updating "accumulated" after currentHour.

        if (h === currentHour) {
          accumulatedSaved = todayStats.savedHours;
          accumulatedWasted = todayStats.wastedHours;
        }
      }

      const hourLabel =
        h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`;
      data.push({
        time: hourLabel,
        saved: Number(accumulatedSaved.toFixed(1)),
        wasted: Number(accumulatedWasted.toFixed(1)),
      });
    }

    return data;
  }

  getTotalStats() {
    const today = this.getTodayStats();
    return {
      saved: today.savedHours,
      wasted: today.wastedHours,
      efficiency:
        today.savedHours + today.wastedHours > 0
          ? Math.round(
              (today.savedHours / (today.savedHours + today.wastedHours)) * 100,
            )
          : 0,
    };
  }

  // Reset today's stats to zero
  resetTodayStats() {
    const data = this.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];
    const today = this.getLocalDateString();

    const index = allStats.findIndex((s) => s.date === today);
    if (index >= 0) {
      allStats[index] = { date: today, savedHours: 0, wastedHours: 0 };
      this.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(allStats));
    } else {
      allStats.push({ date: today, savedHours: 0, wastedHours: 0 });
      this.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(allStats));
    }
  }

  // --- BULK TASKS SAVE ---
  saveTasks(tasks: Task[], sync = true): void {
    this.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this._updateExtensionSync();
    this.notifyChange("tasks");

    // Bug 6 fix: Actually use the sync parameter
    if (sync && this.userId) {
      tasks.forEach((t) => api.updateTask(t.id, t).catch(console.error));
    }
  }

  // --- BULK BLOCKED APPS SAVE ---
  saveBlockedApps(apps: BlockedApp[], sync = true): void {
    this.setItem(STORAGE_KEYS.BLOCKED_APPS, JSON.stringify(apps));
    this._updateExtensionSync();
    this.notifyChange("blockedApps");

    // Bug 6 fix: Actually use the sync parameter
    if (sync && this.userId) {
      apps.forEach((a) => api.createBlockedApp(a).catch(console.error));
    }
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
    const data = this.getItem(STORAGE_KEYS.DAILY_STATS);
    const allStats: DailyStats[] = data ? JSON.parse(data) : [];

    const weekStart = this.getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Generate all 7 days of the week
    const weeklyStats: DailyStats[] = [];
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const existingStat = allStats.find((s) => s.date === dateStr);
      weeklyStats.push(
        existingStat || { date: dateStr, savedHours: 0, wastedHours: 0 },
      );
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
    const data = this.getItem(STORAGE_KEYS.DAILY_STATS);
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
      // Bug 8 fix: Use local date format to match getLocalDateString(), not UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const stat = allStats.find((s) => s.date === dateStr);
      if (stat) {
        total += stat.savedHours;
      }
    }

    return total;
  }

  // Get the best productive day this week
  getBestProductiveDay(): { day: string; hours: number } | null {
    const weeklyStats = this.getWeeklyStats();
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

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

    return tasks.filter((t) => {
      if (!t.completed) return false;

      // Use completedAt if available, otherwise fallback to createdAt
      const dateStr = t.completedAt || t.createdAt;

      if (dateStr) {
        const taskDate = new Date(dateStr);
        return taskDate >= weekStart;
      }
      // Bug 9 fix: Don't count dateless tasks as completed this week
      return false;
    }).length;
  }

  // Get tasks completed last week
  getPreviousWeekTasksCompleted(): number {
    const tasks = this.getTasks();
    const thisWeekStart = this.getWeekStart();
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    return tasks.filter((t) => {
      if (!t.completed) return false;
      // Bug 10 fix: Use completedAt instead of createdAt
      const dateStr = t.completedAt || t.createdAt;
      if (dateStr) {
        const taskDate = new Date(dateStr);
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
    const endTime = Date.now() + durationMinutes * 60 * 1000;
    const session = {
      startTime: Date.now(),
      endTime,
      duration: durationMinutes,
    };
    this.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
    this._updateExtensionSync();
    this.notifyChange("focusSessions");
  }

  // Bug 16 fix: Pause extends the session endTime so time doesn't tick away
  pauseFocusSession(): void {
    const sessionData = this.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (!sessionData) return;
    try {
      const session = JSON.parse(sessionData);
      if (session.pausedAt) return; // Already paused
      const remainingMs = session.endTime - Date.now();
      session.pausedAt = Date.now();
      session.remainingMs = Math.max(0, remainingMs);
      this.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
    } catch (e) {
      console.error("Error pausing focus session", e);
    }
  }

  resumeFocusSession(): void {
    const sessionData = this.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (!sessionData) return;
    try {
      const session = JSON.parse(sessionData);
      if (!session.pausedAt) return; // Not paused
      // Recalculate endTime from now + the remaining time we had when paused
      session.endTime = Date.now() + (session.remainingMs || 0);
      delete session.pausedAt;
      delete session.remainingMs;
      this.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
    } catch (e) {
      console.error("Error resuming focus session", e);
    }
  }

  endFocusSession(): void {
    const sessionData = this.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        const elapsedMs = Date.now() - session.startTime;

        // Bug 3 fix: Removed addSavedTime() call here because addFocusSession()
        // already calls updateDailyStats() which adds savedHours. Calling both
        // was double-counting.

        // Record the session (this also updates daily stats)
        this.addFocusSession({
          startTime: new Date(session.startTime).toISOString(),
          durationMinutes: Math.round(elapsedMs / 60000),
          completed: true,
          appsBlockedCount: this.getBlockedApps().filter(
            (a) => a.isEnabled || a.blocked,
          ).length,
        });
      } catch (e) {
        console.error("Error ending focus session", e);
      }
    }
    this.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    this._updateExtensionSync();
    this.notifyChange("focusSessions");
  }

  getActiveSession(): {
    startTime: number;
    endTime: number;
    duration: number;
    pausedAt?: number;
    remainingMs?: number;
  } | null {
    const sessionData = this.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (!sessionData) return null;

    try {
      const session = JSON.parse(sessionData);
      if (session.pausedAt || session.endTime > Date.now()) {
        return session;
      }
      // Bug 4 fix: Session expired — properly record stats before cleanup
      // instead of silently deleting
      this.endFocusSession();
      return null;
    } catch (e) {
      return null;
    }
  }
}

export const storage = new LocalStorageService();
