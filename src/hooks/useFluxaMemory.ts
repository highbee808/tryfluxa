import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

      if (!existing) {
        await supabase.from("fluxa_memory").insert({
          user_id: user.id,
          name: user.user_metadata?.name || "bestie",
          gist_history: [],
          favorite_topics: [],
          last_active: new Date().toISOString(),
        });
      } else {
        await supabase
          .from("fluxa_memory")
          .update({ last_active: new Date().toISOString() })
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

      // Update favorite topics
      const topics = Array.isArray(memory?.favorite_topics) ? [...memory.favorite_topics] : [];
      const topicCategory = gist.topic_category || gist.topic;
      if (!topics.includes(topicCategory)) {
        topics.push(topicCategory);
      }

      await supabase
        .from("fluxa_memory")
        .upsert({
          user_id: user.id,
          gist_history: updatedHistory,
          favorite_topics: topics,
          last_active: new Date().toISOString(),
        });
    } catch (error) {
      console.error("Error updating gist history:", error);
    }
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

      const userName = memory?.name || "bestie";
      const lastActive = memory?.last_active ? new Date(memory.last_active) : null;
      const daysSince = lastActive
        ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const hour = new Date().getHours();
      let timeGreeting = "Hey";
      if (hour < 12) timeGreeting = "Morning";
      else if (hour < 18) timeGreeting = "Afternoon";
      else timeGreeting = "Evening";

      if (daysSince && daysSince > 7) {
        return `Aah! You ghosted me for ${daysSince} days 😭 spill where you've been, ${userName}!`;
      } else if (daysSince && daysSince > 1) {
        return `${timeGreeting}, ${userName}! Missed you 💕 Ready for fresh gist?`;
      } else {
        const gistHistory = Array.isArray(memory?.gist_history) ? memory.gist_history : [];
        if (gistHistory.length > 5) {
          return `${timeGreeting}, ${userName}! You were on a roll 🔥 I saved more gist just for you!`;
        }
        return `${timeGreeting}, ${userName}! 🌞 Ready for the latest gist?`;
      }
    } catch (error) {
      console.error("Error getting greeting:", error);
      return "Hey bestie! 👋";
    }
  };

  return {
    updateGistHistory,
    toggleFavorite,
    getGreeting,
  };
};
