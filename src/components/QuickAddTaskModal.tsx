import { useState, useRef, useEffect } from "react";
import { Task } from "@/lib/storage";
import { cn } from "@/lib/utils";
interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'completed' | 'createdAt'>) => void;
}

export default function QuickAddTaskModal({ isOpen, onClose, onAddTask }: QuickAddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [selectedDateOption, setSelectedDateOption] = useState<'today' | 'tomorrow' | 'next_week' | 'custom'>('today');
  
  const getTodayLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [customDate, setCustomDate] = useState<string>(getTodayLocalDate());
  const [customTime, setCustomTime] = useState<string>('09:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const getDateString = (option: 'today' | 'tomorrow' | 'next_week' | 'custom') => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const getTimezoneOffset = () => {
      const date = new Date();
      const offset = -date.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
      const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
      return `${sign}${hours}:${minutes}`;
    };

    const now = new Date();
    const tz = getTimezoneOffset();

    if (option === 'today') {
      return formatDate(now) + 'T09:00:00' + tz;
    } else if (option === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return formatDate(tomorrow) + 'T09:00:00' + tz;
    } else if (option === 'next_week') {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return formatDate(nextWeek) + 'T09:00:00' + tz;
    } else if (option === 'custom') {
      // Use customDate if set, otherwise fallback to today
      const datePart = customDate || formatDate(now);
      return `${datePart}T${customTime || '09:00'}:00${tz}`;
    }
    
    // Final fallback should still be a valid local ISO string format
    const timePart = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':00';
    return formatDate(now) + 'T' + timePart + tz;
  };

  const getDisplayLabel = () => {
    if (selectedDateOption === 'today') return 'Today';
    if (selectedDateOption === 'tomorrow') return 'Tomorrow';
    if (selectedDateOption === 'next_week') return 'Next Week';
    if (selectedDateOption === 'custom' && customDate) {
      const date = new Date(customDate);
      const timeStr = customTime ? ` at ${customTime}` : '';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + timeStr;
    }
    return 'Today';
  };

  const handleDateOptionSelect = (option: 'today' | 'tomorrow' | 'next_week') => {
    setSelectedDateOption(option);
    // Reset custom date to today when switching back to quick options
    setCustomDate(getTodayLocalDate());
    setShowDatePicker(false);
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDate(e.target.value);
    setSelectedDateOption('custom');
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const dueDateStr = getDateString(selectedDateOption);

    onAddTask({
      title: title.trim(),
      description: '',
      dueDate: dueDateStr,
      priority
    });

    setTitle('');
    setSelectedDateOption('today');
    setCustomDate(getTodayLocalDate());
    setCustomTime('09:00');
    setPriority('medium');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* atmospheric Background Blobs - More vibrant and dynamic */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] -left-20 w-[400px] h-[400px] bg-primary/30 rounded-full blur-[100px] animate-aurora opacity-60"></div>
        <div className="absolute bottom-[20%] -right-20 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] animate-aurora opacity-40" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-mesh opacity-20"></div>
      </div>

      {/* Modal Overlay Backdrop */}
      <div 
        className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm transition-all duration-500"
        onClick={onClose}
      ></div>

      {/* Main Content Container */}
      <div className="relative z-20 w-full max-w-[360px] flex flex-col items-center animate-in zoom-in-95 fade-in duration-500">
        {/* Header / Dismiss Area */}
        <div className="w-full flex justify-between items-center mb-4 px-2">
          <button 
            onClick={onClose}
            className="flex items-center justify-center size-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 shadow-xl backdrop-blur-xl transition-all active:scale-90 group"
          >
            <span className="material-symbols-outlined text-white text-[20px] group-hover:rotate-90 transition-transform duration-300">close</span>
          </button>
          <div className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
            <span className="size-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary))]"></span>
            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-white/80 font-display">New Focus Task</p>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Central Input Card - Enhanced Glassmorphism */}
        <div className="w-full bg-slate-900/40 backdrop-blur-[40px] rounded-[2rem] shadow-[0px_40px_100px_rgba(0,0,0,0.8)] border border-white/15 overflow-hidden ring-1 ring-inset ring-white/10">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-purple-500/5 pointer-events-none" />
          
          {/* Headline Text & Input */}
          <div className="p-6 pt-8 pb-2 relative">
            <h1 className="text-primary/80 text-[9px] font-black uppercase tracking-[0.25em] mb-4 font-display">Task Definition</h1>
            <div className="flex flex-col gap-2">
              <textarea 
                autoFocus
                className="w-full p-0 bg-transparent border-none focus:ring-0 focus:outline-none text-2xl font-extrabold placeholder:text-white/10 text-white resize-none min-h-[100px] leading-[1.15] font-display selection:bg-primary/30" 
                placeholder="Declare your focus..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
              ></textarea>
            </div>
          </div>

          {/* Metadata Chips Row - Integrated and high contrast */}
          <div className="flex gap-2 px-6 pb-6 overflow-x-auto no-scrollbar relative">
            {/* Date Picker Button */}
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={cn(
                  "flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-xl border px-3 cursor-pointer transition-all active:scale-95 shadow-md",
                  selectedDateOption !== 'today' 
                    ? 'bg-primary text-white border-primary shadow-primary/20' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/90'
                )}
              >
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                <p className="text-[10px] font-bold uppercase tracking-wider">{getDisplayLabel()}</p>
                <span className="material-symbols-outlined text-[12px] opacity-60">expand_more</span>
              </button>
            </div>

            <button
              onClick={() => setPriority(priority === 'high' ? 'medium' : 'high')}
              className={cn(
                "flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-xl border px-3 cursor-pointer transition-all active:scale-95 shadow-md",
                priority === 'high' 
                  ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/20' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/90'
              )}
            >
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: priority === 'high' ? "'FILL' 1" : "" }}>flag</span>
              <p className="text-[10px] font-bold uppercase tracking-wider">Priority</p>
            </button>
            
            <div className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-white/5 border border-white/10 px-3 text-white/40 shadow-sm">
              <span className="material-symbols-outlined text-[16px]">folder</span>
              <p className="text-[10px] font-bold uppercase tracking-wider">Inbox</p>
            </div>
          </div>

          {/* Bottom Action Button - Vibrant Gradient & Glow */}
          <div className="px-6 py-5 bg-black/40 flex items-center justify-end border-t border-white/5">
            <button 
              onClick={handleSubmit}
              disabled={!title.trim()}
              className={cn(
                "flex min-w-[140px] cursor-pointer items-center justify-center rounded-[1rem] h-11 px-8 font-black tracking-[0.15em] uppercase text-[11px] shadow-2xl transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed text-white",
                title.trim() ? "hover:shadow-primary/40 hover:scale-[1.02] shadow-primary/25" : ""
              )}
              style={{ background: title.trim() ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)' }}
            >
              <span>Create Task</span>
            </button>
          </div>
        </div>

      </div>

      {/* Date Picker Dropdown - Fixed overlay with premium styling */}
      {showDatePicker && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm" onClick={() => setShowDatePicker(false)}></div>
          <div 
            ref={datePickerRef}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] bg-slate-900/90 backdrop-blur-[50px] border border-white/20 rounded-[2rem] shadow-[0px_50px_100px_rgba(0,0,0,0.7)] z-[60] overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/10"
          >
            <div className="p-6 border-b border-white/10 space-y-4">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Chronos Selection</h3>
              <div className="flex flex-col gap-3">
                <div className="relative group">
                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-1.5 ml-1">Date</p>
                    <input
                      type="date"
                      value={customDate}
                      onChange={handleCustomDateChange}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                      style={{ colorScheme: 'dark' }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-primary scale-x-0 group-focus-within:scale-x-100 transition-transform origin-center"></div>
                </div>

                <div className="relative group">
                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-1.5 ml-1">Time</p>
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => {
                        setCustomTime(e.target.value);
                        setSelectedDateOption('custom');
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                      style={{ colorScheme: 'dark' }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-primary scale-x-0 group-focus-within:scale-x-100 transition-transform origin-center"></div>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-1">
              {[
                { id: 'today', label: 'Today', icon: 'today' },
                { id: 'tomorrow', label: 'Tomorrow', icon: 'event' },
                { id: 'next_week', label: 'Next Week', icon: 'date_range' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleDateOptionSelect(opt.id as any)}
                  className={cn(
                    "w-full flex items-center gap-3 px-5 py-3 rounded-xl text-left transition-all active:scale-95 group",
                    selectedDateOption === opt.id ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'hover:bg-white/5 text-white/70 hover:text-white'
                  )}
                >
                  <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                  <span className="text-xs font-black uppercase tracking-wider">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Android Home Indicator - Consistent with OS */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/15 rounded-full z-50"></div>
    </div>
  );
}
