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
        
        // Get current monitoring state from localStorage (Master Switch)
        // Default to true if not set? Or false? 
        // If user never touched it, usually we want it ON if they added apps.
        // Let's assume if it's null, it's true.
        const monitoringStored = localStorage.getItem("android_monitoring");
        const masterSwitch = monitoringStored === null || monitoringStored === "true";
        
        // Update the blocked list on the native side
        await AppBlocker.setBlockedApps({ apps: appsToBlock });
        
        if (masterSwitch && hasAppsToBlock) {
             // Re-enforce monitoring (idempotent on native side)
             await AppBlocker.startMonitoring();
             // Ensure local state is consistent
             if (monitoringStored !== "true") {
                 localStorage.setItem("android_monitoring", "true");
             }
        } else {
             // Stop monitoring if switch is off OR no apps to block
             await AppBlocker.stopMonitoring();
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
