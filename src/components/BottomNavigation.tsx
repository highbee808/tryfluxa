import { Home, Radio, Trophy, Search, Music } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, path: "/feed" },
    { icon: Radio, path: "/fanbase-hub" },
    { icon: Trophy, path: "/sports-hub" },
    { icon: Music, path: "/music" },
    { icon: Search, path: "/universe" },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] md:hidden w-full max-w-sm px-4">
      <div className="glass-strong rounded-full border border-glass-border-light shadow-md px-6 py-3 backdrop-blur-xl flex justify-between items-center relative z-[9999]">
        {navItems.map(({ icon: Icon, path }) => {
          const isActive = location.pathname === path || (path === "/music" && location.pathname.startsWith("/music"));

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{ WebkitTapHighlightColor: "transparent" }}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
                "outline-none focus:outline-none focus-visible:outline-none",
                "border-none focus:border-none focus-visible:border-none",
                "hover:scale-105 active:scale-95",
                isActive
                  ? "glass-light text-primary shadow-sm"
                  : "text-foreground/80 hover:text-primary hover:glass-light"
              )}
            >
              <Icon className="w-6 h-6" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
