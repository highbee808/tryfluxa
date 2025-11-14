import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VoiceChatMessage {
  id: string;
  user_id: string;
  user_message: string;
  fluxa_reply: string;
  audio_url: string;
  emotion: string;
  created_at: string;
}

export const useVoiceChatHistory = () => {
  const [history, setHistory] = useState<VoiceChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('voice_chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching voice chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    // Subscribe to new messages
    const channel = supabase
      .channel('voice-chat-history')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_chat_history',
        },
        (payload) => {
          setHistory((prev) => [payload.new as VoiceChatMessage, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { history, loading, refetch: fetchHistory };
};
