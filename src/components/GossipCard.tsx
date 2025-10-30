import { cn } from "@/lib/utils";
import { PlayCircle, PauseCircle, MessageCircle, ArrowRightCircle, Heart } from "lucide-react";
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
      className="bg-card rounded-3xl overflow-hidden max-w-md w-full animate-scale-in relative"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      {/* Image with gradient overlay */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img src={imageUrl} alt={headline} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        {/* Floating content on image */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
          <h3 className="text-xl font-bold text-white leading-tight drop-shadow-lg">{headline}</h3>
          <p className="text-white/90 text-sm leading-relaxed drop-shadow-md line-clamp-3">{context}</p>
        </div>
      </div>

      {/* Floating Icon Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-full"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-soft)"
        }}
      >
        {/* Play/Pause Button */}
        <button
          onClick={onPlay}
          className={cn(
            "transition-all duration-300 hover:scale-110",
            isPlaying && "animate-pulse"
          )}
          style={isPlaying ? { 
            filter: "drop-shadow(0 0 8px hsl(var(--coral-glow)))" 
          } : {}}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <PauseCircle 
              className="w-10 h-10" 
              style={{ color: "hsl(var(--coral-active))" }}
            />
          ) : (
            <PlayCircle 
              className="w-10 h-10 text-muted-foreground hover:text-foreground transition-colors" 
            />
          )}
        </button>

        {/* Ask Fluxa Button */}
        <button
          onClick={onTellMore}
          className="transition-all duration-300 hover:scale-110"
          style={{
            color: "hsl(var(--muted-foreground))"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "hsl(var(--coral-active))";
            e.currentTarget.style.filter = "drop-shadow(0 0 8px hsl(var(--coral-glow)))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "hsl(var(--muted-foreground))";
            e.currentTarget.style.filter = "none";
          }}
          aria-label="Ask Fluxa"
        >
          <MessageCircle className="w-8 h-8" />
        </button>

        {/* Next Button */}
        <button
          onClick={onNext}
          className="transition-all duration-300 hover:scale-110"
          style={{
            color: "hsl(var(--muted-foreground))"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "hsl(var(--coral-active))";
            e.currentTarget.style.filter = "drop-shadow(0 0 8px hsl(var(--coral-glow)))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "hsl(var(--muted-foreground))";
            e.currentTarget.style.filter = "none";
          }}
          aria-label="Next gist"
        >
          <ArrowRightCircle className="w-8 h-8" />
        </button>
      </div>

      {/* Floating Heart (Favorite) */}
      <button
        onClick={handleFavoriteToggle}
        className={cn(
          "absolute top-4 right-4 p-2 rounded-full transition-all duration-300 hover:scale-110",
          isFavorited && "bg-white/20"
        )}
        style={isFavorited ? {
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        } : {}}
        aria-label="Favorite"
      >
        <Heart 
          className={cn(
            "w-6 h-6 transition-colors",
            isFavorited ? "fill-white text-white" : "text-white/80"
          )} 
        />
      </button>
    </div>
  );
};
