import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  value?: string | number;
  trend?: string;
  children?: ReactNode;
  gradient?: boolean;
}

export function DashboardCard({
  title,
  description,
  icon: Icon,
  value,
  trend,
  children,
  gradient = false,
}: DashboardCardProps) {
  return (
    <div
      className={`rounded-xl p-6 border border-border shadow-card hover:shadow-lg transition-all duration-300 ${
        gradient ? "bg-gradient-card" : "bg-card"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {value && (
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend && <p className="text-xs text-success">{trend}</p>}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
