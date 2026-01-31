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

const App = () => {
    useTaskNotifications();

    const [isStorageReady, setStorageReady] = useState(false);

    useEffect(() => {
        // Initialize storage (load from Preferences)
        const initStorage = async () => {
             await storage.init();
             setStorageReady(true);
        };
        initStorage();

        // Request notification permissions
        NotificationManager.requestPermissions();

        // Sync data to extension on app load
        storage.forceSync();
        
        // Listen for native Android usage updates
        let nativeListener: any;
        if (isCapacitor()) {
             // We cast to any because addListener is not strictly typed in the interface yet
             (AppBlocker as any).addListener('usageUpdate', (data: { packageName: string, duration: number }) => {
                console.log('Received native usage:', data);
                const persistent = storage.getAndroidPersistentApps();
                const sessionApps = storage.getAndroidSessionApps();
                const activeSession = storage.getActiveSession();
                
                const isBlocked = persistent.includes(data.packageName) || 
                                  (activeSession && sessionApps.includes(data.packageName));
                                  
                if (isBlocked) {
                     const hours = data.duration / (1000 * 60 * 60);
                     if (hours > 0) {
                         storage.addWastedTime(hours);
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
            if (nativeListener) nativeListener.remove();
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
                <Route path="/blocked" element={<Blocked />} />
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
