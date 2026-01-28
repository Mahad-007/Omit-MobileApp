import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CustomTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (minutes: number) => void;
  initialValue: number;
  title: string;
  unitLabel?: string;
}

export default function CustomTimeModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialValue, 
  title,
  unitLabel = "minutes"
}: CustomTimeModalProps) {
  const [value, setValue] = useState(initialValue.toString());

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue.toString());
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSave = () => {
    const num = parseInt(value);
    if (!isNaN(num) && num > 0) {
      onSave(num);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Modal Overlay Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border/50 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">Enter the {unitLabel} below.</p>
          </div>

          <div className="relative">
            <input 
              autoFocus
              type="number"
              className="w-full text-4xl font-bold bg-transparent border-none focus:ring-0 focus:outline-none text-foreground placeholder:text-foreground/10 text-center" 
              placeholder="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="mt-2 h-0.5 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <p className="text-center text-xs font-bold uppercase tracking-widest text-primary mt-4">{unitLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={onClose}
              className="h-12 rounded-2xl bg-muted text-muted-foreground font-bold text-sm transition-all active:scale-95 hover:bg-accent"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={!value || isNaN(parseInt(value)) || parseInt(value) <= 0}
              className="h-12 rounded-2xl font-bold text-sm text-white shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--gradient-primary)' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
