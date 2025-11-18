import { Home, Radio, Trophy, Search, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, path: "/feed" },
    { icon: Radio, path: "/fanbase-hub" },
    { icon: Trophy, path: "/sports-hub" },
    { icon: Search, path: "/universe" },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
      <div className="glass-strong rounded-full border border-glass-border-light shadow-md px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-5">
          {navItems.map(({ icon: Icon, path }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
                  "outline-none focus:outline-none focus-visible:outline-none",
                  "border-none focus:border-none focus-visible:border-none",
                  "hover:scale-105 active:scale-95",
                  isActive
                    ? "glass-light text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:glass-light"
                )}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
