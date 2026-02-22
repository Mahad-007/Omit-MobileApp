/* eslint-disable */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import SocialBlocker from "./pages/SocialBlocker";
import Tasks from "./pages/Tasks";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import FocusTimer from "./pages/FocusTimer";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Blocked from "./pages/Blocked";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { PersistentBlockerManager } from "@/components/PersistentBlockerManager";



import { useEffect, useState } from "react";
import { storage } from "@/lib/storage";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { NotificationManager } from "@/utils/notifications";
import AppBlocker, { isCapacitor } from "@/lib/app-blocker";

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

if (isCapacitor()) {
    GoogleAuth.initialize();
}

const App = () => {
    useTaskNotifications();

    const [isStorageReady, setStorageReady] = useState(false);

    useEffect(() => {
        // Initialize storage (load from Preferences)
        const initStorage = async () => {
             await storage.init();
             // Sync data to extension on app load (must be after init)
             storage.forceSync();
             setStorageReady(true);
        };
        initStorage();

        // Request notification permissions
        NotificationManager.requestPermissions();
        
        // Listen for native Android usage updates
        let nativeListener: any;
        const pendingUsageRef = { current: 0 };
        
        // Flush pending usage to storage every 10 seconds to avoid stuttering from frequent writes
        const usageFlushInterval = setInterval(() => {
            if (pendingUsageRef.current > 0) {
                console.log('[App] Flushing pending usage:', pendingUsageRef.current);
                storage.addAppUsageTime(pendingUsageRef.current);
                pendingUsageRef.current = 0;
            }
        }, 10000);

        if (isCapacitor()) {
             // We cast to any because addListener is not strictly typed in the interface yet
             // @ts-ignore
             AppBlocker.addListener('usageUpdate', (data: any) => {
                // console.log('Received native usage:', data); // Log is throttled too to avoid spam
                const persistent = storage.getAndroidPersistentApps();
                const sessionApps = storage.getAndroidSessionApps();
                const activeSession = storage.getActiveSession();
                
                const isBlocked = persistent.includes(data.packageName) || 
                                  (activeSession && sessionApps.includes(data.packageName));
                                  
                if (isBlocked) {
                     // Convert ms to minutes for usage tracking (daily limit)
                     const minutes = data.duration / (1000 * 60);
                     if (minutes > 0) {
                         // Accumulate instead of writing immediately
                         pendingUsageRef.current += minutes;
                     }
                }
             }).then((handle: any) => {
                 nativeListener = handle;
             });
        }

        // Listen for time saved updates from the extension
        const handleTimeUpdate = (event: MessageEvent) => {
            if (event.data?.type === 'OMIT_ADD_TIME' && event.data?.payload?.hours) {
                console.log('[App] Received saved time update:', event.data.payload.hours);
                storage.addSavedTime(event.data.payload.hours);
            }
            
            // Handle wasted time updates from the extension
            if (event.data?.type === 'OMIT_ADD_WASTED_TIME' && event.data?.payload?.hours) {
                console.log('[App] Received wasted time update:', event.data.payload.hours);
                storage.addWastedTime(event.data.payload.hours);
            }
        };

        window.addEventListener('message', handleTimeUpdate);
        return () => {
             window.removeEventListener('message', handleTimeUpdate);
             if (nativeListener) {
                 // Bug Fix: Check if remove is a function or if it's an object with remove()
                 if (typeof nativeListener.remove === 'function') {
                     nativeListener.remove();
                 } else if (typeof nativeListener === 'function') {
                     nativeListener();
                 }
             }
             
             // Flush any remaining usage before unmounting
             if (pendingUsageRef.current > 0) {
                 storage.addAppUsageTime(pendingUsageRef.current);
                 pendingUsageRef.current = 0;
             }
             clearInterval(usageFlushInterval);
        };
    }, []);

    if (!isStorageReady) {
        return <div className="flex items-center justify-center min-h-screen bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
    }

    return (

    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <AuthProvider>
          <PersistentBlockerManager />
          <Toaster />
          <Sonner />
          <div className="min-h-screen bg-background font-sans text-foreground antialiased safe-area-top safe-area-bottom selection:bg-primary/20">
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/blocked" element={<ProtectedRoute><Blocked /></ProtectedRoute>} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                
                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="blocker" element={<SocialBlocker />} />
                  <Route path="tasks" element={<Tasks />} />
                  <Route path="stats" element={<Stats />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="timer" element={<FocusTimer />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>

);
};

export default App;
