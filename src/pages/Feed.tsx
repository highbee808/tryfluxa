import { useState, useEffect } from "react";
import { GossipCard } from "@/components/GossipCard";
import { ChatBox } from "@/components/ChatBox";
import { StoryBubble } from "@/components/StoryBubble";
import { StoryViewer } from "@/components/StoryViewer";
import { stopGistAudio } from "@/lib/audio";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useEmblaCarousel from "embla-carousel-react";
import { Brain, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFluxaMemory } from "@/hooks/useFluxaMemory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requestNotificationPermission, sendFluxaAlert, fluxaNotifications } from "@/lib/notifications";

interface Gist {
  id: string;
  headline: string;
  context: string;
  audio_url: string;
  image_url: string;
  topic_category: string;
}

const Feed = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [gists, setGists] = useState<Gist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [chatContext, setChatContext] = useState<{ topic: string; summary: string } | undefined>(undefined);
  const [greeting, setGreeting] = useState<string>("Hey bestie! 👋");
  const [dailyDrop, setDailyDrop] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyStartIndex, setStoryStartIndex] = useState(0);
  const { updateGistHistory, getGreeting } = useFluxaMemory();

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

  // Fetch gists from backend
  useEffect(() => {
    const fetchGists = async () => {
      try {
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

        setGists(filteredGists);
      } catch (error) {
        console.error("Error fetching gists:", error);
        toast.error("Failed to load gists");
      } finally {
        setIsLoading(false);
      }
    };

    const loadGreeting = async () => {
      const greetingText = await getGreeting();
      setGreeting(greetingText);
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
  }, []);

  // ✅ Handle carousel selection
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
    } else {
      const audio = new Audio(gists[currentIndex].audio_url);
      audio.play();
      setIsPlaying(true);
      setCurrentAudio(audio);

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      };
    }
  };

  // Go to next gist
  const handleNext = () => {
    emblaApi?.scrollNext();
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
    <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-4">
      {/* Story Viewer */}
      {showStoryViewer && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          initialIndex={storyStartIndex}
          onClose={() => setShowStoryViewer(false)}
        />
      )}

      {/* Stories Row */}
      {stories.length > 0 && (
        <div className="w-full max-w-md mb-4 overflow-x-auto">
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

      {/* Greeting Card */}
      {greeting && (
        <Card className="max-w-md w-full p-4 mb-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 animate-fade-in">
          <p className="text-sm font-medium text-center">{greeting}</p>
        </Card>
      )}

      {/* Daily Drop */}
      {dailyDrop && (
        <Card className="max-w-md w-full p-4 mb-4 border-primary/30 bg-card animate-fade-in-up">
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
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => navigate("/fluxa-mode")}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-full font-medium hover:bg-accent/90 transition-all hover:scale-105 shadow-soft"
          >
            💬 Chat with Fluxa
          </button>
          <Button
            onClick={() => navigate("/memory")}
            variant="outline"
            size="sm"
          >
            <Brain className="w-4 h-4 mr-2" />
            Memory
          </Button>
          <Button
            onClick={() => navigate("/live")}
            variant="outline"
            size="sm"
          >
            <Radio className="w-4 h-4 mr-2" />
            Live
          </Button>
        </div>
        <h1 className={`text-5xl font-bold text-foreground mb-2 ${currentIndex === 0 ? "animate-bounce" : ""}`}>
          Fluxa
        </h1>
        <p className="text-muted-foreground font-medium">
          {gists.length > 0 ? `${currentIndex + 1} of ${gists.length}` : "No gists available"}
        </p>
      </div>

      {/* Swipeable Carousel */}
      {gists.length > 0 ? (
        <div className="overflow-hidden max-w-md w-full" ref={emblaRef}>
          <div className="flex">
            {gists.map((gist, index) => (
              <div key={gist.id} className="flex-[0_0_100%] min-w-0 animate-fade-in-up">
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

      {/* Navigation Hint */}
      <p className="mt-6 text-sm text-muted-foreground animate-fade-in font-medium">
        Swipe or tap "Next gist" to continue
      </p>

      {/* Chat Box */}
      <ChatBox initialContext={chatContext} />
    </div>
  );
};

export default Feed;
