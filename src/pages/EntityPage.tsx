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
  primary_color: string | null;
  secondary_color: string | null;
  current_match: any;
  news_feed: any;
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

  const primaryColor = entity.primary_color || 'hsl(var(--primary))';
  const secondaryColor = entity.secondary_color || 'hsl(var(--secondary))';

  return (
    <div className="min-h-screen pb-20" style={{ background: `linear-gradient(to bottom, ${primaryColor}15, hsl(var(--background)))` }}>
      {/* Header with Background */}
      <div 
        className="relative h-48"
        style={{
          backgroundImage: entity.background_url ? `url(${entity.background_url})` : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 text-white hover:bg-white/20"
          onClick={() => navigate("/fanbase-hub")}
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
              <h3 className="font-bold mb-3 flex items-center gap-2">
                🏆 Major Trophies
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {entity.achievements.map((trophy: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <p className="font-bold text-sm">{trophy.name}</p>
                      <p className="text-xs text-muted-foreground">{trophy.count}x Champion</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Current Match */}
        {entity.current_match && (
          <Card className="mt-6 p-6" style={{ 
            background: `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}10)`,
            borderColor: primaryColor
          }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                ⚽ {entity.current_match.status === 'live' ? '🔴 LIVE' : 'Upcoming Match'}
              </h3>
              <Badge variant={entity.current_match.status === 'live' ? 'destructive' : 'secondary'}>
                {entity.current_match.league}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="font-bold text-lg">{entity.current_match.home_team}</p>
                <p className="text-3xl font-bold mt-2" style={{ color: primaryColor }}>
                  {entity.current_match.home_score || 0}
                </p>
              </div>
              <div className="text-muted-foreground px-4">VS</div>
              <div className="text-center flex-1">
                <p className="font-bold text-lg">{entity.current_match.away_team}</p>
                <p className="text-3xl font-bold mt-2" style={{ color: secondaryColor }}>
                  {entity.current_match.away_score || 0}
                </p>
              </div>
            </div>
            {entity.current_match.match_time && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                {entity.current_match.match_time}
              </p>
            )}
          </Card>
        )}

        {/* News Feed */}
        {entity.news_feed && entity.news_feed.length > 0 && (
          <Card className="mt-6 p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              📰 Latest News
            </h3>
            <div className="space-y-4">
              {entity.news_feed.slice(0, 5).map((news: any, i: number) => (
                <div key={i} className="pb-4 border-b last:border-0">
                  <h4 className="font-semibold text-sm mb-1">{news.title}</h4>
                  <p className="text-xs text-muted-foreground">{news.source} • {news.time}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

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
