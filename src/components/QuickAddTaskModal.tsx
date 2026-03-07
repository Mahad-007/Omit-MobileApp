import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Task } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  X,
  Calendar,
  Flag,
  Sun,
  CalendarPlus,
  CalendarRange,
  ArrowRight,
  ChevronLeft,
  Check,
} from "lucide-react";

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'completed' | 'createdAt'>) => void;
}

type DateOption = 'today' | 'tomorrow' | 'next_week' | 'custom';
type Priority = 'low' | 'medium' | 'high';
type Screen = 'main' | 'date';

const DATE_OPTIONS = [
  { id: 'today'     as DateOption, label: 'Today',     sublabel: 'Get it done now',      icon: Sun },
  { id: 'tomorrow'  as DateOption, label: 'Tomorrow',  sublabel: 'Start fresh tomorrow', icon: CalendarPlus },
  { id: 'next_week' as DateOption, label: 'Next week', sublabel: 'Plan ahead',           icon: CalendarRange },
];

export default function QuickAddTaskModal({ isOpen, onClose, onAddTask }: QuickAddTaskModalProps) {
  const getTodayLocalDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const [screen, setScreen]                     = useState<Screen>('main');
  const [title, setTitle]                       = useState('');
  const [selectedDate, setSelectedDate]         = useState<DateOption>('today');
  const [customDate, setCustomDate]             = useState(getTodayLocalDate);
  const [customTime, setCustomTime]             = useState('09:00');
  const [priority, setPriority]                 = useState<Priority>('medium');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScreen('main');
      setTitle('');
      setSelectedDate('today');
      setCustomDate(getTodayLocalDate());
      setCustomTime('09:00');
      setPriority('medium');
      setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /* ── helpers ──────────────────────────────────────── */
  const getTimezoneOffset = () => {
    const offset = -new Date().getTimezoneOffset();
    const sign   = offset >= 0 ? '+' : '-';
    return `${sign}${String(Math.floor(Math.abs(offset) / 60)).padStart(2,'0')}:${String(Math.abs(offset) % 60).padStart(2,'0')}`;
  };

  const fmtDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const getDateString = (opt: DateOption) => {
    const now = new Date();
    const tz  = getTimezoneOffset();
    if (opt === 'today')     return fmtDate(now) + 'T09:00:00' + tz;
    if (opt === 'tomorrow')  { const d = new Date(now); d.setDate(d.getDate()+1); return fmtDate(d) + 'T09:00:00' + tz; }
    if (opt === 'next_week') { const d = new Date(now); d.setDate(d.getDate()+7); return fmtDate(d) + 'T09:00:00' + tz; }
    return `${customDate || fmtDate(now)}T${customTime || '09:00'}:00${tz}`;
  };

  const getDisplayLabel = () => {
    if (selectedDate === 'today')     return 'Today';
    if (selectedDate === 'tomorrow')  return 'Tomorrow';
    if (selectedDate === 'next_week') return 'Next week';
    if (selectedDate === 'custom' && customDate) {
      const d = new Date(customDate + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (customTime ? ` · ${customTime}` : '');
    }
    return 'Today';
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAddTask({ title: title.trim(), description: '', dueDate: getDateString(selectedDate), priority });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  const dateActive    = selectedDate !== 'today';
  const priorityHigh  = priority === 'high';

  /* ── shared sheet style ───────────────────────────── */
  // Always centered dialog on all screen sizes
  const sheetBase = [
    "fixed z-[201]",
    "bg-[hsl(240_12%_10%)]",
    "border border-white/[0.08]",
    "shadow-[0_24px_80px_rgba(0,0,0,0.8)]",
    "overflow-hidden",
    "rounded-[28px]",
  ].join(' ');

  const centeredStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '92%',
    maxWidth: '480px',
  };

  /* ── render ───────────────────────────────────────── */
  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className={sheetBase} style={centeredStyle}>

        {/* ── MAIN SCREEN ── */}
        {screen === 'main' && (
          <div>
            {/* Header row */}
            <div className="flex items-center justify-between px-5 pt-5 pb-1">
              <span className="text-[11px] font-black tracking-[0.25em] uppercase text-white/40">
                New task
              </span>
              <button
                onClick={onClose}
                className="size-9 flex items-center justify-center rounded-full bg-white/8 active:bg-white/15 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Textarea */}
            <div className="px-5 pt-2 pb-4">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent border-none outline-none resize-none text-[1.25rem] xs:text-[1.35rem] font-bold text-white placeholder:text-white/20 leading-snug min-h-[88px] selection:bg-primary/30"
                placeholder="What needs doing?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Chips row */}
            <div className="px-5 pb-4 flex gap-2 flex-wrap">
              {/* Date chip */}
              <button
                onClick={() => setScreen('date')}
                className={cn(
                  "flex items-center gap-1.5 h-9 px-4 rounded-full border text-[11px] font-bold tracking-wide transition-all active:scale-95",
                  dateActive
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-white/[0.07] border-white/10 text-white/60'
                )}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{getDisplayLabel()}</span>
              </button>

              {/* Priority chip */}
              <button
                onClick={() => setPriority(p => p === 'high' ? 'medium' : 'high')}
                className={cn(
                  "flex items-center gap-1.5 h-9 px-4 rounded-full border text-[11px] font-bold tracking-wide transition-all active:scale-95",
                  priorityHigh
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-white/[0.07] border-white/10 text-white/60'
                )}
              >
                <Flag className={cn("w-3.5 h-3.5 shrink-0", priorityHigh && "fill-current")} />
                <span>{priorityHigh ? 'High' : 'Priority'}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.07] mx-5" />

            {/* Footer / Submit */}
            <div className="px-5 pt-4 pb-5">
              <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className={cn(
                  "w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-[13px] tracking-[0.12em] uppercase transition-all active:scale-[0.98]",
                  title.trim()
                    ? "text-white shadow-lg shadow-primary/25"
                    : "opacity-25 cursor-not-allowed bg-white/10 text-white/60"
                )}
                style={title.trim() ? { background: 'var(--gradient-primary)' } : undefined}
              >
                <span>Add task</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── DATE SCREEN ── */}
        {screen === 'date' && (
          <div>
            {/* Header row */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3">
              <button
                onClick={() => setScreen('main')}
                className="size-9 flex items-center justify-center rounded-full bg-white/8 active:bg-white/15 transition-colors"
                aria-label="Back"
              >
                <ChevronLeft className="w-4 h-4 text-white/60" />
              </button>
              <span className="text-[11px] font-black tracking-[0.25em] uppercase text-white/40">
                Choose date
              </span>
            </div>

            {/* Quick options */}
            <div className="px-3 pb-2 space-y-1">
              {DATE_OPTIONS.map(opt => {
                const isActive = selectedDate === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => { setSelectedDate(opt.id); setScreen('main'); }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]",
                      isActive
                        ? 'bg-primary/15 border border-primary/30'
                        : 'border border-transparent hover:bg-white/5 active:bg-white/8'
                    )}
                  >
                    <div className={cn(
                      "size-10 rounded-xl flex items-center justify-center shrink-0",
                      isActive ? 'bg-primary text-white' : 'bg-white/8 text-white/50'
                    )}>
                      <opt.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-bold",
                        isActive ? 'text-primary' : 'text-white/90'
                      )}>{opt.label}</p>
                      <p className="text-[11px] text-white/35 font-medium">{opt.sublabel}</p>
                    </div>
                    {isActive && (
                      <div className="size-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom date + time */}
            <div className="mx-3 mb-3 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30 mb-3">Custom</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-white/40 ml-1">Date</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={e => { setCustomDate(e.target.value); setSelectedDate('custom'); }}
                    className="w-full h-11 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                    style={{ colorScheme: 'dark' }}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-white/40 ml-1">Time</span>
                  <input
                    type="time"
                    value={customTime}
                    onChange={e => { setCustomTime(e.target.value); setSelectedDate('custom'); }}
                    className="w-full h-11 px-3 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                    style={{ colorScheme: 'dark' }}
                  />
                </label>
              </div>
              {selectedDate === 'custom' && (
                <button
                  onClick={() => setScreen('main')}
                  className="mt-3 w-full h-11 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold tracking-wide active:scale-[0.98] transition-all"
                >
                  Confirm
                </button>
              )}
            </div>

            {/* Bottom spacer */}
            <div className="h-5" />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
