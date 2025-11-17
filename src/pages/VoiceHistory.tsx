import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { NavigationBar } from "@/components/NavigationBar";
import { BottomNavigation } from "@/components/BottomNavigation";

interface VoiceChat {
  id: string;
  user_message: string;
  fluxa_reply: string;
  audio_url: string;
  emotion: string;
  created_at: string;
}

const VoiceHistory = () => {
  const [chats, setChats] = useState<VoiceChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('voice_chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (chat: VoiceChat) => {
    try {
      setPlayingId(chat.id);
      const audio = new Audio(chat.audio_url);
      
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setPlayingId(null);
        toast({
          title: "Error",
          description: "Failed to play audio",
          variant: "destructive",
        });
      };
      
      await audio.play();
    } catch (error) {
      setPlayingId(null);
      toast({
        title: "Error",
        description: "Failed to play audio",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <NavigationBar />
      
      <div className="container max-w-4xl mx-auto px-4 pt-20 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Voice Chat History</h1>
          <p className="text-muted-foreground">
            Your previous conversations with Fluxa
          </p>
        </div>

        {chats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No chat history yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start a voice conversation with Fluxa to see it here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {chats.map((chat) => (
              <Card key={chat.id} className="glass-light">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(chat.created_at), { addSuffix: true })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-semibold text-foreground">You:</span>
                      <p className="text-sm text-foreground flex-1">{chat.user_message}</p>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-semibold text-primary">Fluxa:</span>
                      <p className="text-sm text-foreground flex-1">{chat.fluxa_reply}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => playAudio(chat)}
                      disabled={playingId === chat.id}
                      className="gap-2"
                    >
                      {playingId === chat.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {playingId === chat.id ? 'Playing...' : 'Play Response'}
                    </Button>
                    
                    {chat.emotion && (
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        {chat.emotion}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default VoiceHistory;
