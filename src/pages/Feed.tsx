import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NewsCard } from "@/components/NewsCard";
import { NavigationBar } from "@/components/NavigationBar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ChatBox } from "@/components/ChatBox";
import { DesktopNavigationWidget } from "@/components/DesktopNavigationWidget";
import { DesktopRightWidgets } from "@/components/DesktopRightWidgets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface FeedItem {
  type: "news";
  data: {
    id: string;
    title: string;
    source: string;
    time: string;
    description?: string;
    url?: string;
    image?: string;
    category?: string;
    entityName?: string;
  };
}

const Feed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedGists, setLikedGists] = useState<string[]>([]);
  const [bookmarkedGists, setBookmarkedGists] = useState<string[]>([]);
  const [currentPlayingNewsId, setCurrentPlayingNewsId] = useState<string | null>(null);
  const [isNewsPlaying, setIsNewsPlaying] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<any>(null);
  const newsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState("for-you");

  useEffect(() => {
    const tab = location.state?.tab;
    if (tab === "bookmarks") {
      setActiveTab("bookmarks");
    }
  }, [location.state]);

  useEffect(() => {
    fetchFeed();
    fetchUserInteractions();
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("fetch-feed", {
        body: { limit: 20 }
      });

      if (error) throw error;

      if (data?.gists) {
        const items: FeedItem[] = data.gists.map((gist: any) => ({
          type: "news",
          data: {
            id: gist.id,
            title: gist.headline,
            source: gist.topic,
            time: new Date(gist.created_at).toLocaleDateString(),
            description: gist.context,
            url: gist.source_url,
            image: gist.image_url,
            category: gist.topic_category,
            entityName: gist.topic,
          }
        }));
        setFeedItems(items);
      }
    } catch (error) {
      console.error("Error fetching feed:", error);
      toast.error("Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInteractions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [likesRes, bookmarksRes] = await Promise.all([
        supabase.from("article_likes").select("article_id").eq("user_id", user.id),
        supabase.from("article_saves").select("article_id").eq("user_id", user.id)
      ]);

      if (likesRes.data) {
        setLikedGists(likesRes.data.map(l => l.article_id));
      }
      if (bookmarksRes.data) {
        setBookmarkedGists(bookmarksRes.data.map(b => b.article_id));
      }
    } catch (error) {
      console.error("Error fetching user interactions:", error);
    }
  };

  const handleLike = async (gistId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to like");
        return;
      }

      const isLiked = likedGists.includes(gistId);

      if (isLiked) {
        await supabase.from("article_likes").delete().eq("article_id", gistId).eq("user_id", user.id);
        setLikedGists(prev => prev.filter(id => id !== gistId));
      } else {
        await supabase.from("article_likes").insert({ article_id: gistId, user_id: user.id });
        setLikedGists(prev => [...prev, gistId]);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    }
  };

  const handleBookmark = async (gistId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to bookmark");
        return;
      }

      const isBookmarked = bookmarkedGists.includes(gistId);

      if (isBookmarked) {
        await supabase.from("article_saves").delete().eq("article_id", gistId).eq("user_id", user.id);
        setBookmarkedGists(prev => prev.filter(id => id !== gistId));
      } else {
        await supabase.from("article_saves").insert({ article_id: gistId, user_id: user.id });
        setBookmarkedGists(prev => [...prev, gistId]);
        toast.success("Bookmarked!");
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast.error("Failed to update bookmark");
    }
  };

  const handleNewsChat = (newsData: any) => {
    setSelectedNews(newsData);
    setIsChatOpen(true);
  };

  const bookmarkedItems = feedItems.filter(item => 
    bookmarkedGists.includes(item.data.id)
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <NavigationBar />
      
      <div className="flex-1 flex max-w-[2000px] mx-auto w-full">
        {/* Left Sidebar - Desktop Navigation */}
        <div className="hidden lg:block lg:w-72 xl:w-80 sticky top-0 h-screen overflow-y-auto border-r border-border pt-16">
          <DesktopNavigationWidget />
        </div>

        {/* Main Content */}
        <main className="flex-1 pb-20 lg:pb-8 pt-16">
          <div className="max-w-2xl mx-auto px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="for-you" className="flex-1">For You</TabsTrigger>
                <TabsTrigger value="bookmarks" className="flex-1">Bookmarks</TabsTrigger>
              </TabsList>

              <TabsContent value="for-you" className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : feedItems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No feed items available</p>
                  </div>
                ) : (
                  feedItems.map((item) => (
                    <NewsCard
                      key={`news-${item.data.id}`}
                      id={item.data.id}
                      title={item.data.title}
                      source={item.data.source}
                      time={item.data.time}
                      description={item.data.description}
                      url={item.data.url}
                      imageUrl={item.data.image}
                      category={item.data.category}
                      entityName={item.data.entityName}
                      isPlaying={currentPlayingNewsId === item.data.id && isNewsPlaying}
                      isLiked={likedGists.includes(item.data.id)}
                      isBookmarked={bookmarkedGists.includes(item.data.id)}
                      onPlay={async (audioUrl?: string) => {
                        if (currentPlayingNewsId === item.data.id && isNewsPlaying) {
                          newsAudioRef.current?.pause();
                          setIsNewsPlaying(false);
                          setCurrentPlayingNewsId(null);
                        } else {
                          if (newsAudioRef.current) newsAudioRef.current.pause();

                          if (audioUrl) {
                            const audio = new Audio(audioUrl);
                            newsAudioRef.current = audio;
                            audio.play();
                            setIsNewsPlaying(true);
                            setCurrentPlayingNewsId(item.data.id);
                            audio.onended = () => {
                              setIsNewsPlaying(false);
                              setCurrentPlayingNewsId(null);
                            };
                          } else {
                            toast.error("Audio not available");
                          }
                        }
                      }}
                      onLike={() => handleLike(item.data.id)}
                      onComment={() => handleNewsChat(item.data)}
                      onBookmark={() => handleBookmark(item.data.id)}
                      onShare={() => {
                        if (item.data.url) {
                          navigator.clipboard.writeText(item.data.url);
                          toast.success("Link copied!");
                        }
                      }}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="bookmarks" className="space-y-4">
                {bookmarkedItems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No bookmarked items yet</p>
                  </div>
                ) : (
                  bookmarkedItems.map((item) => (
                    <NewsCard
                      key={`bookmark-${item.data.id}`}
                      id={item.data.id}
                      title={item.data.title}
                      source={item.data.source}
                      time={item.data.time}
                      description={item.data.description}
                      url={item.data.url}
                      imageUrl={item.data.image}
                      category={item.data.category}
                      entityName={item.data.entityName}
                      isPlaying={currentPlayingNewsId === item.data.id && isNewsPlaying}
                      isLiked={likedGists.includes(item.data.id)}
                      isBookmarked={bookmarkedGists.includes(item.data.id)}
                      onPlay={async (audioUrl?: string) => {
                        if (currentPlayingNewsId === item.data.id && isNewsPlaying) {
                          newsAudioRef.current?.pause();
                          setIsNewsPlaying(false);
                          setCurrentPlayingNewsId(null);
                        } else {
                          if (newsAudioRef.current) newsAudioRef.current.pause();

                          if (audioUrl) {
                            const audio = new Audio(audioUrl);
                            newsAudioRef.current = audio;
                            audio.play();
                            setIsNewsPlaying(true);
                            setCurrentPlayingNewsId(item.data.id);
                            audio.onended = () => {
                              setIsNewsPlaying(false);
                              setCurrentPlayingNewsId(null);
                            };
                          } else {
                            toast.error("Audio not available");
                          }
                        }
                      }}
                      onLike={() => handleLike(item.data.id)}
                      onComment={() => handleNewsChat(item.data)}
                      onBookmark={() => handleBookmark(item.data.id)}
                      onShare={() => {
                        if (item.data.url) {
                          navigator.clipboard.writeText(item.data.url);
                          toast.success("Link copied!");
                        }
                      }}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Right Sidebar - Desktop Widgets */}
        <div className="hidden xl:block xl:w-80 sticky top-0 h-screen overflow-y-auto border-l border-border pt-16">
          <DesktopRightWidgets />
        </div>
      </div>

      <BottomNavigation />

      <ChatBox
        isOpen={isChatOpen}
        onOpenChange={(open) => {
          setIsChatOpen(open);
          if (!open) setSelectedNews(null);
        }}
        initialContext={selectedNews ? {
          topic: selectedNews.title,
          summary: selectedNews.description || selectedNews.title,
          requestId: selectedNews.id
        } : undefined}
      />
    </div>
  );
};

export default Feed;
