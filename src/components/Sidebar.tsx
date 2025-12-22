import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Shield, CheckSquare, Sparkles, Settings } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Social Blocker", href: "/blocker", icon: Shield },
  { name: "Task Reminders", href: "/tasks", icon: CheckSquare },
  { name: "Motivation", href: "/motivation", icon: Sparkles },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Omit</h1>
            <p className="text-xs text-muted-foreground">Stay productive</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
            activeClassName="bg-secondary text-primary font-medium"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="bg-gradient-card rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-1">Pro Tip</p>
          <p className="text-xs text-muted-foreground">
            Set daily focus goals to track your productivity!
          </p>
        </div>
      </div>
    </aside>
  );
}
