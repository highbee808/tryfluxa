import { Home, Radio, Trophy, Search, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, path: "/feed", label: "Home" },
    { icon: Radio, path: "/fanbase-hub", label: "Radio" },
    { icon: Trophy, path: "/sports-hub", label: "Sports" },
    { icon: Search, path: "/universe", label: "Explore" },
  ];

  return (
    <div className="ios-tabbar">
      <div className="ios-tabbar-inner">
        {navItems.map(({ icon: Icon, path, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{ WebkitTapHighlightColor: "transparent" }}
              className={cn("ios-tab-button", isActive && "ios-tab-button-active")}
              aria-label={label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[0.7rem] font-semibold tracking-wide">{label}</span>
              <span className="ios-tab-indicator" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
