import { Home, Newspaper, Radio, Library, Moon, Sun, Sparkles } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/hooks/useDarkMode";

const navItems = [
  { icon: Home, label: "Home", path: "/feed", id: "home" },
  { icon: Sparkles, label: "Fluxa", path: "/fluxa-mode", id: "fluxa-mode" },
];

export const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <>
      {/* Desktop Header */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/feed")}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
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
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-accent transition-colors"
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div 
          className="flex items-center justify-center h-20 px-6 gap-6"
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
                  "flex flex-col items-center justify-center gap-1.5 transition-all duration-300 px-6 py-2 rounded-2xl min-w-[80px]",
                  isActive && "scale-105"
                )}
                aria-label={item.label}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                  isActive ? "bg-blue-600/20" : "bg-transparent"
                )}>
                  <Icon 
                    className={cn(
                      "w-6 h-6 transition-all duration-300",
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
          
          {/* Dark Mode Toggle on Mobile */}
          <button
            onClick={toggleDarkMode}
            className="flex flex-col items-center justify-center gap-1.5 transition-all duration-300 px-6 py-2 rounded-2xl min-w-[80px]"
            aria-label="Toggle dark mode"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-transparent">
              {isDark ? (
                <Sun className="w-6 h-6 text-muted-foreground" />
              ) : (
                <Moon className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {isDark ? "Light" : "Dark"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
