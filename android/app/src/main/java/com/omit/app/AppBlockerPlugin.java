package com.omit.app;

import android.app.AppOpsManager;
import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppBlocker")
public class AppBlockerPlugin extends Plugin {

    private static final String PREFS_NAME = "OmitAppBlockerPrefs";
    private static final String KEY_BLOCKED_APPS = "blocked_apps";
    private static final String KEY_IS_MONITORING = "is_monitoring";

    private static List<String> blockedPackages = new ArrayList<>();
    private static boolean isMonitoring = false;
    private BroadcastReceiver usageReceiver;
    private ExecutorService iconExecutor = Executors.newFixedThreadPool(2);

    public static List<String> getBlockedPackages() {
        return blockedPackages;
    }

    public static boolean isMonitoringActive() {
        return isMonitoring;
    }

    @Override
    public void load() {
        super.load();
        
        // Load persisted state
        android.content.SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        isMonitoring = prefs.getBoolean(KEY_IS_MONITORING, false);
        Set<String> blockedSet = prefs.getStringSet(KEY_BLOCKED_APPS, new HashSet<>());
        blockedPackages = new ArrayList<>(blockedSet);

        usageReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.omit.app.USAGE_UPDATE".equals(intent.getAction())) {
                    String pkg = intent.getStringExtra("packageName");
                    long duration = intent.getLongExtra("duration", 0);
                    
                    JSObject ret = new JSObject();
                    ret.put("packageName", pkg);
                    ret.put("duration", duration);
                    notifyListeners("usageUpdate", ret);
                }
            }
        };
        
        IntentFilter filter = new IntentFilter("com.omit.app.USAGE_UPDATE");
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                 getContext().registerReceiver(usageReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                 getContext().registerReceiver(usageReceiver, filter);
            }
        } catch (Exception e) {
            Log.e("AppBlockerPlugin", "Error registering receiver", e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (usageReceiver != null) {
            try {
                getContext().unregisterReceiver(usageReceiver);
            } catch (Exception e) {
                // Already unregistered or error
            }
        }
        if (iconExecutor != null) {
            iconExecutor.shutdownNow();
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void setBlockedApps(PluginCall call) {
        JSArray apps = call.getArray("apps");
        blockedPackages.clear();
        
        Set<String> appSet = new HashSet<>();
        if (apps != null) {
            try {
                for (int i = 0; i < apps.length(); i++) {
                    String pkg = apps.getString(i);
                    blockedPackages.add(pkg);
                    appSet.add(pkg);
                }
            } catch (JSONException e) {
                call.reject("Failed to parse blocked apps", e);
                return;
            }
        }
        
        // Persist
        android.content.SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putStringSet(KEY_BLOCKED_APPS, appSet).apply();
        
        JSObject result = new JSObject();
        result.put("count", blockedPackages.size());
        call.resolve(result);
    }

    @PluginMethod
    public void startMonitoring(PluginCall call) {
        isMonitoring = true;
        
        // Persist
        getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_IS_MONITORING, true).apply();
        
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
        
        // Persist
        getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_IS_MONITORING, false).apply();
        
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
            boolean isUserApp = (app.flags & ApplicationInfo.FLAG_SYSTEM) == 0 || (app.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0;
            
            if (isUserApp) {
                JSObject appInfo = new JSObject();
                appInfo.put("packageName", app.packageName);
                appInfo.put("appName", pm.getApplicationLabel(app).toString());
                
                // Return Base64 encoded icon
                try {
                    Drawable icon = pm.getApplicationIcon(app);
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

    @PluginMethod
    public void getAppIcon(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null) {
            call.reject("Package name is required");
            return;
        }

        iconExecutor.execute(() -> {
            try {
                PackageManager pm = getContext().getPackageManager();
                Drawable icon = pm.getApplicationIcon(packageName);
                String base64Icon = getBase64FromDrawable(icon);
                
                JSObject result = new JSObject();
                result.put("icon", base64Icon);
                call.resolve(result);
            } catch (Exception e) {
                Log.e("AppBlockerPlugin", "Error extracting icon for " + packageName, e);
                call.reject("Failed to extract icon");
            }
        });
    }

    private String getBase64FromDrawable(Drawable drawable) {
        if (drawable == null) return "";
        
        Bitmap bitmap;
        if (drawable instanceof BitmapDrawable) {
            bitmap = ((BitmapDrawable) drawable).getBitmap();
        } else {
            // Handle adaptive icons or other drawables
            bitmap = Bitmap.createBitmap(
                drawable.getIntrinsicWidth() <= 0 ? 1 : drawable.getIntrinsicWidth(), 
                drawable.getIntrinsicHeight() <= 0 ? 1 : drawable.getIntrinsicHeight(), 
                Bitmap.Config.ARGB_8888
            );
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);
        }
        
        // Resize to reduce payload size (e.g., 96x96)
        int size = 96;
        Bitmap resized = Bitmap.createScaledBitmap(bitmap, size, size, true);
        
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        resized.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();
        return Base64.encodeToString(byteArray, Base64.NO_WRAP);
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
