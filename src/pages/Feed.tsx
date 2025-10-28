import { useState, useEffect, useRef } from "react";
import { GossipCard } from "@/components/GossipCard";
import { mockGists } from "@/data/mockGists";
import { AudioPlayer } from "@/lib/audio";
import { toast } from "sonner";

const Feed = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
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
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
      audioPlayerRef.current.load(mockGists[currentIndex].audioUrl);
      setIsPlaying(false);
    }
  }, [currentIndex]);

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
    setCurrentIndex((prev) => (prev + 1) % mockGists.length);
  };

  const handleTellMore = () => {
    toast.info("Conversational responses coming soon! 💬");
  };

  const currentGist = mockGists[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-8 text-center animate-fade-in">
        <h1 className="text-4xl font-bold text-foreground mb-2">Fluxa</h1>
        <p className="text-muted-foreground">
          {currentIndex + 1} of {mockGists.length}
        </p>
      </div>

      {/* Gossip Card */}
      <GossipCard
        imageUrl={currentGist.imageUrl}
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
