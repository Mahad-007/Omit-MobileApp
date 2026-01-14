import { NavLink as RouterNavLink } from "react-router-dom";
import { LayoutDashboard, Shield, CheckSquare, Sparkles, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Blocker", href: "/blocker", icon: Shield },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Motivation", href: "/motivation", icon: Sparkles },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navigation.map((item) => (
          <RouterNavLink
            key={item.name}
            to={item.href}
            end={item.href === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-5 h-5 mb-1", isActive && "scale-110")} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </>
            )}
          </RouterNavLink>
        ))}
      </div>
    </nav>
  );
}
