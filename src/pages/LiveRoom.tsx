import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import BottomNavigation from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Radio, Send, Hand, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  user_id: string;
  username: string;
  content: string;
  timestamp: string;
}

interface Reaction {
  id: string;
  reaction: string;
  user_id: string;
}

const REACTION_EMOJIS = ["😂", "😱", "🔥", "👏", "💅"];

const LiveRoom = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [handRaised, setHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;

    fetchSession();
    joinSession();

    // Subscribe to chat messages (using chat history from session)
    const sessionChannel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          setSession(payload.new);
          if (payload.new.chat_history) {
            setMessages(payload.new.chat_history);
          }
        }
      )
      .subscribe();

    // Subscribe to reactions
    const reactionsChannel = supabase
      .channel(`reactions-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_reactions',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newReaction = payload.new as Reaction;
          setReactions(prev => [...prev, newReaction]);
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== newReaction.id));
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      leaveSession();
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      setSession(data);
      if (data.chat_history && Array.isArray(data.chat_history)) {
        setMessages(data.chat_history as unknown as Message[]);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast({
        title: "Error",
        description: "Failed to load session",
        variant: "destructive",
      });
    }
  };

  const joinSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('live_participants').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'listener',
      });
    } catch (error) {
      console.error('Error joining session:', error);
    }
  };

  const leaveSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('live_participants')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const message: Message = {
        id: crypto.randomUUID(),
        user_id: user.id,
        username: user.email?.split('@')[0] || 'Anonymous',
        content: newMessage,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, message];
      
      await supabase
        .from('live_sessions')
        .update({ chat_history: updatedMessages as any })
        .eq('id', sessionId);

      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const sendReaction = async (emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('live_reactions').insert({
        session_id: sessionId,
        user_id: user.id,
        reaction: emoji,
      });
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  const toggleHandRaise = () => {
    setHandRaised(!handRaised);
    toast({
      title: handRaised ? "Hand lowered" : "Hand raised",
      description: handRaised ? "You've lowered your hand" : "Fluxa will see your request to speak",
    });
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Radio className="w-12 h-12 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/live')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{session.title}</h1>
              <p className="text-sm text-muted-foreground">{session.topic}</p>
            </div>
          </div>
          <Badge className="bg-red-500 text-white animate-pulse">
            <Radio className="w-3 h-3 mr-1" />
            LIVE
          </Badge>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Main Stage */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="mb-6">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <Radio className="w-16 h-16 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Fluxa is Live 💅</h2>
              <p className="text-muted-foreground mb-4">
                Hey besties 👋 welcome to tonight's gist. Buckle up — it's spicy!
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>{session.participant_count} listeners</span>
              </div>
            </div>

            {/* Reaction Emojis */}
            <div className="flex justify-center gap-2 mb-4">
              {REACTION_EMOJIS.map((emoji) => (
                <Button
                  key={emoji}
                  variant="outline"
                  size="lg"
                  className="text-2xl"
                  onClick={() => sendReaction(emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-2">
              <Button
                variant={handRaised ? "default" : "outline"}
                onClick={toggleHandRaise}
              >
                <Hand className="w-4 h-4 mr-2" />
                {handRaised ? "Lower Hand" : "Request to Speak"}
              </Button>
              <Button
                variant={isSpeaking ? "default" : "outline"}
                onClick={() => setIsSpeaking(!isSpeaking)}
                disabled={!handRaised}
              >
                {isSpeaking ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
                {isSpeaking ? "Mute" : "Unmute"}
              </Button>
            </div>
          </Card>

          {/* Floating Reactions */}
          <AnimatePresence>
            {reactions.map((reaction) => (
              <motion.div
                key={reaction.id}
                initial={{ y: 0, opacity: 1, x: Math.random() * 300 - 150 }}
                animate={{ y: -200, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 3 }}
                className="fixed bottom-20 left-1/2 text-4xl pointer-events-none"
              >
                {reaction.reaction}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Chat Sidebar */}
        <Card className="flex flex-col h-[600px]">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Live Chat</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <div className="text-xs text-muted-foreground">{msg.username}</div>
                <div className="bg-secondary rounded-lg p-2 text-sm">{msg.content}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
              />
              <Button size="icon" onClick={sendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default LiveRoom;
