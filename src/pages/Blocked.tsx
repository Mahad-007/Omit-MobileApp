import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { storage } from "@/lib/storage";

export default function Blocked() {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState({ minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateTimer = () => {
      const session = storage.getActiveSession();
      if (!session) {
        // No active session, redirect to home
        navigate('/');
        return;
      }

      const remaining = session.endTime - Date.now();
      if (remaining <= 0) {
        storage.endFocusSession();
        navigate('/');
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining({ minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleBackToWork = () => {
    navigate('/');
  };

  const handleNeedToUse = () => {
    // In strict mode, this should be disabled
    const settings = storage.getSettings();
    if (settings.strictMode) {
      return; // Can't bypass in strict mode
    }
    
    // End the session early
    storage.endFocusSession();
    window.postMessage({ type: 'OMIT_SYNC_REQUEST', payload: { focusMode: false } }, '*');
    navigate('/');
  };

  const settings = storage.getSettings();

  return (
    <div className="min-h-screen flex flex-col font-display overflow-hidden relative">
      {/* Background Content (Simulating the blocked app) */}
      <div className="absolute inset-0 z-0 p-6 flex flex-col gap-6 opacity-40">
        <div className="h-12 w-full bg-muted rounded-lg"></div>
        <div className="h-64 w-full bg-muted rounded-xl"></div>
        <div className="flex gap-4">
          <div className="h-20 w-1/2 bg-muted rounded-lg"></div>
          <div className="h-20 w-1/2 bg-muted rounded-lg"></div>
        </div>
        <div className="h-40 w-full bg-muted rounded-xl"></div>
      </div>

      {/* Overlay Container */}
      <div className="relative z-10 h-screen w-full flex flex-col items-center justify-between bg-background px-6 text-foreground safe-area-top safe-area-bottom">
        {/* Top Status/Icon */}
        <div className="pt-16 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6 border border-primary/30">
            <span className="material-symbols-outlined text-primary text-3xl">timer_off</span>
          </div>
          {/* HeadlineText */}
          <div className="max-w-xs mx-auto">
            <h2 className="text-foreground tracking-tight text-[24px] font-semibold leading-tight text-center">
              This app is blocked for your focus session.
            </h2>
            <p className="text-muted-foreground text-center text-sm mt-3 font-normal">
              Stay on track. You're almost there.
            </p>
          </div>
        </div>

        {/* Timer Component */}
        <div className="w-full max-w-[320px]">
          <div className="flex gap-4 py-8">
            {/* Minutes */}
            <div className="flex grow basis-0 flex-col items-stretch gap-3">
              <div className="flex h-24 grow items-center justify-center rounded-2xl px-3 bg-foreground/5 border border-foreground/10">
                <p className="text-foreground text-4xl font-bold leading-tight tracking-tight">
                  {timeRemaining.minutes.toString().padStart(2, '0')}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Minutes</p>
              </div>
            </div>
            {/* Divider */}
            <div className="flex items-center justify-center pt-2">
              <span className="text-foreground/20 text-4xl font-light mb-8">:</span>
            </div>
            {/* Seconds */}
            <div className="flex grow basis-0 flex-col items-stretch gap-3">
              <div className="flex h-24 grow items-center justify-center rounded-2xl px-3 bg-foreground/5 border border-foreground/10">
                <p className="text-foreground text-4xl font-bold leading-tight tracking-tight">
                  {timeRemaining.seconds.toString().padStart(2, '0')}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Seconds</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="w-full pb-16 flex flex-col items-center gap-6">
          <div className="flex w-full px-4 justify-center">
            <button 
              onClick={handleBackToWork}
              className="flex w-full max-w-[320px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-primary text-white text-lg font-bold leading-normal tracking-wide shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            >
              <span className="truncate">Back to Work</span>
            </button>
          </div>
          {/* Subtle Dismissal */}
          <button 
            onClick={handleNeedToUse}
            disabled={settings.strictMode}
            className={`text-sm font-medium transition-colors ${
              settings.strictMode 
                ? 'text-muted-foreground/30 cursor-not-allowed' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {settings.strictMode ? 'Strict mode enabled' : 'I really need to use this app'}
          </button>
        </div>
      </div>

      {/* Background decorative element */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
      </div>
    </div>
  );
}
