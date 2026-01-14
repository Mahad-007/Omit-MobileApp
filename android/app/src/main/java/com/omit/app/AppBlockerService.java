package com.omit.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.view.accessibility.AccessibilityEvent;

import java.util.List;

public class AppBlockerService extends AccessibilityService {

    private static AppBlockerService instance;
    private String lastBlockedPackage = "";

    public static AppBlockerService getInstance() {
        return instance;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (!AppBlockerPlugin.isMonitoringActive()) {
            return;
        }

        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            CharSequence packageNameSeq = event.getPackageName();
            if (packageNameSeq == null) return;
            
            String packageName = packageNameSeq.toString();
            List<String> blockedPackages = AppBlockerPlugin.getBlockedPackages();
            
            // Don't block our own app
            if (packageName.equals(getPackageName())) {
                lastBlockedPackage = "";
                return;
            }
            
            // Check if this package should be blocked
            if (blockedPackages.contains(packageName)) {
                // Avoid repeatedly showing overlay for same package
                if (!packageName.equals(lastBlockedPackage)) {
                    lastBlockedPackage = packageName;
                    showBlockingOverlay(packageName);
                }
            } else {
                lastBlockedPackage = "";
            }
        }
    }

    private void showBlockingOverlay(String packageName) {
        Intent intent = new Intent(this, BlockingOverlayService.class);
        intent.putExtra("blocked_package", packageName);
        intent.setAction("SHOW_OVERLAY");
        startService(intent);
    }

    @Override
    public void onInterrupt() {
        // Called when the service is interrupted
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        
        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.notificationTimeout = 100;
        info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;
        
        setServiceInfo(info);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
    }
}
