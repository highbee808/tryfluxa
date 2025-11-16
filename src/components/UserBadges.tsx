import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface UserBadgesProps {
  userId: string;
  className?: string;
}

interface Achievement {
  name: string;
  icon: string;
  tier: string;
  description: string;
}

interface UserStats {
  level: number;
  total_points: number;
}

export function UserBadges({ userId, className }: UserBadgesProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserBadges();
  }, [userId]);

  const loadUserBadges = async () => {
    try {
      // Get user stats
      const { data: statsData } = await supabase
        .from("user_gamification")
        .select("level, total_points")
        .eq("user_id", userId)
        .single();

      if (statsData) {
        setStats(statsData);
      }

      // Get user achievements
      const { data: achievementsData } = await supabase
        .from("user_achievements")
        .select(`
          achievement_id,
          achievements (name, icon, tier, description)
        `)
        .eq("user_id", userId)
        .order("earned_at", { ascending: false })
        .limit(3);

      if (achievementsData) {
        const badges = achievementsData
          .map((item: any) => item.achievements)
          .filter(Boolean);
        setAchievements(badges);
      }
    } catch (error) {
      console.error("Error loading badges:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const tierColors: Record<string, string> = {
    bronze: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    silver: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    gold: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    platinum: "bg-purple-500/10 text-purple-600 border-purple-500/20"
  };

  return (
    <div className={className}>
      <TooltipProvider>
        <div className="flex items-center gap-2 flex-wrap">
          {stats && stats.level > 1 && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  Lvl {stats.level}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{stats.total_points} points</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {achievements.map((achievement, idx) => (
            <Tooltip key={idx}>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className={tierColors[achievement.tier] || ""}
                >
                  {achievement.icon} {achievement.name}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{achievement.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
