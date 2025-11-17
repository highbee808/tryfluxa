import { Home, Radio, Trophy, Search, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/feed" },
    { icon: Radio, label: "Fanbase", path: "/fanbase-hub" },
    { icon: Trophy, label: "Sports", path: "/sports-hub" },
    { icon: Search, label: "Discover", path: "/universe" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
      <div className="glass-strong rounded-[32px] border border-glass-border-light shadow-glass-glow px-6 py-3">
        <div className="flex justify-around items-center gap-2">
          {navItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300",
                  "outline-none focus:outline-none focus-visible:outline-none",
                  "bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent focus-visible:bg-transparent",
                  "border-none focus:border-none focus-visible:border-none",
                  "hover:scale-105 active:scale-95",
                  isActive
                    ? "glass-light text-primary hover-glow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-6 h-6 transition-transform", isActive && "scale-110")} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
