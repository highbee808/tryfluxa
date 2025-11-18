import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Calendar, Heart, MoreHorizontal, Settings, Trophy } from "lucide-react";
import { toast } from "sonner";
import { UserBadges } from "@/components/UserBadges";
import { DesktopNavigationWidget } from "@/components/DesktopNavigationWidget";
import { DesktopRightWidgets } from "@/components/DesktopRightWidgets";
import type { User } from "@supabase/supabase-js";
import FluxaIcon from "@/assets/fluxa-icon.svg";

interface Gist {
  id: string;
  headline: string;
  topic: string;
  topic_category: string;
  audio_url: string | null;
  audio_cache_url?: string | null;
  image_url: string | null;
  published_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Gist[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [activeTab, setActiveTab] = useState("favorites");
  const [profile, setProfile] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [gamificationStats, setGamificationStats] = useState<any>(null);
  const [postsCount, setPostsCount] = useState(0);
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to view profile");
        navigate("/auth");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");
      setAuthUser(user);

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(profileData);

      // Load follower/following counts
      const followersPromise = supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);

      const followingPromise = supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);

      const postsPromise = supabase
        .from("fan_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const [followersResponse, followingResponse, postsResponse] = await Promise.all([
        followersPromise,
        followingPromise,
        postsPromise,
      ]);

      if (followersResponse.error) throw followersResponse.error;
      if (followingResponse.error) throw followingResponse.error;
      if (postsResponse.error) throw postsResponse.error;

      setFollowerCount(followersResponse.count || 0);
      setFollowingCount(followingResponse.count || 0);
      setPostsCount(postsResponse.count || 0);

      // Load gamification stats
      const { data: statsData } = await supabase
        .from("user_gamification")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setGamificationStats(statsData);

      // Get user's favorited gist IDs
      const { data: favData, error: favError } = await supabase
        .from("user_favorites")
        .select("gist_id")
        .eq("user_id", user.id);

      if (favError) throw favError;

      if (!favData || favData.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const gistIds = favData.map((f) => f.gist_id);

      // Get the actual gists
      const { data: gists, error: gistsError } = await supabase
        .from("gists")
        .select("*")
        .in("id", gistIds)
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (gistsError) throw gistsError;

      setFavorites(gists || []);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfavorite = async (gistId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("gist_id", gistId)
        .eq("user_id", userId);

      if (error) throw error;

      setFavorites(favorites.filter((g) => g.id !== gistId));
      toast.success("Removed from favorites");
    } catch (error) {
      console.error("Error unfavoriting:", error);
      toast.error("Failed to remove favorite");
    }
  };

  const username = userEmail.split("@")[0];
  const displayName =
    profile?.display_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    username;
  const avatarUrl = profile?.avatar_url || authUser?.user_metadata?.avatar_url || "";
  const joinedDateSource = profile?.created_at || authUser?.created_at;
  const joinedDate = joinedDateSource
    ? new Date(joinedDateSource).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const formatNumber = (value: number) => {
    if (value >= 1000) {
      const formatted = (value / 1000).toFixed(1);
      return `${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}k`;
    }
    return value.toString();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-6xl px-0 sm:px-4 lg:px-8 lg:pt-10">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px] items-start">
          <DesktopNavigationWidget />

          <div className="w-full sm:max-w-[600px] mx-auto lg:max-w-none lg:mx-0 lg:border-x border-border min-h-screen pb-24 md:mt-16">
            {/* Top Nav */}
            <div className="sticky top-0 z-20 px-4 pt-4 pb-2 bg-transparent">
              <div className="frosted-nav flex items-center gap-4 px-4 py-3">
                <button
                  type="button"
                  onClick={() => navigate("/feed")}
                  className="frosted-icon-button"
                  aria-label="Back to feed"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="font-bold text-xl truncate">{displayName}</h1>
                  <p className="text-xs text-muted-foreground">{favorites.length} favorites</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/settings")}
                    className="frosted-icon-button"
                    aria-label="Open settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(true)}
                    className="frosted-icon-button"
                    aria-label="Profile actions"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cover Photo */}
            <div className="h-[200px] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />

            {/* Profile Info */}
            <div className="px-4 sm:px-6">
          {/* Avatar */}
            <div className="flex justify-between items-start -mt-16 mb-4">
              <Avatar className="w-[133px] h-[133px] border-4 border-background shadow-md">
                <AvatarImage src={avatarUrl} alt={displayName || "Profile"} />
                <AvatarFallback className="text-5xl bg-gradient-to-br from-blue-400 to-purple-600 text-white">
                  {(displayName || username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  className="rounded-full font-bold px-4 hover:bg-secondary/50 transition-colors"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>

          {/* User Info */}
          <div className="mb-4">
            <h2 className="text-xl font-bold">{displayName}</h2>
            <p className="text-muted-foreground text-sm">@{username}</p>

            {profile?.bio && (
              <p className="text-foreground/90 mt-3">{profile.bio}</p>
            )}

            <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {joinedDate}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mt-6">
              {(
                [
                  { label: "Posts", value: postsCount },
                  { label: "Followers", value: followerCount },
                  { label: "Following", value: followingCount },
                ] as const
              ).map(({ label, value }) => (
                <div key={label} className="rounded-2xl glass-light py-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-semibold">{formatNumber(value)}</p>
                </div>
              ))}
            </div>

            {/* Gamification Stats & Badges */}
            {userId && (
              <div className="mt-4 space-y-3">
                <UserBadges userId={userId} />
                
                {gamificationStats && (
                  <div className="flex gap-3 p-3 bg-accent/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <div className="text-sm">
                        <p className="font-semibold">Level {gamificationStats.level}</p>
                        <p className="text-xs text-muted-foreground">{gamificationStats.total_points} points</p>
                      </div>
                    </div>
                    <div className="border-l border-border" />
                    <div className="text-sm">
                      <p className="font-semibold">{gamificationStats.comments_count}</p>
                      <p className="text-xs text-muted-foreground">Comments</p>
                    </div>
                    <div className="border-l border-border" />
                    <div className="text-sm">
                      <p className="font-semibold">{gamificationStats.likes_given}</p>
                      <p className="text-xs text-muted-foreground">Likes</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-around h-[53px] rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger
                value="favorites"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold"
              >
                Favorites
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold"
              >
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="favorites" className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : favorites.length === 0 ? (
                <div className="py-16 text-center px-8">
                  <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-2xl font-bold mb-2">No favorites yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Tap the heart on any gist to save it here
                  </p>
                  <Button onClick={() => navigate("/feed")}>
                    Explore Feed
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {favorites.map((gist) => (
                    <article
                      key={gist.id}
                      onClick={() => navigate(`/post/${gist.id}`)}
                      className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/post/${gist.id}`);
                        }
                      }}
                    >
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          F
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold hover:underline truncate">Fluxa</span>
                              <span className="text-muted-foreground truncate">@fluxa</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground text-sm">
                                {new Date(gist.published_at).toLocaleDateString()}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full -mt-1 -mr-2"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          </div>

                          <div className="mb-3">
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {gist.topic_category}
                            </span>
                            <h3 className="font-bold text-base mt-2">{gist.headline}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{gist.topic}</p>
                          </div>

                          {gist.image_url && (
                            <div className="rounded-2xl overflow-hidden border border-border mb-3">
                              <img
                                src={gist.image_url}
                                alt={gist.topic}
                                className="w-full h-auto"
                              />
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between max-w-md mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate("/fluxa-mode", {
                                  state: {
                                    initialContext: {
                                      gistId: gist.id,
                                      topic: gist.topic_category || gist.topic,
                                      headline: gist.headline,
                                      context: gist.topic,
                                      fullContext: gist.topic,
                                    },
                                  },
                                });
                              }}
                            >
                              <img src={FluxaIcon} alt="Fluxa" className="w-4 h-4 mr-2 opacity-80" />
                              Ask Fluxa
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full text-primary hover:bg-primary/10"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleUnfavorite(gist.id);
                              }}
                            >
                              <Heart className="w-4 h-4 mr-2 fill-primary" />
                              Liked
                            </Button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <div className="py-16 text-center px-8">
                <p className="text-muted-foreground">No activity yet</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

          <DesktopRightWidgets />
        </div>
      </div>

      <ProfileEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        profile={profile}
        onUpdate={loadProfile}
        onDeleteAccount={() => setDeleteDialogOpen(true)}
      />

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userEmail={userEmail}
      />

      <BottomNavigation />
    </div>
  );
};

export default Profile;
