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
    { icon: User, path: "/profile" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-strong rounded-full border border-glass-border-light shadow-glass-glow px-8 py-4">
        <div className="flex items-center gap-8">
          {navItems.map(({ icon: Icon, path }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  "outline-none focus:outline-none focus-visible:outline-none",
                  "border-none focus:border-none focus-visible:border-none",
                  "hover:scale-110 active:scale-95",
                  isActive
                    ? "glass-light text-primary hover-glow shadow-glass"
                    : "text-muted-foreground hover:text-foreground hover:glass-light"
                )}
              >
                <Icon className="w-6 h-6" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
