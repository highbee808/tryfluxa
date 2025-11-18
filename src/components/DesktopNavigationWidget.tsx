import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Radio, Trophy, Search, User as UserIcon, Settings, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const navMenuItems = [
  { label: "Feed", icon: Home, path: "/feed" },
  { label: "Fanbase", icon: Radio, path: "/fanbase-hub" },
  { label: "Sports", icon: Trophy, path: "/sports-hub" },
  { label: "Explore", icon: Search, path: "/universe" },
];

const quickLinks = [
  { label: "Profile", icon: UserIcon, path: "/profile" },
  { label: "Settings", icon: Settings, path: "/settings" },
  { label: "Bookmarks", icon: Bookmark, path: "/feed?tab=bookmarks" },
];

export const DesktopNavigationWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          if (isMounted) setIsLoading(false);
          return;
        }

        if (!isMounted) return;

        setAuthUser(data.user);

        const profilePromise = supabase
          .from("profiles")
          .select("*")
          .eq("user_id", data.user.id)
          .maybeSingle();

        const followersPromise = supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", data.user.id);

        const followingPromise = supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", data.user.id);

        const postsPromise = supabase
          .from("fan_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", data.user.id);

        const [
          profileResponse,
          followersResponse,
          followingResponse,
          postsResponse,
        ] = await Promise.all([
          profilePromise,
          followersPromise,
          followingPromise,
          postsPromise,
        ]);

        if (!isMounted) return;

        if (profileResponse.error) throw profileResponse.error;
        if (followersResponse.error) throw followersResponse.error;
        if (followingResponse.error) throw followingResponse.error;
        if (postsResponse.error) throw postsResponse.error;

        setProfile(profileResponse.data);
        setStats({
          posts: postsResponse.count || 0,
          followers: followersResponse.count || 0,
          following: followingResponse.count || 0,
        });
      } catch (error) {
        console.error("Failed to load desktop navigation widget profile", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const username = authUser?.email?.split("@")[0] || "Guest";
  const displayName =
    profile?.display_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    username;

  const avatarUrl =
    profile?.avatar_url || authUser?.user_metadata?.avatar_url || "";

  const formatNumber = (value: number) => {
    if (value >= 1000) {
      const formatted = (value / 1000).toFixed(1);
      return `${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}k`;
    }
    return value.toString();
  };

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
            <Avatar className="w-14 h-14 border border-border/60">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback>{displayName?.charAt(0)}</AvatarFallback>
            </Avatar>

            <div>
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="text-lg font-semibold">
                {isLoading ? "Loading..." : displayName || "Guest"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {([
              { label: "Posts", value: stats.posts },
              { label: "Followers", value: stats.followers },
              { label: "Following", value: stats.following },
            ] as const).map(({ label, value }) => (
              <div key={label} className="rounded-2xl glass-light py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-base font-semibold">
                  {isLoading ? "--" : formatNumber(value)}
                </p>
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
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive ? "glass-strong shadow-glass-glow" : "glass"
                  }`}
                >
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
