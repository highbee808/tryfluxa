import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BottomNavigation from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";
import { Users, Radio, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface LiveSession {
  id: string;
  title: string;
  topic: string;
  description: string | null;
  status: string;
  participant_count: number;
  started_at: string | null;
  created_at: string;
}

const Live = () => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();

    // Subscribe to session updates
    const channel = supabase
      .channel('live-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions'
        },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .in('status', ['scheduled', 'live'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load live sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinSession = (sessionId: string) => {
    navigate(`/live/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Radio className="w-12 h-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading live sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Fluxa Live 🎙️
          </h1>
          <p className="text-muted-foreground">
            Join real-time live sessions hosted by Fluxa
          </p>
        </motion.div>

        {sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <Radio className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-semibold mb-2">No Live Sessions</h2>
            <p className="text-muted-foreground">
              Check back soon for Fluxa's next live gist session!
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">{session.title}</h3>
                        {session.status === 'live' && (
                          <Badge className="bg-red-500 text-white animate-pulse">
                            <Radio className="w-3 h-3 mr-1" />
                            LIVE
                          </Badge>
                        )}
                        {session.status === 'scheduled' && (
                          <Badge variant="outline">
                            <Clock className="w-3 h-3 mr-1" />
                            Scheduled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {session.topic}
                      </p>
                      {session.description && (
                        <p className="text-sm mb-4">{session.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{session.participant_count} listening</span>
                        </div>
                        <span>Hosted by Fluxa 💅</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => joinSession(session.id)}
                      className="whitespace-nowrap"
                      disabled={session.status === 'scheduled'}
                    >
                      {session.status === 'live' ? 'Join Live' : 'Coming Soon'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
};

export default Live;
