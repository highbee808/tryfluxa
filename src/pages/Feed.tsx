import { useState, useEffect } from "react";
import { GossipCard } from "@/components/GossipCard";
import { playGistAudio, stopGistAudio } from "@/lib/audio";
import { mockGists } from "@/data/mockGists";
import { toast } from "sonner";
import useEmblaCarousel from "embla-carousel-react";

const Feed = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

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

  // ✅ Stop audio when changing cards
  useEffect(() => {
    stopGistAudio(() => setIsPlaying(false));
  }, [currentIndex]);

  // ✅ Play or stop gist audio
  const handlePlay = () => {
    if (isPlaying) {
      stopGistAudio(() => setIsPlaying(false));
    } else {
      playGistAudio(currentIndex, () => setIsPlaying(true));
    }
  };

  // ✅ Go to next gist
  const handleNext = () => {
    emblaApi?.scrollNext();
  };

  // ✅ “Tell me more” button
  const handleTellMore = () => {
    toast.info("Conversational mode coming soon 💬");
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-8 text-center animate-fade-in">
        <h1 className="text-5xl font-bold text-foreground mb-2">Fluxa</h1>
        <p className="text-muted-foreground font-medium">
          {currentIndex + 1} of {mockGists.length}
        </p>
      </div>

      {/* Swipeable Carousel */}
      <div className="overflow-hidden max-w-md w-full" ref={emblaRef}>
        <div className="flex">
          {mockGists.map((gist, index) => (
            <div key={gist.id} className="flex-[0_0_100%] min-w-0">
              <GossipCard
                imageUrl={gist.imageUrl}
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

      {/* Navigation Hint */}
      <p className="mt-6 text-sm text-muted-foreground animate-fade-in font-medium">
        Swipe or tap “Next gist” to continue
      </p>
    </div>
  );
};

export default Feed;
