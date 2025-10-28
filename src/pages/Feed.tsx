import { useState, useEffect, useRef } from "react";
import { GossipCard } from "@/components/GossipCard";
import { AudioPlayer } from "@/lib/audio";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Gist {
  id: string;
  headline: string;
  context: string;
  image_url: string;
  audio_url: string;
}

const Feed = () => {
  const [gists, setGists] = useState<Gist[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    const fetchGists = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fetch-feed", {
          body: { limit: 20 },
        });

        if (error) throw error;

        setGists(data.gists || []);
        
        if (data.gists && data.gists.length === 0) {
          toast.info("No gists available yet. Visit /admin to create some!");
        }
      } catch (error: any) {
        console.error("Failed to fetch gists:", error);
        toast.error("Failed to load gists");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGists();

    audioPlayerRef.current = new AudioPlayer();
    audioPlayerRef.current.onEnd(() => {
      setIsPlaying(false);
      toast.success("Gist finished! What's next?");
    });

    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    // Load new audio when card changes
    if (audioPlayerRef.current && gists.length > 0) {
      audioPlayerRef.current.stop();
      audioPlayerRef.current.load(gists[currentIndex].audio_url);
      setIsPlaying(false);
    }
  }, [currentIndex, gists]);

  const handlePlay = () => {
    if (!audioPlayerRef.current) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    if (gists.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % gists.length);
  };

  const handleTellMore = () => {
    toast.info("Conversational responses coming soon! 💬");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading gists...</p>
      </div>
    );
  }

  if (gists.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">No Gists Yet</h1>
        <p className="text-muted-foreground mb-6">
          Visit the admin page to create your first gist
        </p>
        <button
          onClick={() => window.location.href = "/admin"}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          Go to Admin
        </button>
      </div>
    );
  }

  const currentGist = gists[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-8 text-center animate-fade-in">
        <h1 className="text-4xl font-bold text-foreground mb-2">Fluxa</h1>
        <p className="text-muted-foreground">
          {currentIndex + 1} of {gists.length}
        </p>
      </div>

      {/* Gossip Card */}
      <GossipCard
        imageUrl={currentGist.image_url}
        headline={currentGist.headline}
        context={currentGist.context}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onNext={handleNext}
        onTellMore={handleTellMore}
      />

      {/* Navigation Hint */}
      <p className="mt-6 text-sm text-muted-foreground animate-fade-in">
        Swipe or tap "Next gist" to continue
      </p>
    </div>
  );
};

export default Feed;
