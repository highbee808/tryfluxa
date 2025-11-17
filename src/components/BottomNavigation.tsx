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
    <div className="fixed bottom-0 left-0 right-0 glass border-t border-glass-border-light z-50">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto px-4">
        {navItems.map(({ icon: Icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center transition-all",
                "outline-none focus:outline-none focus-visible:outline-none",
                "bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent focus-visible:bg-transparent",
                "border-none focus:border-none focus-visible:border-none",
                isActive
                  ? "glass-light text-primary hover-glow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
