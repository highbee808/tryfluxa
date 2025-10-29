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
  const [filteredGists, setFilteredGists] = useState(mockGists);

  // ✅ Load user interests from localStorage and filter gists
  useEffect(() => {
    const savedInterests = JSON.parse(localStorage.getItem("fluxaInterests") || "[]");

    if (savedInterests.length > 0) {
      const filtered = mockGists.filter((gist) =>
        savedInterests.some((interest: string) => {
          const interestLower = interest.toLowerCase();
          return (
            gist.category?.toLowerCase().includes(interestLower) ||
            gist.headline.toLowerCase().includes(interestLower) ||
            gist.context.toLowerCase().includes(interestLower)
          );
        }),
      );

      setFilteredGists(filtered.length > 0 ? filtered : mockGists);
    } else {
      setFilteredGists(mockGists);
    }
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

  // ✅ Stop audio when changing cards
  useEffect(() => {
    stopGistAudio(setIsPlaying);
  }, [currentIndex]);

  // ✅ Play or stop gist audio
  const handlePlay = () => {
    if (isPlaying) {
      stopGistAudio(setIsPlaying);
    } else {
      playGistAudio(currentIndex, setIsPlaying);
    }
  };

  // ✅ Go to next gist
  const handleNext = () => {
    emblaApi?.scrollNext();
  };

  // ✅ “Tell me more” button
  const handleTellMore = () => {
    toast.info("Bestie relax 😂 Chat mode is loading...");
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="mb-8 text-center animate-fade-in">
        <h1 className={`text-5xl font-bold text-foreground mb-2 ${currentIndex === 0 ? "animate-bounce" : ""}`}>
          Fluxa
        </h1>
        <p className="text-muted-foreground font-medium">
          {filteredGists.length > 0 ? `${currentIndex + 1} of ${filteredGists.length}` : "Loading gists..."}
        </p>
      </div>

      {/* Swipeable Carousel */}
      {filteredGists.length > 0 ? (
        <div className="overflow-hidden max-w-md w-full" ref={emblaRef}>
          <div className="flex">
            {filteredGists.map((gist, index) => (
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
      ) : (
        <div className="text-center text-muted-foreground mt-10">
          <p>No matching gists found for your interests 😢</p>
          <button
            onClick={() => {
              localStorage.removeItem("fluxaInterests");
              window.location.href = "/";
            }}
            className="mt-4 underline text-primary font-medium"
          >
            Reset Interests
          </button>
        </div>
      )}

      {/* Navigation Hint */}
      <p className="mt-6 text-sm text-muted-foreground animate-fade-in font-medium">
        Swipe or tap “Next gist” to continue
      </p>
    </div>
  );
};

export default Feed;
