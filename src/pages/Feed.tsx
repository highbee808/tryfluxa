import { useState, useEffect, useRef } from "react";
import { FeedCard } from "@/components/FeedCard";
import { NavigationBar } from "@/components/NavigationBar";
import { ChatBox } from "@/components/ChatBox";
import { useFluxaMemory } from "@/hooks/useFluxaMemory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Headphones, TrendingUp } from "lucide-react";

interface Gist {
  id: string;
  headline: string;
  context: string;
  audio_url: string;
  image_url: string | null;
  topic: string;
  published_at?: string;
}

const Feed = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [gists, setGists] = useState<Gist[]>([]);
  const [loading, setLoading] = useState(true);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const [chatContext, setChatContext] = useState<{ topic: string; summary: string } | undefined>(undefined);
  const [likedGists, setLikedGists] = useState<string[]>([]);
  const [bookmarkedGists, setBookmarkedGists] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const fluxaMemory = useFluxaMemory();

  const categories = ["All", "Technology", "Lifestyle", "Science", "Media", "Productivity"];

  useEffect(() => {
    const loadGists = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        let query = supabase
          .from("gists")
          .select("*")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(20);

        const { data, error } = await query;

        if (error) throw error;

        if (data) {
          setGists(data);
          
          // Load user's bookmarked gists
          if (user) {
            const { data: favorites } = await supabase
              .from("user_favorites")
              .select("gist_id")
              .eq("user_id", user.id);
            
            if (favorites) {
              setBookmarkedGists(favorites.map(f => f.gist_id));
            }
          }
        }
      } catch (error) {
        console.error("Error loading gists:", error);
        toast.error("Failed to load feed");
      } finally {
        setLoading(false);
      }
    };

    loadGists();
  }, []);

  const handlePlay = async (gistId: string, audioUrl: string) => {
    if (currentPlayingId === gistId && isPlaying) {
      // Pause current
      if (currentAudio.current) {
        currentAudio.current.pause();
      }
      setIsPlaying(false);
      setCurrentPlayingId(null);
    } else {
      // Stop previous and play new
      if (currentAudio.current) {
        currentAudio.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      currentAudio.current = audio;
      audio.play();
      setIsPlaying(true);
      setCurrentPlayingId(gistId);

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentPlayingId(null);
      };
    }
  };

  const handleLike = (gistId: string) => {
    setLikedGists(prev => 
      prev.includes(gistId) ? prev.filter(id => id !== gistId) : [...prev, gistId]
    );
  };

  const handleBookmark = async (gistId: string) => {
    await fluxaMemory.toggleFavorite(gistId);
    setBookmarkedGists(prev => 
      prev.includes(gistId) ? prev.filter(id => id !== gistId) : [...prev, gistId]
    );
  };

  const handleTellMore = (gist: Gist) => {
    setChatContext({
      topic: gist.headline,
      summary: gist.context
    });
  };

  const handleShare = () => {
    toast.success("Link copied to clipboard!");
  };

  const filteredGists: Gist[] = selectedCategory === "All" 
    ? gists 
    : gists.filter(g => g.topic === selectedCategory);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading your personalized feed...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24 md:pb-8 md:pt-20">
      <NavigationBar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Banner */}
        <div className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 text-white shadow-xl animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Headphones className="w-6 h-6" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Your Personalized Feed</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Discover curated content tailored just for you. Click play to listen!
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 animate-fade-in">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              className="pl-10 bg-card h-12 border-border"
            />
          </div>
          <Button variant="outline" className="bg-card border-border">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide animate-fade-in">
          {categories.map((category) => (
            <Badge
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`cursor-pointer whitespace-nowrap px-4 py-2 text-sm transition-all ${
                selectedCategory === category
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                  : "bg-card text-foreground hover:bg-accent border border-border"
              }`}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Feed Grid */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Main Feed */}
          <div className="space-y-6">
            {filteredGists.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No gists available yet</p>
                <Button onClick={() => window.location.href = '/admin'}>
                  Go to Admin Panel
                </Button>
              </Card>
            ) : (
              filteredGists.map((gist) => (
                <FeedCard
                  key={gist.id}
                  id={gist.id}
                  imageUrl={gist.image_url || undefined}
                  headline={gist.headline}
                  context={gist.context}
                  author="Fluxa"
                  timeAgo="2h ago"
                  category={gist.topic}
                  readTime="5 min"
                  likes={Math.floor(Math.random() * 1000)}
                  comments={Math.floor(Math.random() * 200)}
                  bookmarks={Math.floor(Math.random() * 300)}
                  isPlaying={currentPlayingId === gist.id && isPlaying}
                  isLiked={likedGists.includes(gist.id)}
                  isBookmarked={bookmarkedGists.includes(gist.id)}
                  onPlay={() => handlePlay(gist.id, gist.audio_url)}
                  onLike={() => handleLike(gist.id)}
                  onComment={() => handleTellMore(gist)}
                  onBookmark={() => handleBookmark(gist.id)}
                  onShare={handleShare}
                />
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Trending Topics */}
              <Card className="shadow-lg border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Trending Topics</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { topic: "AI Revolution", posts: "1.2k posts" },
                      { topic: "Audio Content", posts: "856 posts" },
                      { topic: "Digital Wellness", posts: "643 posts" },
                      { topic: "Voice Tech", posts: "521 posts" },
                      { topic: "Productivity", posts: "412 posts" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="p-3 bg-accent/50 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      >
                        <p className="text-sm font-medium">{item.topic}</p>
                        <p className="text-xs text-muted-foreground">{item.posts}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* User Stats */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Your Activity</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-blue-100">Articles Read</p>
                      <p className="text-2xl font-bold">247</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-100">Hours Listened</p>
                      <p className="text-2xl font-bold">18.5</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-100">Bookmarks</p>
                      <p className="text-2xl font-bold">{bookmarkedGists.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Box */}
      <ChatBox initialContext={chatContext} />
    </div>
  );
};

export default Feed;
