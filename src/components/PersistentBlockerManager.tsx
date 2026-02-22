import { useEffect, useRef } from 'react';
import { storage } from '@/lib/storage';
import AppBlocker, { isCapacitor } from '@/lib/app-blocker';

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
  // Use a ref to track the latest timeout ID for debouncing
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        const monitoringStored = localStorage.getItem("android_monitoring");
        const masterSwitch = monitoringStored === null || monitoringStored === "true";
        
        console.log('[PersistentBlockerManager] Enforcing blocking:', { hasAppsToBlock, masterSwitch, appsCount: appsToBlock.length });

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

    // Debounced version of enforceBlocking (500ms)
    const debouncedEnforce = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            enforceBlocking();
        }, 500);
    };

    // Initial check (immediate)
    enforceBlocking();

    // Subscribe ONLY to relevant changes. 
    // strictly avoiding 'stats' or 'all' to prevent loops.
    const unsubBlockedApps = storage.onChange('blockedApps', debouncedEnforce);
    const unsubSettings = storage.onChange('settings', debouncedEnforce);
    const unsubFocus = storage.onChange('focusSessions', debouncedEnforce);
    
    // We also might need to check if 'tasks' changes affect blocking? Likely not.
    // However, Focus Session start/stop might not trigger 'focusSessions' change 
    // effectively if we rely on 'all' previously. 
    // Let's verify: storage.addFocusSession triggers 'focusSessions'.
    // storage.startFocusSession (in storage.ts, not viewable yet, check later) needs to trigger.

    return () => {
      unsubBlockedApps();
      unsubSettings();
      unsubFocus();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return null; // Headless
}
