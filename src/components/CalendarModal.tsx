import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Hourglass, 
  CheckCircle2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DayData {
  date: Date;
  dateStr: string;
  savedHours: number;
  wastedHours: number;
  tasksCompleted: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

// Helper function to get local date string (YYYY-MM-DD) without timezone issues
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarModal({ isOpen, onClose }: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [calendarDays, setCalendarDays] = useState<DayData[]>([]);

  useEffect(() => {
    if (isOpen) {
      generateCalendarDays();
      
      // Subscribe to updates so the calendar reflects real-time changes
      const unsubscribe = storage.onChange('stats', () => {
        generateCalendarDays();
      });
      return unsubscribe;
    }
  }, [isOpen, currentDate]);

  // Update selected day view when calendar days change (e.g. real-time update)
  useEffect(() => {
    if (selectedDay) {
      const updatedDay = calendarDays.find(d => d.dateStr === selectedDay.dateStr);
      if (updatedDay) {
        setSelectedDay(updatedDay);
      }
    }
  }, [calendarDays]);

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    let startOffset = firstDay.getDay() - 1; // Adjust for Monday start
    if (startOffset < 0) startOffset = 6;
    
    const days: DayData[] = [];
    const today = getLocalDateString(new Date());
    
    // Add days from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      const dateStr = getLocalDateString(date);
      const stats = storage.getStatsForDate(dateStr);
      days.push({
        date,
        dateStr,
        savedHours: stats.savedHours,
        wastedHours: stats.wastedHours,
        tasksCompleted: storage.getTasksCompletedOnDate(dateStr),
        isCurrentMonth: false,
        isToday: dateStr === today
      });
    }
    
    // Add days of current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = getLocalDateString(date);
      const stats = storage.getStatsForDate(dateStr);
      days.push({
        date,
        dateStr,
        savedHours: stats.savedHours,
        wastedHours: stats.wastedHours,
        tasksCompleted: storage.getTasksCompletedOnDate(dateStr),
        isCurrentMonth: true,
        isToday: dateStr === today
      });
    }
    
    // Add days from next month to fill the grid (6 rows * 7 = 42 days)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      const dateStr = getLocalDateString(date);
      const stats = storage.getStatsForDate(dateStr);
      days.push({
        date,
        dateStr,
        savedHours: stats.savedHours,
        wastedHours: stats.wastedHours,
        tasksCompleted: storage.getTasksCompletedOnDate(dateStr),
        isCurrentMonth: false,
        isToday: dateStr === today
      });
    }
    
    setCalendarDays(days);
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    setSelectedDay(null);
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 z-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-[340px] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
         {/* Top Gradient */}
         <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 relative z-10">
          <button 
            onClick={() => navigateMonth(-1)}
            className="size-8 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          
          <h3 className="text-sm font-black tracking-widest uppercase text-foreground font-display">
            {monthNames[currentDate.getMonth()]} <span className="text-primary">{currentDate.getFullYear()}</span>
          </h3>
          
          <button 
            onClick={() => navigateMonth(1)}
            className="size-8 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="px-4 pb-4 relative z-10">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const hasData = day.savedHours > 0 || day.wastedHours > 0 || day.tasksCompleted > 0;
              const isSelected = selectedDay?.dateStr === day.dateStr;
              
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all relative overflow-hidden group cursor-pointer h-9 w-full",
                    !day.isCurrentMonth ? 'text-muted-foreground/30' : 'text-foreground/90',
                    day.isToday && !isSelected ? 'border border-primary text-primary' : '',
                    isSelected ? 'bg-primary text-primary-foreground shadow-lg scale-105 z-10 border-none' : 'hover:bg-secondary/50',
                    hasData && !isSelected && !day.isToday ? 'bg-secondary/40' : ''
                  )}
                >
                  <span className="relative z-10 text-[11px]">{day.date.getDate()}</span>
                  
                  {/* Indicators - minimal dots */}
                  {hasData && (
                    <div className="flex gap-0.5 mt-0.5 relative z-10">
                      {day.savedHours > 0 && (
                        <span className={cn("size-0.5 rounded-full", isSelected ? "bg-white" : "bg-emerald-500")} />
                      )}
                      {day.wastedHours > 0 && (
                        <span className={cn("size-0.5 rounded-full", isSelected ? "bg-white" : "bg-red-500")} />
                      )}
                      {day.tasksCompleted > 0 && (
                         <span className={cn("size-0.5 rounded-full", isSelected ? "bg-white" : "bg-blue-500")} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="bg-secondary/30 border-t border-border backdrop-blur-sm relative z-20">
            {selectedDay ? (
            <div className="p-4 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">
                    {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h4>
                  <button onClick={() => setSelectedDay(null)} className="text-[10px] text-muted-foreground hover:text-foreground uppercase font-bold tracking-wider cursor-pointer">Close</button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-center">
                    <Clock className="w-3 h-3 text-emerald-500 mx-auto mb-1" />
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">Saved</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatTime(selectedDay.savedHours)}</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-center">
                    <Hourglass className="w-3 h-3 text-red-500 mx-auto mb-1" />
                     <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">Wasted</p>
                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{formatTime(selectedDay.wastedHours)}</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl text-center">
                    <CheckCircle2 className="w-3 h-3 text-blue-500 mx-auto mb-1" />
                     <p className="text-[8px] text-muted-foreground uppercase tracking-wider mb-0.5">Tasks</p>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{selectedDay.tasksCompleted}</p>
                  </div>
                </div>
            </div>
            ) : (
             <div className="p-3 flex items-center justify-between gap-2">
                 <div className="flex gap-3 px-2 overflow-x-auto no-scrollbar">
                     <div className="flex items-center gap-1.5 shrink-0">
                        <span className="size-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Saved</span>
                     </div>
                     <div className="flex items-center gap-1.5 shrink-0">
                        <span className="size-1.5 rounded-full bg-red-500"></span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Wasted</span>
                     </div>
                     <div className="flex items-center gap-1.5 shrink-0">
                        <span className="size-1.5 rounded-full bg-blue-500"></span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Tasks</span>
                     </div>
                 </div>
                 <button onClick={onClose} className="shrink-0 size-7 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors cursor-pointer">
                     <X className="w-3 h-3 text-foreground" />
                 </button>
             </div>
            )}
        </div>
      </div>
    </div>
  );
}
