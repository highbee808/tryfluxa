import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { UserBadges } from "./UserBadges";
import { Trophy, MessageCircle, Heart, TrendingUp } from "lucide-react";

interface UserProfileCardProps {
  userId: string;
}

interface Profile {
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface GamificationStats {
  level: number;
  total_points: number;
  comments_count: number;
  likes_given: number;
}

export function UserProfileCard({ userId }: UserProfileCardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio")
        .eq("user_id", userId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Load gamification stats
      const { data: statsData } = await supabase
        .from("user_gamification")
        .select("level, total_points, comments_count, likes_given")
        .eq("user_id", userId)
        .single();

      if (statsData) {
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} />
            ) : (
              <AvatarFallback className="text-lg">
                {profile?.display_name?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">
              {profile?.display_name || "Anonymous User"}
            </h3>
            
            <UserBadges userId={userId} className="mb-3" />
            
            {profile?.bio && (
              <p className="text-sm text-muted-foreground mb-4">{profile.bio}</p>
            )}
            
            {stats && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <div>
                    <p className="font-semibold">{stats.total_points}</p>
                    <p className="text-xs text-muted-foreground">Points</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="font-semibold">Level {stats.level}</p>
                    <p className="text-xs text-muted-foreground">Rank</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="font-semibold">{stats.comments_count}</p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Heart className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="font-semibold">{stats.likes_given}</p>
                    <p className="text-xs text-muted-foreground">Likes Given</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
