import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Radio, Trophy, Search, User, Settings, Bookmark } from "lucide-react";

const navMenuItems = [
  { label: "Feed", icon: Home, path: "/feed" },
  { label: "Fanbase", icon: Radio, path: "/fanbase-hub" },
  { label: "Sports", icon: Trophy, path: "/sports-hub" },
  { label: "Explore", icon: Search, path: "/universe" },
];

const quickLinks = [
  { label: "Profile", icon: User, path: "/profile" },
  { label: "Settings", icon: Settings, path: "/settings" },
  { label: "Bookmarks", icon: Bookmark, path: "/feed?tab=bookmarks" },
];

export const DesktopNavigationWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleQuickLink = (path: string) => {
    if (path === "/feed?tab=bookmarks") {
      navigate("/feed", { state: { tab: "bookmarks" } });
      return;
    }

    navigate(path);
  };

  return (
    <div className="hidden lg:flex flex-col gap-6 sticky top-24 self-start">
      <Card className="glass rounded-3xl border-glass-border-light">
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-14 h-14">
              <AvatarImage
                src="https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=200&q=80"
                alt="Profile"
              />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="text-lg font-semibold">Aileen Imagine</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {["Posts", "Followers", "Following"].map((label, idx) => (
              <div key={label} className="rounded-2xl glass-light py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-base font-semibold">{[247, "8.2k", 982][idx]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-light rounded-3xl border-glass-border-light">
        <CardContent className="p-4 space-y-1">
          {navMenuItems.map(({ label, icon: Icon, path }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={label}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-primary/30"
                    : "hover:bg-secondary/60"
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive ? "glass-strong shadow-glass-glow" : "glass"
                }`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-sm font-medium">{label}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="glass-light rounded-3xl border-glass-border-light">
        <CardContent className="p-4 space-y-1">
          {quickLinks.map(({ label, icon: Icon, path }) => (
            <button
              key={label}
              onClick={() => handleQuickLink(path)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors hover:bg-secondary/60"
            >
              <span className="w-8 h-8 rounded-full glass flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
