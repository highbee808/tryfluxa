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
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:top-6 md:bottom-auto">
      <div 
        className="flex items-center gap-2 px-4 py-3 rounded-full"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-soft)"
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
                "p-3 rounded-full transition-all duration-300 hover:scale-110",
                isActive && "bg-gradient-to-br from-[hsl(var(--coral-active))] to-[hsl(var(--coral-glow))]"
              )}
              style={isActive ? { boxShadow: "var(--shadow-glow)" } : {}}
              aria-label={item.label}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-white" : "text-muted-foreground"
                )} 
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
