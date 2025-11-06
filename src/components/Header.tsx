import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock } from "lucide-react";
import { useState, useEffect } from "react";

export function Header() {
  const [focusTime, setFocusTime] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setFocusTime((time) => time + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-gradient-card px-4 py-2 rounded-lg">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Focus Time</p>
            <p className="text-lg font-bold text-foreground">{formatTime(focusTime)}</p>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            className="ml-2 px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {isActive ? "Pause" : "Start"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">Welcome back!</p>
          <p className="text-xs text-muted-foreground">Let's stay focused today</p>
        </div>
        <Avatar>
          <AvatarFallback className="bg-gradient-primary text-white">U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
