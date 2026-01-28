import { useState, useRef, useEffect } from "react";
import { Task } from "@/lib/storage";

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'completed' | 'createdAt'>) => void;
}

export default function QuickAddTaskModal({ isOpen, onClose, onAddTask }: QuickAddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedDateOption, setSelectedDateOption] = useState<'today' | 'tomorrow' | 'next_week' | 'custom'>('today');
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
    const now = new Date();
    if (option === 'today') {
      return now.toISOString().split('T')[0];
    } else if (option === 'tomorrow') {
      now.setDate(now.getDate() + 1);
      return now.toISOString().split('T')[0];
    } else if (option === 'next_week') {
      now.setDate(now.getDate() + 7);
      return now.toISOString().split('T')[0];
    } else if (option === 'custom' && customDate) {
      return customDate;
    }
    return now.toISOString().split('T')[0];
  };

  const getDisplayLabel = () => {
    if (selectedDateOption === 'today') return 'Today';
    if (selectedDateOption === 'tomorrow') return 'Tomorrow';
    if (selectedDateOption === 'next_week') return 'Next Week';
    if (selectedDateOption === 'custom' && customDate) {
      const date = new Date(customDate);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return 'Today';
  };

  const handleDateOptionSelect = (option: 'today' | 'tomorrow' | 'next_week') => {
    setSelectedDateOption(option);
    setCustomDate('');
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
    setCustomDate('');
    setPriority('medium');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred Background */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-40 pointer-events-none">
        <div className="p-8">
          <div className="h-8 w-32 bg-primary/20 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-24 w-full bg-primary/10 rounded-xl"></div>
            <div className="h-24 w-full bg-primary/10 rounded-xl"></div>
            <div className="h-24 w-full bg-primary/10 rounded-xl"></div>
          </div>
        </div>
      </div>

      {/* Modal Overlay Backdrop */}
      <div 
        className="absolute inset-0 z-10 bg-black/60"
        onClick={onClose}
      ></div>

      {/* Main Content Container */}
      <div className="relative z-20 w-full max-w-[390px] px-6 flex flex-col items-center">
        {/* Header / Dismiss Area */}
        <div className="w-full flex justify-between items-center mb-10 px-2">
          <button 
            onClick={onClose}
            className="flex items-center justify-center size-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-white/70">close</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary animate-pulse"></span>
            <p className="text-sm font-bold tracking-widest uppercase text-white/50">Focus Mode</p>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Central Input Card */}
        <div className="w-full bg-card rounded-xl shadow-[0px_20px_50px_rgba(0,0,0,0.5)] border border-border">
          {/* Headline Text & Input */}
          <div className="p-6">
            <h1 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-4">Quick Add Task</h1>
            <div className="flex flex-col gap-4">
              <textarea 
                autoFocus
                className="w-full p-0 bg-transparent border-none focus:ring-0 focus:outline-none text-2xl font-semibold placeholder:text-foreground/20 text-foreground resize-none min-h-[120px]" 
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
              ></textarea>
            </div>
          </div>

          {/* Metadata Chips Row */}
          <div className="flex gap-2 px-6 pb-6 overflow-x-auto no-scrollbar">
            {/* Date Picker Button with Dropdown */}
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg border pl-2 pr-4 cursor-pointer transition-colors ${
                  selectedDateOption !== 'today' || showDatePicker
                    ? 'bg-primary/20 border-primary/30 text-primary' 
                    : 'bg-primary/20 border-primary/30 text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <p className="text-foreground/80 text-xs font-semibold">{getDisplayLabel()}</p>
                <span className="material-symbols-outlined text-[14px] text-foreground/40">expand_more</span>
              </button>
            </div>

            <button
              onClick={() => setPriority(priority === 'high' ? 'medium' : 'high')}
              className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg border pl-2 pr-4 cursor-pointer transition-colors ${
                priority === 'high' 
                  ? 'bg-amber-500/20 border-amber-500/30' 
                  : 'bg-foreground/5 border-foreground/10 hover:bg-foreground/10'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${priority === 'high' ? 'text-amber-500' : 'text-foreground/40'}`}>flag</span>
              <p className="text-foreground/80 text-xs font-semibold">Priority</p>
            </button>
            <div className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-foreground/5 border border-foreground/10 pl-2 pr-4">
              <span className="material-symbols-outlined text-[18px] text-foreground/40">folder</span>
              <p className="text-foreground/80 text-xs font-semibold">Inbox</p>
            </div>
          </div>

          {/* Bottom Action Button */}
          <div className="px-6 py-4 bg-black/20 flex items-center justify-between">
            <p className="text-[10px] text-foreground/30 uppercase tracking-tighter">Press ⌘+Enter to save</p>
            <button 
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-lg h-10 px-6 bg-primary text-white text-sm font-bold tracking-wide shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Save Task</span>
            </button>
          </div>
        </div>

        {/* Help/Indicator Text below card */}
        <div className="mt-8 flex flex-col items-center gap-4 opacity-50">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-white">Deep Work OS v1.0</p>
        </div>
      </div>

      {/* Date Picker Dropdown - Fixed overlay */}
      {showDatePicker && (
        <div 
          ref={datePickerRef}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-card border border-border rounded-xl shadow-2xl z-[60] overflow-hidden"
        >
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Select Date</h3>
            <input
              type="date"
              value={customDate}
              onChange={handleCustomDateChange}
              className="w-full px-3 py-2 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="p-2 space-y-1">
            <button
              onClick={() => handleDateOptionSelect('today')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                selectedDateOption === 'today' ? 'bg-primary/20 text-primary' : 'hover:bg-foreground/5'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">today</span>
              <span className="text-sm font-medium">Today</span>
            </button>
            <button
              onClick={() => handleDateOptionSelect('tomorrow')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                selectedDateOption === 'tomorrow' ? 'bg-primary/20 text-primary' : 'hover:bg-foreground/5'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">event</span>
              <span className="text-sm font-medium">Tomorrow</span>
            </button>
            <button
              onClick={() => handleDateOptionSelect('next_week')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                selectedDateOption === 'next_week' ? 'bg-primary/20 text-primary' : 'hover:bg-foreground/5'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">date_range</span>
              <span className="text-sm font-medium">Next Week</span>
            </button>
          </div>
        </div>
      )}

      {/* iOS Home Indicator */}
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/20 rounded-full z-50"></div>
    </div>
  );
}
