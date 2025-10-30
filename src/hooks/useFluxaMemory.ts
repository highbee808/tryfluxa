import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const calculateStreak = (lastActive: string | null): number => {
  if (!lastActive) return 0;
  
  const now = new Date();
  const lastActiveDate = new Date(lastActive);
  const hoursDiff = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60);
  
  // If last active was within 24 hours, maintain/increment streak
  return hoursDiff < 24 ? 1 : 0;
};

const getPreferredTime = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
};

export const useFluxaMemory = () => {
  useEffect(() => {
    initializeMemory();
  }, []);

  const initializeMemory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from("fluxa_memory")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const now = new Date().toISOString();
      const preferredTime = getPreferredTime();

      if (!existing) {
        await supabase.from("fluxa_memory").insert({
          user_id: user.id,
          name: user.user_metadata?.name || "bestie",
          gist_history: [],
          favorite_topics: [],
          last_active: now,
          visit_count: 1,
          streak_count: 1,
          preferred_time: preferredTime,
        });
      } else {
        const streakIncrement = calculateStreak(existing.last_active);
        const newStreakCount = streakIncrement > 0 
          ? (existing.streak_count || 0) + 1 
          : 1;

        await supabase
          .from("fluxa_memory")
          .update({ 
            last_active: now,
            visit_count: (existing.visit_count || 0) + 1,
            streak_count: newStreakCount,
            preferred_time: preferredTime,
          })
          .eq("user_id", user.id);
      }
    } catch (error) {
      console.error("Error initializing memory:", error);
    }
  };

  const updateGistHistory = async (gist: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memory } = await supabase
        .from("fluxa_memory")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const gistHistory = Array.isArray(memory?.gist_history) ? memory.gist_history : [];
      const newEntry = {
        id: gist.id,
        headline: gist.headline,
        topic: gist.topic_category || gist.topic,
        date_played: new Date().toISOString(),
      };

      // Keep only last 50 gists
      const updatedHistory = [newEntry, ...gistHistory].slice(0, 50);

      // Calculate favorite category from play frequency
      const categoryCount: Record<string, number> = {};
      updatedHistory.forEach((item: any) => {
        const cat = item.topic;
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      
      const favoriteCategory = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || gist.topic_category || gist.topic;

      // Update favorite topics (keep unique)
      const topics = Array.isArray(memory?.favorite_topics) ? [...memory.favorite_topics] : [];
      const topicCategory = gist.topic_category || gist.topic;
      if (!topics.includes(topicCategory)) {
        topics.push(topicCategory);
      }

      await supabase
        .from("fluxa_memory")
        .update({
          gist_history: updatedHistory,
          favorite_topics: topics,
          last_active: new Date().toISOString(),
          last_gist_played: gist.id,
        })
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error updating gist history:", error);
    }
  };

  const getFavoriteCategory = () => {
    return new Promise<string | null>(async (resolve) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return resolve(null);

        const { data: memory } = await supabase
          .from("fluxa_memory")
          .select("gist_history")
          .eq("user_id", user.id)
          .single();

        if (!memory?.gist_history || !Array.isArray(memory.gist_history)) {
          return resolve(null);
        }

        const categoryCount: Record<string, number> = {};
        memory.gist_history.forEach((item: any) => {
          const cat = item.topic;
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });

        const favorite = Object.entries(categoryCount)
          .sort(([, a], [, b]) => b - a)[0]?.[0];

        resolve(favorite || null);
      } catch (error) {
        console.error("Error getting favorite category:", error);
        resolve(null);
      }
    });
  };

  const toggleFavorite = async (gistId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if already favorited
      const { data: existing } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", user.id)
        .eq("gist_id", gistId)
        .single();

      if (existing) {
        // Remove favorite
        await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("gist_id", gistId);
        return false;
      } else {
        // Add favorite
        await supabase.from("user_favorites").insert({
          user_id: user.id,
          gist_id: gistId,
        });
        return true;
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      return false;
    }
  };

  const getGreeting = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "Hey bestie! 👋";

      const { data: memory } = await supabase
        .from("fluxa_memory")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!memory) return "Hey bestie! 👋";

      const userName = memory.name || "bestie";
      const visitCount = memory.visit_count || 0;
      const streakCount = memory.streak_count || 0;
      const favoriteTopics = Array.isArray(memory.favorite_topics) ? memory.favorite_topics : [];
      const lastActive = memory.last_active ? new Date(memory.last_active) : null;
      const daysSince = lastActive
        ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const hour = new Date().getHours();
      let timeOfDay = "morning";
      if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
      else if (hour >= 17 && hour < 21) timeOfDay = "evening";
      else if (hour >= 21 || hour < 6) timeOfDay = "night";

      // Fetch appropriate greeting lines from database
      let category = "greeting";
      let mood = timeOfDay;

      // First time user
      if (visitCount === 1) {
        category = "welcome";
        mood = "warm";
      }
      // Returning after long absence
      else if (daysSince && daysSince > 7) {
        category = "returning";
        mood = "tease";
        const { data: lines } = await supabase
          .from("fluxa_lines")
          .select("line")
          .eq("category", category)
          .eq("mood", mood);
        
        if (lines && lines.length > 0) {
          const line = lines[Math.floor(Math.random() * lines.length)].line;
          return `${line.replace("${userName}", userName)} It's been ${daysSince} days 😭`;
        }
      }
      // High streak
      else if (streakCount >= 5) {
        category = "streak";
        mood = "hype";
        const { data: lines } = await supabase
          .from("fluxa_lines")
          .select("line")
          .eq("category", category)
          .eq("mood", mood);
        
        if (lines && lines.length > 0) {
          const line = lines[Math.floor(Math.random() * lines.length)].line;
          return line.replace("${streakCount}", streakCount.toString()).replace("${userName}", userName);
        }
      }

      // Default greeting based on time
      const { data: lines } = await supabase
        .from("fluxa_lines")
        .select("line")
        .eq("category", category)
        .eq("mood", mood);

      if (lines && lines.length > 0) {
        let line = lines[Math.floor(Math.random() * lines.length)].line;
        line = line.replace("${userName}", userName);
        line = line.replace("${streakCount}", streakCount.toString());
        
        // Add favorite category context if available
        if (favoriteTopics.length > 0) {
          const favTopic = favoriteTopics[0];
          line += ` I picked some ${favTopic} gist for you 💕`;
        }
        
        return line;
      }

      // Fallback
      return `Hey ${userName}! 👋 Ready for today's gist?`;
    } catch (error) {
      console.error("Error getting greeting:", error);
      return "Hey bestie! 👋";
    }
  };

  const getFluxaLine = async (category: string, mood: string) => {
    try {
      const { data: lines } = await supabase
        .from("fluxa_lines")
        .select("line")
        .eq("category", category)
        .eq("mood", mood);

      if (lines && lines.length > 0) {
        return lines[Math.floor(Math.random() * lines.length)].line;
      }
      return null;
    } catch (error) {
      console.error("Error getting Fluxa line:", error);
      return null;
    }
  };

  return {
    updateGistHistory,
    toggleFavorite,
    getGreeting,
    getFluxaLine,
    getFavoriteCategory,
  };
};
