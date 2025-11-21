import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNavigation from "@/components/BottomNavigation";
import { useNavigate } from "react-router-dom";
import { Loader2, Heart, TrendingUp, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface FanEntity {
  id: string;
  name: string;
  slug: string;
  category: 'sports' | 'music' | 'culture';
  logo_url: string | null;
  bio: string | null;
  stats: any;
  followerCount?: any;
  isFollowing?: boolean;
}

const FanbaseHub = () => {
  const [entities, setEntities] = useState<FanEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'sports' | 'music' | 'culture'>('sports');
  const [followedEntities, setFollowedEntities] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEntities();
    fetchUserFollows();
  }, []);

  const fetchUserFollows = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("fan_follows")
      .select("entity_id")
      .eq("user_id", user.id);

    if (data) {
      setFollowedEntities(new Set(data.map(f => f.entity_id)));
    }
  };

  const fetchEntities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fan_entities")
      .select(`
        *,
        followerCount:fan_follows(count)
      `)
      .order("name");

    if (error) {
      toast.error("Failed to load fanbases");
      console.error(error);
    } else {
      setEntities(data || []);
    }
    setLoading(false);
  };

  const handleFollow = async (entityId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to follow");
      navigate("/auth");
      return;
    }

    const isFollowing = followedEntities.has(entityId);

    if (isFollowing) {
      const { error } = await supabase
        .from("fan_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("entity_id", entityId);

      if (!error) {
        setFollowedEntities(prev => {
          const newSet = new Set(prev);
          newSet.delete(entityId);
          return newSet;
        });
        toast.success("Unfollowed");
      }
    } else {
      const { error } = await supabase
        .from("fan_follows")
        .insert({ user_id: user.id, entity_id: entityId });

      if (!error) {
        setFollowedEntities(prev => new Set(prev).add(entityId));
        toast.success("Following!");
      }
    }
  };

  const handleSyncEntities = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-fan-entities');
      
      if (error) {
        toast.error("Failed to sync entities");
        console.error(error);
      } else {
        toast.success("✨ Entities synced! Refreshing...");
        setTimeout(() => {
          fetchEntities();
        }, 2000);
      }
    } catch (err) {
      toast.error("Error syncing entities");
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const filteredEntities = entities.filter(e => e.category === activeCategory);
  const followedList = entities.filter(e => followedEntities.has(e.id));

  const renderEntityCard = (entity: FanEntity) => (
    <Card
      key={entity.id}
      className="p-4 cursor-pointer hover:shadow-lg transition-all"
      onClick={() => navigate(`/fanbase/${entity.slug}`)}
    >
      <div className="flex items-center gap-4">
        {entity.logo_url ? (
          <img 
            src={entity.logo_url} 
            alt={entity.name} 
            className="w-16 h-16 rounded-full object-cover bg-muted"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold"
          style={{ display: entity.logo_url ? 'none' : 'flex' }}
        >
          {entity.name.charAt(0)}
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-lg">
            {entity.name}{entity.category === 'music' ? ' News' : ''}
          </h3>
          {entity.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2">{entity.bio}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {entity.followerCount?.[0]?.count || 0} fans
            </Badge>
          </div>
        </div>

        <Button
          variant={followedEntities.has(entity.id) ? "default" : "outline"}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleFollow(entity.id);
          }}
        >
          <Heart className={`w-4 h-4 mr-1 ${followedEntities.has(entity.id) ? 'fill-current' : ''}`} />
          {followedEntities.has(entity.id) ? 'Following' : 'Follow'}
        </Button>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 pb-20">
      <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 p-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-4xl font-bold mb-2">🎯 Fanbase Hub</h1>
            <p className="text-muted-foreground">Follow your favorite teams, artists & creators</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncEntities}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Followed Fanbases */}
        {followedList.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 fill-current text-destructive" />
              Your Fanbases
            </h2>
            <div className="space-y-3">
              {followedList.map(renderEntityCard)}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="sports">⚽ Sports</TabsTrigger>
            <TabsTrigger value="music">🎵 Music</TabsTrigger>
            <TabsTrigger value="culture">🧠 Culture</TabsTrigger>
          </TabsList>

          <TabsContent value="sports" className="space-y-3">
            {filteredEntities.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No sports teams yet</p>
              </Card>
            ) : (
              filteredEntities.map(renderEntityCard)
            )}
          </TabsContent>

          <TabsContent value="music" className="space-y-3">
            {filteredEntities.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No artists yet</p>
              </Card>
            ) : (
              filteredEntities.map(renderEntityCard)
            )}
          </TabsContent>

          <TabsContent value="culture" className="space-y-3">
            {filteredEntities.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No culture entities yet</p>
              </Card>
            ) : (
              filteredEntities.map(renderEntityCard)
            )}
          </TabsContent>
        </Tabs>

        {/* Trending Section */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Most Active This Week
          </h2>
          <div className="space-y-3">
            {entities
              .sort((a, b) => (b.followerCount?.[0]?.count || 0) - (a.followerCount?.[0]?.count || 0))
              .slice(0, 5)
              .map(renderEntityCard)}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default FanbaseHub;
