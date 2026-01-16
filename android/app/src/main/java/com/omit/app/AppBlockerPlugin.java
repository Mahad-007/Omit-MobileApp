package com.omit.app;

import android.app.AppOpsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "AppBlocker")
public class AppBlockerPlugin extends Plugin {

    private static List<String> blockedPackages = new ArrayList<>();
    private static boolean isMonitoring = false;

    public static List<String> getBlockedPackages() {
        return blockedPackages;
    }

    public static boolean isMonitoringActive() {
        return isMonitoring;
    }

    @PluginMethod
    public void setBlockedApps(PluginCall call) {
        JSArray apps = call.getArray("apps");
        blockedPackages.clear();
        
        if (apps != null) {
            try {
                for (int i = 0; i < apps.length(); i++) {
                    blockedPackages.add(apps.getString(i));
                }
            } catch (JSONException e) {
                call.reject("Failed to parse blocked apps", e);
                return;
            }
        }
        
        JSObject result = new JSObject();
        result.put("count", blockedPackages.size());
        call.resolve(result);
    }

    @PluginMethod
    public void startMonitoring(PluginCall call) {
        isMonitoring = true;
        
        // Start the overlay service
        Context context = getContext();
        Intent serviceIntent = new Intent(context, BlockingOverlayService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
        
        JSObject result = new JSObject();
        result.put("monitoring", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        isMonitoring = false;
        
        // Stop the overlay service
        Context context = getContext();
        Intent serviceIntent = new Intent(context, BlockingOverlayService.class);
        context.stopService(serviceIntent);
        
        JSObject result = new JSObject();
        result.put("monitoring", false);
        call.resolve(result);
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        Context context = getContext();
        
        boolean hasAccessibility = isAccessibilityServiceEnabled(context);
        boolean hasUsageStats = hasUsageStatsPermission(context);
        boolean hasOverlay = Settings.canDrawOverlays(context);
        
        JSObject result = new JSObject();
        result.put("accessibility", hasAccessibility);
        result.put("usageStats", hasUsageStats);
        result.put("overlay", hasOverlay);
        result.put("allGranted", hasAccessibility && hasUsageStats && hasOverlay);
        call.resolve(result);
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void openUsageStatsSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        Context context = getContext();
        PackageManager pm = context.getPackageManager();
        List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
        
        JSArray result = new JSArray();
        for (ApplicationInfo app : apps) {
            // Filter to show only user-installed apps (not system apps)
            // Or apps that have been updated system apps
            boolean isUserApp = (app.flags & ApplicationInfo.FLAG_SYSTEM) == 0 || (app.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0;
            
            if (isUserApp) {
                JSObject appInfo = new JSObject();
                appInfo.put("packageName", app.packageName);
                appInfo.put("appName", pm.getApplicationLabel(app).toString());
                
                // Get Icon
                try {
                    android.graphics.drawable.Drawable icon = pm.getApplicationIcon(app);
                    String base64Icon = getBase64FromDrawable(icon);
                    appInfo.put("icon", base64Icon);
                } catch (Exception e) {
                    appInfo.put("icon", "");
                }
                
                result.put(appInfo);
            }
        }
        
        JSObject response = new JSObject();
        response.put("apps", result);
        call.resolve(response);
    }
    
    private String getBase64FromDrawable(android.graphics.drawable.Drawable drawable) {
        if (drawable == null) return "";
        
        android.graphics.Bitmap bitmap;
        if (drawable instanceof android.graphics.drawable.BitmapDrawable) {
            bitmap = ((android.graphics.drawable.BitmapDrawable) drawable).getBitmap();
        } else {
            // Handle adaptive icons or other drawables
            bitmap = android.graphics.Bitmap.createBitmap(
                drawable.getIntrinsicWidth(), 
                drawable.getIntrinsicHeight(), 
                android.graphics.Bitmap.Config.ARGB_8888
            );
            android.graphics.Canvas canvas = new android.graphics.Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);
        }
        
        // Resize to reduce payload size (e.g., 64x64 or 96x96)
        int size = 96;
        android.graphics.Bitmap resized = android.graphics.Bitmap.createScaledBitmap(bitmap, size, size, true);
        
        java.io.ByteArrayOutputStream byteArrayOutputStream = new java.io.ByteArrayOutputStream();
        resized.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();
        return android.util.Base64.encodeToString(byteArray, android.util.Base64.NO_WRAP);
    }

    private boolean isAccessibilityServiceEnabled(Context context) {
        String serviceName = context.getPackageName() + "/" + AppBlockerService.class.getCanonicalName();
        String enabledServices = Settings.Secure.getString(
                context.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        );
        
        if (TextUtils.isEmpty(enabledServices)) {
            return false;
        }
        
        return enabledServices.toLowerCase().contains(serviceName.toLowerCase());
    }

    private boolean hasUsageStatsPermission(Context context) {
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }
}
