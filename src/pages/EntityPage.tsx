import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Heart, ArrowLeft, Send, TrendingUp, Clock, Flame } from "lucide-react";

interface Entity {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo_url: string | null;
  background_url: string | null;
  bio: string | null;
  achievements: any;
  stats: any;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  reactions: any;
  created_at: string;
}

const EntityPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'top'>('latest');

  useEffect(() => {
    if (slug) {
      fetchEntity();
      fetchPosts();
      checkFollowStatus();
    }
  }, [slug]);

  const fetchEntity = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fan_entities")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      toast.error("Entity not found");
      navigate("/fanbase");
    } else {
      setEntity(data);
    }
    setLoading(false);
  };

  const fetchPosts = async () => {
    if (!entity?.id) return;

    const query = supabase
      .from("fan_posts")
      .select("*")
      .eq("entity_id", entity.id);

    if (sortBy === 'latest') {
      query.order("created_at", { ascending: false });
    } else {
      query.order("reaction_count", { ascending: false });
    }

    const { data } = await query.limit(50);
    setPosts(data || []);
  };

  const checkFollowStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !entity?.id) return;

    const { data } = await supabase
      .from("fan_follows")
      .select("id")
      .eq("user_id", user.id)
      .eq("entity_id", entity.id)
      .single();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in");
      navigate("/auth");
      return;
    }

    if (isFollowing) {
      await supabase
        .from("fan_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("entity_id", entity!.id);
      setIsFollowing(false);
      toast.success("Unfollowed");
    } else {
      await supabase
        .from("fan_follows")
        .insert({ user_id: user.id, entity_id: entity!.id });
      setIsFollowing(true);
      toast.success("Following!");
    }
  };

  const handlePost = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to post");
      navigate("/auth");
      return;
    }

    if (!newPost.trim()) {
      toast.error("Post cannot be empty");
      return;
    }

    setPosting(true);
    const { error } = await supabase
      .from("fan_posts")
      .insert({
        entity_id: entity!.id,
        user_id: user.id,
        content: newPost.trim(),
      });

    if (error) {
      toast.error("Failed to post");
    } else {
      setNewPost("");
      fetchPosts();
      toast.success("Posted!");
    }
    setPosting(false);
  };

  const handleReaction = async (postId: string, emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const reactions = { ...post.reactions };
    reactions[emoji] = (reactions[emoji] || 0) + 1;

    const totalReactions = Object.values(reactions).reduce((a, b) => (a as number) + (b as number), 0) as number;

    await supabase
      .from("fan_posts")
      .update({ 
        reactions,
        reaction_count: totalReactions
      })
      .eq("id", postId);

    fetchPosts();
  };

  useEffect(() => {
    if (entity) {
      fetchPosts();
    }
  }, [sortBy, entity]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!entity) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 pb-20">
      {/* Header with Background */}
      <div 
        className="relative h-48 bg-gradient-to-r from-primary/30 via-secondary/30 to-accent/30"
        style={entity.background_url ? { backgroundImage: `url(${entity.background_url})`, backgroundSize: 'cover' } : {}}
      >
        <div className="absolute inset-0 bg-black/40" />
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 text-white"
          onClick={() => navigate("/fanbase")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Profile Section */}
      <div className="max-w-4xl mx-auto px-4 -mt-16">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            {entity.logo_url ? (
              <img src={entity.logo_url} alt={entity.name} className="w-24 h-24 rounded-full object-cover border-4 border-background" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold border-4 border-background">
                {entity.name.charAt(0)}
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold">{entity.name}</h1>
                <Button
                  variant={isFollowing ? "default" : "outline"}
                  onClick={handleFollow}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              </div>

              <Badge variant="secondary" className="mb-3">
                {entity.category}
              </Badge>

              {entity.bio && (
                <p className="text-muted-foreground mb-4">{entity.bio}</p>
              )}

              {/* Stats */}
              {Object.keys(entity.stats).length > 0 && (
                <div className="flex gap-6 text-sm">
                  {Object.entries(entity.stats).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-bold">{value as string}</span>
                      <span className="text-muted-foreground ml-1">{key}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Achievements */}
          {entity.achievements && entity.achievements.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-bold mb-3">🏆 Achievements</h3>
              <div className="flex flex-wrap gap-2">
                {entity.achievements.map((achievement, i) => (
                  <Badge key={i} variant="outline">
                    {achievement}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Posts Section */}
        <div className="mt-6">
          <Card className="p-4 mb-4">
            <Textarea
              placeholder="Share your thoughts with the fanbase..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="mb-3"
              rows={3}
            />
            <Button onClick={handlePost} disabled={posting} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              {posting ? "Posting..." : "Post"}
            </Button>
          </Card>

          {/* Sort Options */}
          <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="latest">
                <Clock className="w-4 h-4 mr-2" />
                Latest
              </TabsTrigger>
              <TabsTrigger value="top">
                <Flame className="w-4 h-4 mr-2" />
                Top
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Posts Feed */}
          <div className="space-y-3">
            {posts.map(post => (
              <Card key={post.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 bg-gradient-to-br from-primary to-secondary" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                    <p className="mb-3">{post.content}</p>
                    
                    {/* Reactions */}
                    <div className="flex gap-2">
                      {['🔥', '😂', '😭', '❤️', '👏'].map(emoji => (
                        <Button
                          key={emoji}
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReaction(post.id, emoji)}
                          className="text-lg"
                        >
                          {emoji}
                          {post.reactions[emoji] && (
                            <span className="ml-1 text-xs">{post.reactions[emoji]}</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {posts.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityPage;
