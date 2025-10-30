import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Crown } from "lucide-react";
import { motion } from "framer-motion";

interface Room {
  id: string;
  name: string;
  icon: string;
  topic_category: string;
  description: string | null;
  active_listeners: number;
}

const Universe = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isVIP, setIsVIP] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
    checkVIPStatus();

    // Subscribe to room updates
    const channel = supabase
      .channel('rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms'
        },
        () => fetchRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('active_listeners', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load rooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkVIPStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_vip')
        .select('vip_status, expires_at')
        .eq('user_id', user.id)
        .single();

      if (data?.vip_status && (!data.expires_at || new Date(data.expires_at) > new Date())) {
        setIsVIP(true);
      }
    } catch (error) {
      console.error('Error checking VIP status:', error);
    }
  };

  const joinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 animate-pulse mx-auto mb-4 text-primary">🌟</div>
          <p className="text-muted-foreground">Loading Fluxa Universe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Fluxa Universe 🌟
          </h1>
          <p className="text-muted-foreground mb-4">
            Pick your vibe — Fluxa's hosting every corner
          </p>
          {isVIP && (
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
              <Crown className="w-3 h-3 mr-1" />
              VIP Access
            </Badge>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-xl transition-all hover:scale-105">
                <div className="text-center mb-4">
                  <div className="text-6xl mb-3">{room.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{room.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {room.description}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                    <Users className="w-4 h-4" />
                    <span>{room.active_listeners} listening</span>
                  </div>
                </div>
                <Button
                  onClick={() => joinRoom(room.id)}
                  className="w-full bg-gradient-to-r from-primary to-accent"
                >
                  Join Room
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>

        {rooms.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">🌟</div>
            <h2 className="text-2xl font-semibold mb-2">Coming Soon</h2>
            <p className="text-muted-foreground">
              Fluxa's prepping the rooms — check back soon!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Universe;
