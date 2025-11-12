import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Heart, Play, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface GistMetrics {
  id: string;
  headline: string;
  topic: string;
  topic_category: string;
  play_count: number;
  favorite_count: number;
  engagement_rate: number;
  published_at: string;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [gists, setGists] = useState<GistMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchGistMetrics();
    }
  }, [timeRange, isAdmin]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in");
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!data) {
      toast.error("Admin access required");
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const fetchGistMetrics = async () => {
    setLoading(true);
    let query = supabase
      .from("gists")
      .select("id, headline, topic, topic_category, play_count, favorite_count, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (timeRange === '7d') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte("published_at", sevenDaysAgo.toISOString());
    } else if (timeRange === '30d') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte("published_at", thirtyDaysAgo.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to fetch metrics");
      setLoading(false);
      return;
    }

    const metricsWithEngagement = (data || []).map(gist => ({
      ...gist,
      engagement_rate: gist.play_count > 0 
        ? (gist.favorite_count / gist.play_count) * 100 
        : 0
    }));

    setGists(metricsWithEngagement as GistMetrics[]);
    setLoading(false);
  };

  const getCategoryStats = () => {
    const categoryMap = new Map<string, { plays: number; favorites: number; count: number }>();
    
    gists.forEach(gist => {
      const category = gist.topic_category || 'uncategorized';
      const existing = categoryMap.get(category) || { plays: 0, favorites: 0, count: 0 };
      categoryMap.set(category, {
        plays: existing.plays + gist.play_count,
        favorites: existing.favorites + gist.favorite_count,
        count: existing.count + 1
      });
    });

    return Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      ...stats,
      avgEngagement: stats.plays > 0 ? (stats.favorites / stats.plays) * 100 : 0
    })).sort((a, b) => b.plays - a.plays);
  };

  const topGists = [...gists].sort((a, b) => b.play_count - a.play_count).slice(0, 10);
  const topEngagement = [...gists].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 10);
  const categoryStats = getCategoryStats();

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="max-w-7xl mx-auto pt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="w-8 h-8" />
              Gist Analytics
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('all')}
            >
              All Time
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">Total Gists</span>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="text-3xl font-bold">{gists.length}</div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">Total Plays</span>
              <Play className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold">
              {gists.reduce((sum, g) => sum + g.play_count, 0).toLocaleString()}
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">Total Favorites</span>
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold">
              {gists.reduce((sum, g) => sum + g.favorite_count, 0).toLocaleString()}
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">Avg Engagement</span>
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold">
              {gists.length > 0 
                ? (gists.reduce((sum, g) => sum + g.engagement_rate, 0) / gists.length).toFixed(1)
                : 0}%
            </div>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <Tabs defaultValue="top-plays" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="top-plays">Top Plays</TabsTrigger>
            <TabsTrigger value="engagement">Top Engagement</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
          </TabsList>

          <TabsContent value="top-plays">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Most Played Gists</h2>
              <div className="space-y-4">
                {topGists.map((gist, index) => (
                  <div key={gist.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-muted-foreground w-8">#{index + 1}</div>
                    <div className="flex-1">
                      <h3 className="font-bold">{gist.headline}</h3>
                      <p className="text-sm text-muted-foreground">{gist.topic} • {gist.topic_category}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-lg font-bold">
                        <Play className="w-4 h-4" />
                        {gist.play_count.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Heart className="w-3 h-3" />
                        {gist.favorite_count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="engagement">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Highest Engagement Rate</h2>
              <div className="space-y-4">
                {topEngagement.map((gist, index) => (
                  <div key={gist.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-muted-foreground w-8">#{index + 1}</div>
                    <div className="flex-1">
                      <h3 className="font-bold">{gist.headline}</h3>
                      <p className="text-sm text-muted-foreground">{gist.topic} • {gist.topic_category}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        {gist.engagement_rate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {gist.play_count} plays • {gist.favorite_count} favorites
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Performance by Category</h2>
              <div className="space-y-4">
                {categoryStats.map((cat, index) => (
                  <div key={cat.category} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-muted-foreground w-8">#{index + 1}</div>
                    <div className="flex-1">
                      <h3 className="font-bold capitalize">{cat.category}</h3>
                      <p className="text-sm text-muted-foreground">{cat.count} gists</p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Play className="w-3 h-3" />
                        {cat.plays.toLocaleString()} plays
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Heart className="w-3 h-3" />
                        {cat.favorites} favorites
                      </div>
                      <div className="text-sm font-bold text-primary">
                        {cat.avgEngagement.toFixed(1)}% engagement
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;