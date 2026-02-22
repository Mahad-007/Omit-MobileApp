import React from 'react';
import { Smartphone, Shield, Plus, Ban, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlockedApp } from '@/lib/storage';

interface UnifiedAppShieldProps {
  activeApps: (BlockedApp | { appName: string; packageName: string; icon?: string; blockMode: string })[];
  onManageClick: () => void;
  className?: string;
}

const triggerHaptic = (style: "light" | "medium" | "heavy" = "light") => {
  if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
    const pattern = style === "heavy" ? [40] : style === "medium" ? [25] : [15];
    window.navigator.vibrate(pattern);
  }
};

export const UnifiedAppShield: React.FC<UnifiedAppShieldProps> = ({ activeApps, onManageClick, className }) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
           <Shield className="w-4 h-4 text-primary" />
           <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">Active Perimeter</h3>
        </div>
        <button 
          onClick={() => {
            triggerHaptic("medium");
            onManageClick();
          }}
          className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-all active:scale-90"
        >
          Manage
        </button>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3.5 px-1">
        {activeApps.map((app, index) => {
          const isAndroid = 'packageName' in app;
          // const isWeb = 'url' in app;
          const icon = isAndroid ? app.icon : (app as BlockedApp).icon;
          const name = isAndroid ? app.appName : (app as BlockedApp).name;
          const blockMode = app.blockMode;

          return (
            <div 
              key={isAndroid ? app.packageName : (app as BlockedApp).id} 
              className="flex flex-col items-center gap-2 animate-scale-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="relative group">
                <div 
                   onClick={() => triggerHaptic("light")}
                   className={cn(
                    "size-14 rounded-[22px] bg-card border border-white/10 flex items-center justify-center shadow-xl transition-all duration-500 group-hover:scale-110 active:scale-90 overflow-hidden relative",
                    "bg-shield-gradient shadow-android-elevated"
                )}>
                  <div className="absolute inset-0 animate-shimmer-fast opacity-30 pointer-events-none" />
                  
                  {icon ? (
                    <img 
                      src={icon.startsWith('data:') ? icon : isAndroid ? `data:image/png;base64,${icon}` : icon} 
                      alt={name} 
                      className="size-8 object-contain relative z-10 transition-transform duration-500 group-hover:rotate-6" 
                    />
                  ) : (
                    isAndroid ? <Smartphone className="w-6 h-6 text-muted-foreground relative z-10" /> : <Globe className="w-6 h-6 text-muted-foreground relative z-10" />
                  )}

                  {/* Status Indicator */}
                  <div className={cn(
                    "absolute -top-1 -right-1 size-5 rounded-full border-[3px] border-background flex items-center justify-center shadow-lg z-20",
                    blockMode === 'persistent' || blockMode === 'always' ? "bg-destructive shadow-destructive/20" : "bg-amber-400 shadow-amber-400/20"
                  )}>
                    {blockMode === 'persistent' || blockMode === 'always' ? (
                        <Ban className="w-2 h-2 text-white stroke-[5px]" />
                    ) : (
                        <div className="size-1.5 rounded-full bg-white shadow-inner" />
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-center truncate w-full px-1 opacity-50">{name}</span>
            </div>
          );
        })}

        {/* Add Button */}
        <button 
          onClick={() => {
            triggerHaptic("medium");
            onManageClick();
          }}
          className="flex flex-col items-center gap-2 group"
        >
          <div className="size-14 rounded-[22px] border-2 border-dashed border-muted-foreground/20 flex items-center justify-center transition-all group-hover:border-primary/50 group-hover:bg-primary/10 group-active:scale-90 shadow-sm">
            <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider text-center opacity-40 group-hover:opacity-100 transition-opacity">Expand</span>
        </button>
      </div>

      {activeApps.length === 0 && (
        <div className="py-8 text-center bg-muted/20 rounded-[24px] border border-dashed border-muted-foreground/10">
           <p className="text-xs text-muted-foreground">No active shields. Add apps to start blocking.</p>
        </div>
      )}
    </div>
  );
};
