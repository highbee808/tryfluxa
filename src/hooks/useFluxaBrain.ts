import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FluxaBrainData {
  id: string;
  user_id: string;
  reading_speed: string;
  preferred_tone: string;
  topics_read: any[];
  engagement_score: number;
  total_reads: number;
  avg_read_time: number;
}

export const useFluxaBrain = () => {
  const [brainData, setBrainData] = useState<FluxaBrainData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrainData();
  }, []);

  const fetchBrainData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("fluxa_brain")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching brain data:", error);
    }

    if (!data) {
      // Initialize brain data for new user
      const { data: newBrain } = await supabase
        .from("fluxa_brain")
        .insert({
          user_id: user.id,
          reading_speed: 'medium',
          preferred_tone: 'casual'
        })
        .select()
        .single();
      
      if (newBrain) {
        setBrainData({
          ...newBrain,
          topics_read: Array.isArray(newBrain.topics_read) ? newBrain.topics_read : []
        } as FluxaBrainData);
      }
    } else {
      setBrainData({
        ...data,
        topics_read: Array.isArray(data.topics_read) ? data.topics_read : []
      } as FluxaBrainData);
    }
    
    setLoading(false);
  };

  const trackReading = async (gistId: string, topic: string, readTime: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !brainData) return;

    const newTopicsRead = [...(brainData.topics_read || []), { gistId, topic, timestamp: new Date().toISOString() }];
    const newTotalReads = brainData.total_reads + 1;
    const newAvgReadTime = Math.round((brainData.avg_read_time * brainData.total_reads + readTime) / newTotalReads);

    // Determine reading speed based on average
    let newReadingSpeed: 'fast' | 'medium' | 'slow' = 'medium';
    if (newAvgReadTime < 30) newReadingSpeed = 'fast';
    else if (newAvgReadTime > 90) newReadingSpeed = 'slow';

    await supabase
      .from("fluxa_brain")
      .update({
        topics_read: newTopicsRead,
        total_reads: newTotalReads,
        avg_read_time: newAvgReadTime,
        reading_speed: newReadingSpeed,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    fetchBrainData();
  };

  const updateTonePreference = async (tone: 'concise' | 'casual' | 'analytical') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("fluxa_brain")
      .update({ preferred_tone: tone })
      .eq("user_id", user.id);

    fetchBrainData();
  };

  const adjustSummaryForTone = (summary: string, tone: 'concise' | 'casual' | 'analytical'): string => {
    // This would be enhanced with AI to truly adjust tone
    // For now, return as-is or add simple prefixes
    switch (tone) {
      case 'concise':
        return summary.split('.').slice(0, 2).join('.') + '.';
      case 'analytical':
        return `Analysis: ${summary}`;
      case 'casual':
      default:
        return summary;
    }
  };

  return {
    brainData,
    loading,
    trackReading,
    updateTonePreference,
    adjustSummaryForTone
  };
};