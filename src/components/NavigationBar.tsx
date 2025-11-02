import { Home, Newspaper, Radio, Library, Search } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/feed", id: "home" },
  { icon: Newspaper, label: "New", path: "/feed", id: "new" },
  { icon: Radio, label: "Live", path: "/live", id: "live" },
  { icon: Library, label: "Universe", path: "/universe", id: "universe" },
  { icon: Search, label: "Search", path: "/feed", id: "search" },
];

export const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 md:top-8 md:bottom-auto animate-fade-in">
      <div 
        className="flex items-center gap-1 px-5 py-4 rounded-full transition-all duration-500"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1.5px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)"
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "p-3.5 rounded-full transition-all duration-400 hover:scale-115 active:scale-95",
                isActive && "bg-gradient-to-br from-[hsl(var(--coral-active))] to-[hsl(var(--coral-glow))] scale-105"
              )}
              style={isActive ? { 
                boxShadow: "var(--shadow-glow)",
                transform: "scale(1.05)"
              } : {}}
              aria-label={item.label}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-all duration-300",
                  isActive ? "text-white" : "text-muted-foreground hover:text-foreground"
                )} 
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
