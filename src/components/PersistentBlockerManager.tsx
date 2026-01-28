import { useEffect } from 'react';
import { storage } from '@/lib/storage';
import AppBlocker, { isCapacitor } from '@/lib/app-blocker';
import { toast } from 'sonner';

/**
 * Headless component that manages the synchronization between the app's state
 * (storage) and the native AppBlocker plugin.
 * 
 * It listens for changes in:
 * - Blocked apps list (enabled status, block mode)
 * - Focus sessions (start/end)
 * - Settings (daily limits)
 * 
 * And enforces the correct blocking state on the device.
 */
export function PersistentBlockerManager() {
  useEffect(() => {
    if (!isCapacitor()) return;

    const enforceBlocking = async () => {
      try {
        const session = storage.getActiveSession();
        const isSessionActive = !!session;
        const isTimeLimitExceeded = storage.isTimeLimitExceeded();
        
        // Blocking is active if:
        // 1. A focus session is running OR Daily time limit is exceeded
        //    -> Enforce both Session Apps AND Persistent Apps
        // 2. No session running
        //    -> Enforce ONLY Persistent Apps
        
        const sessionApps = storage.getAndroidSessionApps();
        const persistentApps = storage.getAndroidPersistentApps();
        
        const shouldEnforceSession = isSessionActive || isTimeLimitExceeded;
        
        let appsToBlock: string[] = [...persistentApps];
        
        if (shouldEnforceSession) {
            // Merge session apps, avoiding duplicates
            sessionApps.forEach(pkg => {
                if (!appsToBlock.includes(pkg)) {
                    appsToBlock.push(pkg);
                }
            });
        }
        
        const hasAppsToBlock = appsToBlock.length > 0;
        
        // Get current monitoring state from localStorage (simple cache)
        const wasMonitoring = localStorage.getItem("android_monitoring") === "true";
        
        // Update the blocked list on the native side
        // Note: It's safe to call setBlockedApps even if empty or same
        await AppBlocker.setBlockedApps({ apps: appsToBlock });
        
        if (hasAppsToBlock) {
             if (!wasMonitoring) {
                 await AppBlocker.startMonitoring();
                 localStorage.setItem("android_monitoring", "true");
                 // Only toast if we started a session or strict mode etc, might be annoying if auto-starting on app boot
                 // toast.success("App Blocking Active");
             }
        } else {
             if (wasMonitoring) {
                 await AppBlocker.stopMonitoring();
                 localStorage.setItem("android_monitoring", "false");
             }
        }
        
      } catch (e) {
        console.error("Error enforcing blocking", e);
      }
    };

    // Initial check
    enforceBlocking();

    // Subscribe to all relevant changes
    const unsubStorage = storage.onChange('all', enforceBlocking);
    
    return () => {
      unsubStorage();
    };
  }, []);

  return null; // Headless
}

