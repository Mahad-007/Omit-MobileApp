import { useState, useEffect } from "react";
import { storage, DailyStats } from "@/lib/storage";

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
    }
  }, [isOpen, currentDate]);

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
    return `${h}h ${m}m`;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button 
            onClick={() => navigateMonth(-1)}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <span className="material-symbols-outlined text-muted-foreground">chevron_left</span>
          </button>
          <h3 className="text-lg font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button 
            onClick={() => navigateMonth(1)}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <span className="material-symbols-outlined text-muted-foreground">chevron_right</span>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4 flex-1 overflow-auto">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-muted-foreground uppercase">
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
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all
                    ${!day.isCurrentMonth ? 'text-muted-foreground/40' : ''}
                    ${day.isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                    ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                    ${hasData && !isSelected ? 'bg-primary/10' : ''}
                  `}
                >
                  <span className="font-medium">{day.date.getDate()}</span>
                  {hasData && (
                    <div className="flex gap-0.5 mt-0.5">
                      {day.savedHours > 0 && <span className="size-1 rounded-full bg-emerald-400"></span>}
                      {day.wastedHours > 0 && <span className="size-1 rounded-full bg-red-400"></span>}
                      {day.tasksCompleted > 0 && <span className="size-1 rounded-full bg-primary"></span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        {selectedDay && (
          <div className="p-4 border-t border-border bg-muted/30">
            <h4 className="font-bold mb-3">
              {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
                <span className="material-symbols-outlined text-emerald-400 text-lg">schedule</span>
                <p className="text-xs text-muted-foreground mt-1">Saved</p>
                <p className="font-bold text-emerald-400">{formatTime(selectedDay.savedHours)}</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                <span className="material-symbols-outlined text-red-400 text-lg">hourglass_empty</span>
                <p className="text-xs text-muted-foreground mt-1">Wasted</p>
                <p className="font-bold text-red-400">{formatTime(selectedDay.wastedHours)}</p>
              </div>
              <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg text-center">
                <span className="material-symbols-outlined text-primary text-lg">task_alt</span>
                <p className="text-xs text-muted-foreground mt-1">Tasks</p>
                <p className="font-bold text-primary">{selectedDay.tasksCompleted}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-400"></span> Saved
            </div>
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-red-400"></span> Wasted
            </div>
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary"></span> Tasks
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-muted hover:bg-muted/80 text-foreground font-medium rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
