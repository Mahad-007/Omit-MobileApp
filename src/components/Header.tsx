import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [focusTime, setFocusTime] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Initialize state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("focusTimerState");
    if (savedState) {
      const { isActive: savedIsActive, startTime, accumulatedTime } = JSON.parse(savedState);
      
      if (savedIsActive && startTime) {
        setIsActive(true);
        // Calculate current elapsed time immediately
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setFocusTime(accumulatedTime + elapsed);
      } else {
        setIsActive(false);
        setFocusTime(accumulatedTime || 0);
      }
    }
  }, []);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive) {
      interval = setInterval(() => {
        // Recalculate based on start time to prevent drift and handle refreshes
        const savedState = localStorage.getItem("focusTimerState");
        if (savedState) {
          const { startTime, accumulatedTime } = JSON.parse(savedState);
          if (startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setFocusTime(accumulatedTime + elapsed);
          }
        }
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isActive]);

  const toggleTimer = () => {
    const newState = !isActive;
    setIsActive(newState);
    
    const now = Date.now();
    let currentAccumulated = focusTime; // This serves as the base
    
    // If we are getting current state from storage to be safe
    const savedStateStr = localStorage.getItem("focusTimerState");
    let savedStartTime = null;
    let savedAccumulated = 0;
    
    if (savedStateStr) {
      const parsed = JSON.parse(savedStateStr);
      savedAccumulated = parsed.accumulatedTime || 0;
      savedStartTime = parsed.startTime;
    }

    if (newState) {
      // STARTING
      // If we were paused, our displayed focusTime is the accumulated time.
      // We set start time to NOW.
      // Accumulated remains what it was.
      
      const stateToSave = {
        isActive: true,
        startTime: now,
        accumulatedTime: savedAccumulated // Keep existing accumulated
      };
      localStorage.setItem("focusTimerState", JSON.stringify(stateToSave));
      
    } else {
      // PAUSING
      // Calculate final accumulated time
      // New accumulated = Old accumulated + (Now - StartTime)
      if (savedStartTime) {
        const elapsed = Math.floor((now - savedStartTime) / 1000);
        currentAccumulated = savedAccumulated + elapsed;
      }
      
      const stateToSave = {
        isActive: false,
        startTime: null,
        accumulatedTime: currentAccumulated
      };
      localStorage.setItem("focusTimerState", JSON.stringify(stateToSave));
      setFocusTime(currentAccumulated);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  return (
    <header className="min-h-14 lg:h-16 bg-card border-b border-border flex flex-col lg:flex-row items-center justify-between px-3 lg:px-6 py-2 lg:py-0 gap-2 lg:gap-0">
      <div className="flex items-center gap-2 lg:gap-4 w-full lg:w-auto justify-between lg:justify-start">
        {/* Logo on mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <img 
            src="/omit-logo.png" 
            alt="Omit Logo" 
            className="w-8 h-8 object-contain"
          />
          <span className="font-bold text-foreground">Omit</span>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-3 bg-gradient-card px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg">
          <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
          <div>
            <p className="text-[10px] lg:text-xs text-muted-foreground">Focus Time</p>
            <p className="text-sm lg:text-lg font-bold text-foreground">{formatTime(focusTime)}</p>
          </div>
          <button
            onClick={toggleTimer}
            className="ml-1 lg:ml-2 px-2 lg:px-3 py-1 text-[10px] lg:text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {isActive ? "Pause" : "Start"}
          </button>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">Welcome back, {getUserDisplayName()}!</p>
          <p className="text-xs text-muted-foreground">Let's stay focused today</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="outline-none">
              <Avatar>
                <AvatarFallback className="bg-gradient-primary text-primary-foreground cursor-pointer">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">My Account</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
