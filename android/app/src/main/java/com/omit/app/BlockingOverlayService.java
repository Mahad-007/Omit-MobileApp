package com.omit.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class BlockingOverlayService extends Service {

    private static final String CHANNEL_ID = "app_blocker_channel";
    private static final int NOTIFICATION_ID = 1001;
    
    private WindowManager windowManager;
    private View overlayView;
    private boolean isOverlayVisible = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, createNotification());
        
        if (intent != null && "SHOW_OVERLAY".equals(intent.getAction())) {
            String blockedPackage = intent.getStringExtra("blocked_package");
            showOverlay(blockedPackage);
        }
        
        return START_STICKY;
    }

    private void showOverlay(String packageName) {
        if (isOverlayVisible) {
            return;
        }

        LayoutInflater inflater = (LayoutInflater) getSystemService(LAYOUT_INFLATER_SERVICE);
        overlayView = inflater.inflate(R.layout.overlay_blocked, null);

        // Set app name in the overlay
        TextView appNameView = overlayView.findViewById(R.id.blocked_app_name);
        if (appNameView != null && packageName != null) {
            try {
                String appName = getPackageManager()
                        .getApplicationLabel(getPackageManager().getApplicationInfo(packageName, 0))
                        .toString();
                appNameView.setText(appName + " is blocked");
            } catch (Exception e) {
                appNameView.setText("This app is blocked");
            }
        }

        // Set up Go Back button
        Button goBackButton = overlayView.findViewById(R.id.btn_go_back);
        if (goBackButton != null) {
            goBackButton.setOnClickListener(v -> {
                hideOverlay();
                goToHomeScreen();
            });
        }

        // Set up Open Omit button
        Button openOmitButton = overlayView.findViewById(R.id.btn_open_omit);
        if (openOmitButton != null) {
            openOmitButton.setOnClickListener(v -> {
                hideOverlay();
                openOmitApp();
            });
        }

        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.CENTER;

        try {
            windowManager.addView(overlayView, params);
            isOverlayVisible = true;
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void hideOverlay() {
        if (overlayView != null && isOverlayVisible) {
            try {
                windowManager.removeView(overlayView);
                overlayView = null;
                isOverlayVisible = false;
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void goToHomeScreen() {
        Intent homeIntent = new Intent(Intent.ACTION_MAIN);
        homeIntent.addCategory(Intent.CATEGORY_HOME);
        homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(homeIntent);
    }

    private void openOmitApp() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "App Blocker Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Monitors and blocks distracting apps");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Omit App Blocker")
                .setContentText("Protecting you from distractions")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        hideOverlay();
    }
}
