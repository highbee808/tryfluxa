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
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors",
                "outline-none focus:outline-none focus-visible:outline-none",
                "bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent focus-visible:bg-transparent",
                "border-none focus:border-none focus-visible:border-none",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all",
                  isActive && "scale-110"
                )}
              />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
