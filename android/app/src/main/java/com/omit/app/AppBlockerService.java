package com.omit.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.view.accessibility.AccessibilityEvent;

import android.os.Handler;
import android.os.Looper;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class AppBlockerService extends AccessibilityService {

    private static AppBlockerService instance;
    private String lastBlockedPackage = "";
    private Set<String> launcherPackages;
    private long lastOverlayDismissedTime = 0;
    private static final long COOLDOWN_MS = 2000; // 2 second cooldown after overlay dismissed

    // Debounce mechanism to wait for app to fully load
    private final Handler overlayHandler = new Handler(Looper.getMainLooper());
    private Runnable pendingOverlayRunnable;
    private String pendingBlockedPackage = "";
    private static final long DEBOUNCE_DELAY_MS = 50; // Wait 50ms for app to fully load (reduced for instantaneous
                                                      // blocking)

    // Usage Tracking
    private String currentPackage = "";
    private long lastAppChangeTime = 0;

    public static AppBlockerService getInstance() {
        return instance;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Ensure monitoring state is synced from prefs if not already active
        if (!AppBlockerPlugin.isMonitoringActive()) {
            android.content.SharedPreferences prefs = getSharedPreferences("OmitAppBlockerPrefs",
                    android.content.Context.MODE_PRIVATE);
            if (!prefs.getBoolean("is_monitoring", false)) {
                return;
            }
        }

        int eventType = event.getEventType();
        if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
                eventType == AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED) {
            CharSequence packageNameSeq = event.getPackageName();
            if (packageNameSeq == null)
                return;

            String packageName = packageNameSeq.toString();

            // --- USAGE TRACKING ---
            long now = System.currentTimeMillis();
            if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && !packageName.equals(currentPackage)) {
                if (lastAppChangeTime > 0 && !currentPackage.isEmpty()) {
                    long duration = now - lastAppChangeTime;
                    if (duration > 1000) { // Only track > 1 second
                        sendUsageUpdate(currentPackage, duration);
                    }
                }
                currentPackage = packageName;
                lastAppChangeTime = now;
            }
            // ----------------------

            List<String> blockedPackages = AppBlockerPlugin.getBlockedPackages();

            // Don't block our own app - and reset state when in our app
            if (packageName.equals(getPackageName())) {
                cancelPendingOverlay();
                lastBlockedPackage = "";
                return;
            }

            // Reset when user goes to home/launcher
            if (launcherPackages != null && launcherPackages.contains(packageName)) {
                cancelPendingOverlay();
                lastBlockedPackage = "";
                return;
            }

            // Check if this package should be blocked
            if (blockedPackages.contains(packageName)) {
                // Only trigger the block overlay if the actual window state changed
                // (e.g. app opened). Ignore notifications from blocked apps while we are
                // elsewhere!
                if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                    // If it's the same package that's pending, just reset the timer (debounce)
                    if (packageName.equals(pendingBlockedPackage)) {
                        // Same package, reset debounce timer
                        scheduleOverlay(packageName);
                    } else if (!packageName.equals(lastBlockedPackage)) {
                        // New blocked package detected
                        pendingBlockedPackage = packageName;
                        scheduleOverlay(packageName);
                    }
                }
            } else if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
                // ONLY cancel the pending overlay if we have transitioned to a NON-BLOCKED
                // WINDOW.
                // We ignore TYPE_NOTIFICATION_STATE_CHANGED here because notifications from
                // other apps could otherwise cancel a legitimate block transition.

                // CRITICAL FIX: Ignore System UI and android system package changes as they
                // often fire transient window state changes that shouldn't cancel a real app
                // block.
                boolean isSystemPackage = packageName.equals("com.android.systemui") ||
                        packageName.equals("android") ||
                        packageName.equals("com.google.android.permissioncontroller") ||
                        (launcherPackages != null && launcherPackages.contains(packageName));

                if (!isSystemPackage) {
                    cancelPendingOverlay();
                    lastBlockedPackage = "";
                }
            }
        }
    }

    private void sendUsageUpdate(String packageName, long durationMs) {
        Intent intent = new Intent("com.omit.app.USAGE_UPDATE");
        intent.setPackage(getPackageName());
        intent.putExtra("packageName", packageName);
        intent.putExtra("duration", durationMs);
        sendBroadcast(intent);
    }

    private void cancelPendingOverlay() {
        if (pendingOverlayRunnable != null) {
            overlayHandler.removeCallbacks(pendingOverlayRunnable);
            pendingOverlayRunnable = null;
        }
        pendingBlockedPackage = "";
    }

    private void scheduleOverlay(String packageName) {
        // Cancel any existing pending overlay
        if (pendingOverlayRunnable != null) {
            overlayHandler.removeCallbacks(pendingOverlayRunnable);
        }

        pendingOverlayRunnable = () -> {
            // Double-check cooldown and that we're still trying to block this package
            if (System.currentTimeMillis() - lastOverlayDismissedTime < COOLDOWN_MS) {
                pendingBlockedPackage = "";
                return;
            }

            lastBlockedPackage = packageName;
            showBlockingOverlay(packageName);
            pendingBlockedPackage = "";
        };

        // Schedule the overlay to appear after debounce delay
        overlayHandler.postDelayed(pendingOverlayRunnable, DEBOUNCE_DELAY_MS);
    }

    private void showBlockingOverlay(String packageName) {
        Intent intent = new Intent(this, BlockingOverlayService.class);
        intent.putExtra("blocked_package", packageName);
        intent.setAction("SHOW_OVERLAY");
        startService(intent);
    }

    // Called when overlay is dismissed to start cooldown
    public void onOverlayDismissed() {
        lastOverlayDismissedTime = System.currentTimeMillis();
        lastBlockedPackage = ""; // Reset so it can be blocked again after cooldown
        cancelPendingOverlay(); // Cancel any pending overlay too
    }

    @Override
    public void onInterrupt() {
        // Called when the service is interrupted
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;

        // Cache launcher packages for home screen detection
        launcherPackages = getLauncherPackages();

        // Load initial state from SharedPreferences in case plugin hasn't synced yet
        android.content.SharedPreferences prefs = getSharedPreferences("OmitAppBlockerPrefs",
                android.content.Context.MODE_PRIVATE);
        java.util.Set<String> blockedSet = prefs.getStringSet("blocked_apps", new java.util.HashSet<>());
        if (blockedSet != null && !blockedSet.isEmpty()) {
            // Note: Plugin.blockedPackages is static, so we update it here if empty
            if (AppBlockerPlugin.getBlockedPackages().isEmpty()) {
                AppBlockerPlugin.getBlockedPackages().addAll(blockedSet);
            }
        }

        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED |
                AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED |
                AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.notificationTimeout = 100;
        info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;

        setServiceInfo(info);
    }

    private Set<String> getLauncherPackages() {
        Set<String> launchers = new HashSet<>();
        Intent intent = new Intent(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_HOME);
        List<ResolveInfo> resolveInfos = getPackageManager().queryIntentActivities(intent, 0);
        for (ResolveInfo info : resolveInfos) {
            launchers.add(info.activityInfo.packageName);
        }
        return launchers;
    }

    @Override
    public void onDestroy() {
        // --- FINAL USAGE TRACKING ---
        if (lastAppChangeTime > 0 && !currentPackage.isEmpty()) {
            long now = System.currentTimeMillis();
            long duration = now - lastAppChangeTime;
            if (duration > 1000) {
                sendUsageUpdate(currentPackage, duration);
            }
        }
        // ---------------------------

        super.onDestroy();
        instance = null;
    }
}
