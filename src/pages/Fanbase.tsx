import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/BottomNavigation";
import { toast } from "sonner";
import { Loader2, Send, Music, Star, Tv } from "lucide-react";

interface Thread {
  id: string;
  category: string;
  topic_name: string;
  post: string;
  audio_url: string | null;
  reactions: any;
  created_at: string;
}

const Fanbase = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Music");
  const [newPost, setNewPost] = useState("");

  const categories = [
    { id: "Music", icon: Music, label: "Music", color: "bg-purple-500/10 text-purple-500" },
    { id: "Celebrity", icon: Star, label: "Celebrity", color: "bg-yellow-500/10 text-yellow-500" },
    { id: "Entertainment", icon: Tv, label: "Entertainment", color: "bg-blue-500/10 text-blue-500" },
  ];

  useEffect(() => {
    fetchThreads();
    subscribeToThreads();
  }, [selectedCategory]);

  const fetchThreads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fanbase_threads")
      .select("*")
      .eq("category", selectedCategory)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Failed to load threads");
      console.error(error);
    } else {
      setThreads(data || []);
    }
    setLoading(false);
  };

  const subscribeToThreads = () => {
    const channel = supabase
      .channel("fanbase-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fanbase_threads",
          filter: `category=eq.${selectedCategory}`,
        },
        (payload) => {
          setThreads((prev) => [payload.new as Thread, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handlePostThread = async () => {
    if (!newPost.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to post");
      return;
    }

    const { error } = await supabase
      .from("fanbase_threads")
      .insert({
        category: selectedCategory,
        topic_name: selectedCategory,
        post: newPost,
        user_id: user.id,
      });

    if (error) {
      toast.error("Failed to post");
      console.error(error);
    } else {
      setNewPost("");
      toast.success("Posted! 🎉");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 p-6">
        <h1 className="text-4xl font-bold text-center mb-2">🎧 Fanbase</h1>
        <p className="text-center text-muted-foreground">Join the conversation</p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 p-4 overflow-x-auto justify-center">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.id)}
              className="gap-2"
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </Button>
          );
        })}
      </div>

      {/* New Post Input */}
      <div className="max-w-4xl mx-auto px-4 mb-4">
        <Card className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Share your thoughts..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handlePostThread()}
            />
            <Button onClick={handlePostThread} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Threads Feed */}
      <div className="max-w-4xl mx-auto px-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {threads.map((thread) => (
              <Card key={thread.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">{thread.topic_name}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(thread.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-foreground mb-3">{thread.post}</p>
                
                {thread.audio_url && (
                  <audio controls className="w-full mb-3">
                    <source src={thread.audio_url} type="audio/mpeg" />
                  </audio>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm">
                    🔥 {thread.reactions?.fire || 0}
                  </Button>
                  <Button variant="ghost" size="sm">
                    😭 {thread.reactions?.shocked || 0}
                  </Button>
                  <Button variant="ghost" size="sm">
                    😂 {thread.reactions?.funny || 0}
                  </Button>
                </div>
              </Card>
            ))}

            {threads.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No posts yet. Be the first!</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Fanbase;
