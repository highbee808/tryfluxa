import { Home, Newspaper, Radio, Library, Moon, Sun, Sparkles, User, Bell } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/hooks/useDarkMode";
import { NotificationCenter } from "./NotificationCenter";
import { FluxaLogo } from "./FluxaLogo";

const navItems = [
  { icon: Home, label: "Home", path: "/feed", id: "home" },
  { icon: Sparkles, label: "Fluxa", path: "/fluxa-mode", id: "fluxa-mode" },
  { icon: User, label: "Profile", path: "/profile", id: "profile" },
];

export const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <>
      {/* Desktop Header */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-50 px-6 pt-4">
        <div className="container mx-auto">
          <div className="frosted-nav flex items-center justify-between gap-6 px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/feed")}>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <FluxaLogo size={20} fillColor="hsl(var(--primary-foreground))" />
            </div>
            <span className="font-bold text-xl">Fluxa</span>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate("/")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => navigate("/feed")}
              className={cn(
                "text-sm font-medium transition-colors",
                location.pathname === "/feed" ? "text-blue-600 font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Feed
            </button>
            <button
              onClick={() => navigate("/features")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <button
              onClick={toggleDarkMode}
              className="frosted-icon-button"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors px-4"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all hover-glow-strong shadow-lg"
            >
              Get Started
            </button>
          </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div 
          className="flex items-center justify-center h-20 px-4 gap-4"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid var(--glass-border)",
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
                  "flex flex-col items-center justify-center gap-1.5 transition-all duration-300 px-4 py-2 rounded-2xl flex-1",
                  isActive && "scale-105"
                )}
                aria-label={item.label}
              >
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300",
                  isActive ? "bg-blue-600/20" : "bg-transparent"
                )}>
                  <Icon 
                    className={cn(
                      "w-5 h-5 transition-all duration-300",
                      isActive ? "text-blue-600" : "text-muted-foreground"
                    )} 
                    style={isActive ? {
                      filter: "drop-shadow(0 0 8px hsl(221 83% 53% / 0.5))"
                    } : {}}
                  />
                </div>
                <span className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isActive ? "text-blue-600" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
          
          {/* Dark Mode Toggle on Mobile - More Visible */}
          <button
            onClick={toggleDarkMode}
            className="flex flex-col items-center justify-center gap-1.5 transition-all duration-300 px-4 py-2 rounded-2xl flex-1 hover:bg-secondary/50"
            aria-label="Toggle dark mode"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-secondary/30 hover:bg-secondary/50 transition-colors">
              {isDark ? (
                <Sun className="w-5 h-5 text-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-foreground" />
              )}
            </div>
            <span className="text-xs font-medium text-foreground whitespace-nowrap">
              {isDark ? "Light" : "Dark"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
