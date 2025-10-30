import { playGistAudio, stopGistAudio } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { Play, Pause, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFluxaMemory } from "@/hooks/useFluxaMemory";

interface GossipCardProps {
  imageUrl: string;
  headline: string;
  context: string;
  isPlaying: boolean;
  onPlay: () => void;
  onNext: () => void;
  onTellMore: () => void;
  gistId: string;
}

export const GossipCard = ({ imageUrl, headline, context, isPlaying, onPlay, onNext, onTellMore, gistId }: GossipCardProps) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const { toggleFavorite } = useFluxaMemory();

  useEffect(() => {
    checkFavorite();
  }, [gistId]);

  const checkFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_favorites")
      .select("*")
      .eq("user_id", user.id)
      .eq("gist_id", gistId)
      .single();

    setIsFavorited(!!data);
  };

  const handleFavoriteToggle = async () => {
    const result = await toggleFavorite(gistId);
    setIsFavorited(result);
  };
  return (
    <div
      className="bg-card rounded-3xl overflow-hidden max-w-md w-full animate-scale-in"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      {/* Image with gradient overlay */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img src={imageUrl} alt={headline} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground leading-tight">{headline}</h3>
          <p className="text-muted-foreground leading-relaxed">{context}</p>
        </div>

        {/* Play Button */}
        <button
          onClick={onPlay}
          disabled={isPlaying}
          className="w-full py-3 rounded-full font-fredoka font-bold transition-all hover:scale-105 shadow-md
    disabled:opacity-60 disabled:scale-100 bg-primary text-primary-foreground"
        >
          {isPlaying ? (
            <div className="flex items-center gap-2 justify-center">
              <span className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse"></span>
              <span className="w-2 h-2 bg-primary-foreground rounded-full animate-ping"></span>
              Playing...
            </div>
          ) : (
            "Play Gist"
          )}
        </button>

        {/* Quick Replies */}
        <div className="flex gap-3 items-center">
          <Button
            onClick={onTellMore}
            variant="outline"
            className="flex-1 rounded-xl border-2 hover:border-accent/50 hover:bg-accent/10 transition-all duration-200"
          >
            Ask Fluxa 💬
          </Button>
          <Button
            onClick={onNext}
            variant="outline"
            className="flex-1 rounded-xl border-2 hover:border-accent/50 hover:bg-accent/10 transition-all duration-200"
          >
            Next gist →
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFavoriteToggle}
            className={isFavorited ? "text-primary" : ""}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? "fill-current" : ""}`} />
          </Button>
        </div>
      </div>
    </div>
  );
};
