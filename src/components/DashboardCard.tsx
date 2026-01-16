import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  value?: string | number;
  trend?: string;
  children?: ReactNode;
  gradient?: boolean;
  className?: string;
}

export function DashboardCard({
  title,
  description,
  icon: Icon,
  value,
  trend,
  children,
  gradient = false,
  className = "",
}: DashboardCardProps) {
  return (
    <div
      className={`rounded-xl p-4 sm:p-6 border border-border/50 shadow-zen hover:shadow-lg transition-all duration-300 ${
        gradient ? "bg-gradient-card" : "bg-card"
      } ${className}`}
    >
      {(Icon || title) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {Icon && (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">{title}</h3>
              {description && <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          {value && (
            <div className="text-right">
              <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
              {trend && <p className="text-[10px] sm:text-xs text-success font-medium">{trend}</p>}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
