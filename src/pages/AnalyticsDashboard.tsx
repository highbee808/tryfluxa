import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavigationBar } from "@/components/NavigationBar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, Download, TrendingUp, Eye, Heart, MessageCircle, Share2, Play } from "lucide-react";
import { toast } from "sonner";

interface PostAnalytics {
  id: string;
  headline: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  plays: number;
  engagement_rate: number;
  published_at: string;
}

interface TimeSeriesData {
  date: string;
  views: number;
  plays: number;
  likes: number;
  comments: number;
  shares: number;
}

export default function AnalyticsDashboard() {
  const [posts, setPosts] = useState<PostAnalytics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch posts with analytics
      const { data: gistsData, error: gistsError } = await supabase
        .from("gists")
        .select("id, headline, published_at")
        .eq("status", "published")
        .gte("published_at", startOfDay(dateRange.from).toISOString())
        .lte("published_at", endOfDay(dateRange.to).toISOString())
        .order("published_at", { ascending: false });

      if (gistsError) throw gistsError;

      // Fetch analytics for these posts
      const postIds = gistsData?.map(g => g.id) || [];
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("post_analytics")
        .select("*")
        .in("post_id", postIds);

      if (analyticsError) throw analyticsError;

      // Combine data
      const analyticsMap = new Map(analyticsData?.map(a => [a.post_id, a]) || []);
      const postsWithAnalytics: PostAnalytics[] = (gistsData || []).map(gist => {
        const analytics = analyticsMap.get(gist.id) || { views: 0, likes: 0, comments: 0, shares: 0, plays: 0 };
        const engagement_rate = analytics.views > 0 
          ? ((analytics.likes + analytics.comments + analytics.shares) / analytics.views) * 100 
          : 0;
        
        return {
          id: gist.id,
          headline: gist.headline,
          published_at: gist.published_at,
          ...analytics,
          engagement_rate
        };
      });

      setPosts(postsWithAnalytics);
      
      // Generate time series data
      generateTimeSeriesData(postsWithAnalytics);
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSeriesData = (posts: PostAnalytics[]) => {
    const dataByDate = new Map<string, TimeSeriesData>();
    
    posts.forEach(post => {
      const date = format(new Date(post.published_at), "yyyy-MM-dd");
      const existing = dataByDate.get(date) || { 
        date, 
        views: 0, 
        plays: 0, 
        likes: 0, 
        comments: 0, 
        shares: 0 
      };
      
      dataByDate.set(date, {
        date,
        views: existing.views + post.views,
        plays: existing.plays + post.plays,
        likes: existing.likes + post.likes,
        comments: existing.comments + post.comments,
        shares: existing.shares + post.shares
      });
    });

    setTimeSeriesData(Array.from(dataByDate.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ));
  };

  const exportData = () => {
    const csv = [
      ["Headline", "Views", "Plays", "Likes", "Comments", "Shares", "Engagement Rate", "Published At"],
      ...posts.map(p => [
        p.headline,
        p.views,
        p.plays,
        p.likes,
        p.comments,
        p.shares,
        p.engagement_rate.toFixed(2) + "%",
        format(new Date(p.published_at), "yyyy-MM-dd HH:mm")
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Analytics exported successfully");
  };

  const totalMetrics = {
    views: posts.reduce((sum, p) => sum + p.views, 0),
    plays: posts.reduce((sum, p) => sum + p.plays, 0),
    likes: posts.reduce((sum, p) => sum + p.likes, 0),
    comments: posts.reduce((sum, p) => sum + p.comments, 0),
    shares: posts.reduce((sum, p) => sum + p.shares, 0),
    avgEngagement: posts.length > 0 
      ? posts.reduce((sum, p) => sum + p.engagement_rate, 0) / posts.length 
      : 0
  };

  const topPosts = [...posts].sort((a, b) => b.views - a.views).slice(0, 5);
  const trendingPosts = [...posts].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 5);

  return (
    <div className="min-h-screen pb-20">
      <NavigationBar />
      
      <div className="container mx-auto px-4 pt-20 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your content performance</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                  >
                    Last 90 days
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button onClick={exportData} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-500" />
                <p className="text-2xl font-bold">{totalMetrics.views.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Plays</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-green-500" />
                <p className="text-2xl font-bold">{totalMetrics.plays.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Likes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <p className="text-2xl font-bold">{totalMetrics.likes.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-purple-500" />
                <p className="text-2xl font-bold">{totalMetrics.comments.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Shares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-orange-500" />
                <p className="text-2xl font-bold">{totalMetrics.shares.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-500" />
                <p className="text-2xl font-bold">{totalMetrics.avgEngagement.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="top-posts">Top Posts</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeSeriesData.map((data, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <p className="text-sm text-muted-foreground w-24">{format(new Date(data.date), "MMM dd")}</p>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${(data.views / Math.max(...timeSeriesData.map(d => d.views))) * 100}%` }}
                            />
                          </div>
                          <p className="text-sm font-medium w-16 text-right">{data.views}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top-posts" className="space-y-4">
            {topPosts.map((post, idx) => (
              <Card key={post.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{post.headline}</h3>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {post.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" /> {post.plays}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> {post.comments}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="w-3 h-3" /> {post.shares}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            {trendingPosts.map((post, idx) => (
              <Card key={post.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{post.headline}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-muted-foreground">
                          Engagement Rate: <span className="font-semibold text-foreground">{post.engagement_rate.toFixed(1)}%</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation />
    </div>
  );
}
