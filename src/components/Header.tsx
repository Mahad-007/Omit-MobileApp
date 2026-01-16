import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, LogOut, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [focusTime, setFocusTime] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Get current greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Get formatted date
  const getFormattedDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return now.toLocaleDateString('en-US', options).toUpperCase();
  };

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
    let currentAccumulated = focusTime;
    
    const savedStateStr = localStorage.getItem("focusTimerState");
    let savedStartTime = null;
    let savedAccumulated = 0;
    
    if (savedStateStr) {
      const parsed = JSON.parse(savedStateStr);
      savedAccumulated = parsed.accumulatedTime || 0;
      savedStartTime = parsed.startTime;
    }

    if (newState) {
      const stateToSave = {
        isActive: true,
        startTime: now,
        accumulatedTime: savedAccumulated
      };
      localStorage.setItem("focusTimerState", JSON.stringify(stateToSave));
      
    } else {
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

  const formatTimeShort = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
    <header className="bg-transparent pt-6 lg:pt-8 px-4 lg:px-6 pb-4">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img 
              src="/omit-logo.png" 
              alt="Omit Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold text-foreground">Omit</span>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center rounded-full h-10 w-10 bg-card text-foreground hover:bg-accent transition-colors border border-border/50"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        {/* Greeting */}
        <div className="flex flex-col gap-1 mb-4">
          <p className="text-primary font-semibold text-xs tracking-[0.2em] uppercase">
            TODAY • {getFormattedDate()}
          </p>
          <h2 className="text-foreground text-2xl font-bold leading-tight tracking-tight">
            {getGreeting()}, {getUserDisplayName()}
          </h2>
        </div>
        
        {/* Focus Timer - Mobile */}
        <div className="flex items-center justify-between bg-card/60 px-4 py-3 rounded-xl border border-border/50 shadow-soft">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary/20' : 'bg-muted'}`}>
              <Clock className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground leading-none">Focus Time</span>
              <span className={`text-lg font-bold leading-none mt-1 ${isActive ? 'text-primary' : 'text-foreground'}`}>
                {formatTimeShort(focusTime)}
              </span>
            </div>
          </div>
          <button
            onClick={toggleTimer}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              isActive 
                ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' 
                : 'bg-primary text-primary-foreground hover:opacity-90 shadow-glow'
            }`}
          >
            {isActive ? "Pause" : "Start"}
          </button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex items-start justify-between">
        {/* Left side - Greeting */}
        <div className="flex flex-col gap-1">
          <p className="text-primary font-semibold text-xs tracking-[0.2em] uppercase">
            TODAY • {getFormattedDate()}
          </p>
          <h2 className="text-foreground text-3xl font-bold leading-tight tracking-tight">
            {getGreeting()}, {getUserDisplayName()}
          </h2>
        </div>
        
        {/* Right side - controls */}
        <div className="flex items-center gap-3">
          {/* Focus timer */}
          <div className="flex items-center gap-3 bg-card/60 px-4 py-2 rounded-xl border border-border/50 shadow-soft">
            <Clock className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground leading-none">Focus Time</span>
              <span className="text-sm font-bold text-foreground leading-none mt-0.5">{formatTime(focusTime)}</span>
            </div>
            <button
              onClick={toggleTimer}
              className={`ml-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-opacity ${
                isActive 
                  ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' 
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {isActive ? "Pause" : "Start"}
            </button>
          </div>
          
          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="outline-none">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground cursor-pointer">
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
      </div>
    </header>
  );
}
