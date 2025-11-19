import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Send, Hand, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GossipCard } from "@/components/GossipCard";

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

interface Gist {
  id: string;
  headline: string;
  topic: string;
  context: string;
  image_url: string | null;
  play_count: number;
  favorite_count: number;
  created_at: string;
  source_url: string | null;
}

const REACTION_EMOJIS = ["😂", "😱", "🔥", "👏", "💅"];

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [room, setRoom] = useState<any>(null);
  const [gists, setGists] = useState<Gist[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [handRaised, setHandRaised] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [sponsorship, setSponsorship] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;

    fetchRoom();
    fetchRoomGists();
    fetchSponsorship();

    // Subscribe to room updates
    const roomChannel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          setRoom(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      setRoom(data);
    } catch (error) {
      console.error('Error fetching room:', error);
      toast({
        title: "Error",
        description: "Failed to load room",
        variant: "destructive",
      });
    }
  };

  const fetchRoomGists = async () => {
    try {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('topic_category')
        .eq('id', roomId)
        .single();

      if (!roomData) return;

      const { data, error } = await supabase
        .from('gists')
        .select('*')
        .eq('topic_category', roomData.topic_category)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setGists(data || []);
    } catch (error) {
      console.error('Error fetching room gists:', error);
    }
  };

  const fetchSponsorship = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsorships')
        .select('*')
        .eq('room_id', roomId)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSponsorship(data);
        // Increment impressions
        await supabase
          .from('sponsorships')
          .update({ impressions: data.impressions + 1 })
          .eq('id', data.id);
      }
    } catch (error) {
      console.error('Error fetching sponsorship:', error);
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

      setMessages(prev => [...prev, message]);
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendReaction = async (emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newReaction: Reaction = {
        id: crypto.randomUUID(),
        reaction: emoji,
        user_id: user.id,
      };

      setReactions(prev => [...prev, newReaction]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== newReaction.id));
      }, 3000);
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

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 animate-pulse text-4xl">🌟</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/universe')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-2xl">{room.icon}</span>
                {room.name}
              </h1>
              <p className="text-sm text-muted-foreground">{room.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{room.active_listeners} listening</span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Main Stage */}
        <div className="lg:col-span-2 space-y-4">
          {/* Sponsorship Banner */}
          {sponsorship && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                <p className="text-sm">
                  <span className="font-semibold">Sponsored by {sponsorship.brand_name}:</span> {sponsorship.ad_copy}
                </p>
              </Card>
            </motion.div>
          )}

          <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="mb-6">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <span className="text-6xl">{room.icon}</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Fluxa's {room.name} 💅</h2>
              <p className="text-muted-foreground mb-4">
                Hey besties 👋 let's dive into the latest {room.topic_category} gist!
              </p>
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

          {/* Room Gists Feed */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Latest {room.topic_category} Gist</h3>
            <div className="space-y-4">
              {gists.map((gist, index) => (
                <GossipCard
                  key={gist.id}
                  gistId={gist.id}
                  imageUrl={gist.image_url || "/placeholder.svg"}
                  headline={gist.headline}
                  context={gist.context}
                  isPlaying={false}
                  onPlay={() => {}}
                  onNext={() => {}}
                  onTellMore={() => {}}
                />
              ))}
            </div>
          </div>

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

export default Room;
