import { useState, useEffect } from "react";
import { GossipCard } from "@/components/GossipCard";
import { ChatBox } from "@/components/ChatBox";
import { StoryBubble } from "@/components/StoryBubble";
import { StoryViewer } from "@/components/StoryViewer";
import { NavigationBar } from "@/components/NavigationBar";
import { FluxaGreeting } from "@/components/FluxaGreeting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useEmblaCarousel from "embla-carousel-react";
import { useFluxaMemory } from "@/hooks/useFluxaMemory";
import { Card } from "@/components/ui/card";
import { requestNotificationPermission, sendFluxaAlert, fluxaNotifications } from "@/lib/notifications";
import { Sparkles } from "lucide-react";

interface Gist {
  id: string;
  headline: string;
  context: string;
  audio_url: string;
  image_url: string;
  topic_category: string;
  published_at?: string;
}

const Feed = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [desktopEmblaRef, desktopEmblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: "center",
    containScroll: "trimSnaps"
  });
  const [gists, setGists] = useState<Gist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [chatContext, setChatContext] = useState<{ topic: string; summary: string } | undefined>(undefined);
  const [greeting, setGreeting] = useState<string>("");
  const [isLoadingGreeting, setIsLoadingGreeting] = useState(true);
  const [dailyDrop, setDailyDrop] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyStartIndex, setStoryStartIndex] = useState(0);
  const [fluxaQuip, setFluxaQuip] = useState<string>("");
  const [newGistCount, setNewGistCount] = useState(0);
  const [showNewGistBanner, setShowNewGistBanner] = useState(false);
  const { updateGistHistory, getGreeting, getFluxaLine, getFavoriteCategory } = useFluxaMemory();

  // Request notification permission on load
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Fetch stories
  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStories(data || []);

      // Send notification if new stories available
      if (data && data.length > 0) {
        const notification = fluxaNotifications.newStories();
        sendFluxaAlert(notification.title, notification.body);
      }
    } catch (error) {
      console.error("Error fetching stories:", error);
    }
  };

  // Real-time subscription to new gists
  const subscribeToNewGists = () => {
    const channel = supabase
      .channel('gists-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gists',
          filter: 'status=eq.published'
        },
        (payload) => {
          console.log('New gist received:', payload);
          setGists((prev) => [payload.new as Gist, ...prev]);
          setNewGistCount((prev) => prev + 1);
          setShowNewGistBanner(true);
          setTimeout(() => setShowNewGistBanner(false), 5000);
          
          // Send notification
          const notification = fluxaNotifications.newStories();
          sendFluxaAlert("New Gist Alert! 🆕", "Fluxa just dropped fresh gist — tap to listen!");
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Fetch gists from backend
  useEffect(() => {
    const fetchGists = async () => {
      try {
        const favoriteCategory = await getFavoriteCategory();
        
        const { data, error } = await supabase.functions.invoke("fetch-feed", {
          body: { limit: 20 },
        });

        if (error) throw error;

        const selectedInterests = JSON.parse(localStorage.getItem("fluxaInterests") || "[]");
        
        let filteredGists = data.gists || [];
        
        // Filter by interests if any selected
        if (selectedInterests.length > 0) {
          filteredGists = filteredGists.filter((gist: Gist) =>
            selectedInterests.includes(gist.topic_category)
          );
        }

        // Personalized ranking based on favorite category
        const rankedGists = filteredGists.sort((a: Gist, b: Gist) => {
          const scoreA = (favoriteCategory && a.topic_category === favoriteCategory ? 5 : 0) +
                        (new Date(a.published_at || '').getTime() / 1000000);
          const scoreB = (favoriteCategory && b.topic_category === favoriteCategory ? 5 : 0) +
                        (new Date(b.published_at || '').getTime() / 1000000);
          return scoreB - scoreA;
        });

        setGists(rankedGists);
        setNewGistCount(0);
      } catch (error) {
        console.error("Error fetching gists:", error);
        toast.error("Failed to load gists");
      } finally {
        setIsLoading(false);
      }
    };

    const loadGreeting = async () => {
      setIsLoadingGreeting(true);
      const greetingText = await getGreeting();
      setGreeting(greetingText);
      setIsLoadingGreeting(false);
    };

    const loadDailyDrop = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase.functions.invoke("fluxa-daily-drop", {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (error) throw error;
        setDailyDrop(data);
      } catch (error) {
        console.error("Error loading daily drop:", error);
      }
    };

    fetchGists();
    loadGreeting();
    loadDailyDrop();
    fetchStories();
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToNewGists();
    
    return () => {
      unsubscribe();
    };
  }, []);

  // ✅ Handle mobile carousel selection
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setCurrentIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // ✅ Handle desktop carousel selection
  useEffect(() => {
    if (!desktopEmblaApi) return;

    const onSelect = () => {
      setCurrentIndex(desktopEmblaApi.selectedScrollSnap());
    };

    desktopEmblaApi.on("select", onSelect);
    onSelect();

    return () => {
      desktopEmblaApi.off("select", onSelect);
    };
  }, [desktopEmblaApi]);

  // Stop audio when changing cards
  useEffect(() => {
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
    }
  }, [currentIndex]);

  // Play or stop gist audio
  const handlePlay = async () => {
    if (!gists[currentIndex]) return;

    // Update memory when playing
    await updateGistHistory(gists[currentIndex]);

    if (isPlaying && currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
      setCurrentAudio(null);
      
      // Show idle Fluxa quip
      const idleLine = await getFluxaLine("idle", "tease");
      if (idleLine) setFluxaQuip(idleLine);
    } else {
      const audio = new Audio(gists[currentIndex].audio_url);
      audio.play();
      setIsPlaying(true);
      setCurrentAudio(audio);

      audio.onended = async () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        
        // Show after-gist Fluxa quip
        const afterLine = await getFluxaLine("after_gist", "funny");
        if (afterLine) setFluxaQuip(afterLine);
      };
    }
  };

  // Go to next gist
  const handleNext = () => {
    if (window.innerWidth >= 768) {
      desktopEmblaApi?.scrollNext();
    } else {
      emblaApi?.scrollNext();
    }
  };

  // "Ask Fluxa" button
  const handleTellMore = () => {
    if (!gists[currentIndex]) return;
    setChatContext({
      topic: gists[currentIndex].headline,
      summary: gists[currentIndex].context,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-4">
        <div className="loader mb-4" />
        <p className="text-muted-foreground text-sm animate-pulse">
          Fluxa's gathering the latest gists for you... 💅💬
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm pb-24 md:pt-24">
      {/* Navigation Bar */}
      <NavigationBar />

      {/* Story Viewer */}
      {showStoryViewer && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          initialIndex={storyStartIndex}
          onClose={() => setShowStoryViewer(false)}
        />
      )}

      {/* Main Content Container */}
      <div className="flex flex-col items-center justify-center px-4 py-8">
        {/* New Gist Banner */}
        {showNewGistBanner && (
          <div className="max-w-6xl w-full mb-4">
            <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-full shadow-lg animate-fade-in flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="font-medium">🆕 Fluxa just dropped fresh gist — tap to listen!</span>
            </div>
          </div>
        )}

        {/* New Gist Count */}
        {newGistCount > 0 && (
          <div className="max-w-6xl w-full mb-4 text-center">
            <span className="text-sm text-white/80">
              {newGistCount} new {newGistCount === 1 ? 'gist' : 'gists'} since your last visit 💕
            </span>
          </div>
        )}
        {/* Stories Row */}
        {stories.length > 0 && (
          <div className="w-full max-w-6xl mb-6 overflow-x-auto">
            <div className="flex gap-3 px-4 py-2">
              {stories.map((story, idx) => (
                <StoryBubble
                  key={story.id}
                  story={story}
                  onClick={() => {
                    setStoryStartIndex(idx);
                    setShowStoryViewer(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Fluxa Greeting with Personality */}
        <FluxaGreeting greeting={greeting} isLoading={isLoadingGreeting} />

        {/* Daily Drop */}
        {dailyDrop && (
          <Card className="max-w-6xl w-full p-4 mb-6 border-primary/30 bg-card animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💅</span>
              <h3 className="text-sm font-bold">Fluxa's Daily Drop</h3>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-line">
              {dailyDrop.message}
            </p>
          </Card>
        )}

        {/* Header */}
        <div className="mb-8 text-center animate-fade-in">
          <h1 className={`text-5xl font-bold text-foreground mb-2 ${currentIndex === 0 ? "animate-bounce" : ""}`}>
            Fluxa
          </h1>
          <p className="text-muted-foreground font-medium">
            {gists.length > 0 ? `${currentIndex + 1} of ${gists.length}` : "No gists available"}
          </p>
        </div>

        {/* Responsive Grid/Carousel */}
        {gists.length > 0 ? (
          <>
            {/* Mobile: Swipeable Carousel */}
            <div className="md:hidden overflow-hidden max-w-md w-full" ref={emblaRef}>
              <div className="flex">
                {gists.map((gist, index) => (
                  <div key={gist.id} className="flex-[0_0_100%] min-w-0 px-2 animate-fade-in-up">
                    <GossipCard
                      gistId={gist.id}
                      imageUrl={gist.image_url}
                      headline={gist.headline}
                      context={gist.context}
                      isPlaying={isPlaying && index === currentIndex}
                      onPlay={handlePlay}
                      onNext={handleNext}
                      onTellMore={handleTellMore}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop: 3-Card Carousel */}
            <div className="hidden md:block w-full max-w-7xl px-16" ref={desktopEmblaRef}>
              <div className="overflow-hidden">
                <div className="flex -ml-4">
                  {gists.map((gist, index) => (
                    <div key={gist.id} className="pl-4 flex-[0_0_33.333%] min-w-0">
                      <div 
                        className={`transition-all duration-500 ease-out ${
                          index === currentIndex 
                            ? "scale-105 opacity-100" 
                            : "scale-90 opacity-50"
                        }`}
                      >
                        <GossipCard
                          gistId={gist.id}
                          imageUrl={gist.image_url}
                          headline={gist.headline}
                          context={gist.context}
                          isPlaying={isPlaying && index === currentIndex}
                          onPlay={() => {
                            setCurrentIndex(index);
                            desktopEmblaApi?.scrollTo(index);
                            handlePlay();
                          }}
                          onNext={handleNext}
                          onTellMore={() => {
                            setCurrentIndex(index);
                            handleTellMore();
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground mt-10">
            <p className="text-lg mb-2">
              {JSON.parse(localStorage.getItem("fluxaInterests") || "[]").length > 0
                ? "No matching gists for your interests yet 😅"
                : "No gists available yet 😢"}
            </p>
            <p className="text-sm mb-4">
              {JSON.parse(localStorage.getItem("fluxaInterests") || "[]").length > 0
                ? "Try selecting different topics or generate some gists below"
                : "Generate some gists to get started"}
            </p>
            <button
              onClick={() => {
                window.location.href = "/admin";
              }}
              className="mt-4 px-6 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-all font-medium"
            >
              Go to Admin Panel
            </button>
          </div>
        )}

        {/* Fluxa Quip (appears after interactions) */}
        {fluxaQuip && (
          <Card className="max-w-6xl w-full p-3 mt-4 bg-accent/20 border-accent/30 animate-fade-in">
            <p className="text-xs text-center italic">💬 Fluxa: "{fluxaQuip}"</p>
          </Card>
        )}

        {/* Mobile Navigation Hint */}
        <p className="md:hidden mt-6 text-sm text-muted-foreground animate-fade-in font-medium">
          Swipe to explore more gists
        </p>
      </div>

      {/* Chat Box */}
      <ChatBox initialContext={chatContext} />
    </div>
  );
};

export default Feed;
