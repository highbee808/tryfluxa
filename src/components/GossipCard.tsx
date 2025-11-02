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
      className="bg-card rounded-[28px] overflow-hidden w-full animate-scale-in relative transition-all duration-500 hover:scale-[1.02]"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Image with gradient overlay */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={headline} 
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        {/* Floating content on image */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3 pb-20">
          <h3 className="text-2xl font-bold text-white leading-tight drop-shadow-2xl">{headline}</h3>
          <p className="text-white/95 text-sm leading-relaxed drop-shadow-lg line-clamp-3">{context}</p>
        </div>
      </div>

      {/* Floating Icon Controls */}
      <div 
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-300"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)"
        }}
      >
        {/* Play/Pause Button */}
        <button
          onClick={onPlay}
          className={cn(
            "transition-all duration-300 hover:scale-125 active:scale-95",
            isPlaying && "animate-pulse"
          )}
          style={isPlaying ? { 
            filter: "drop-shadow(0 0 8px hsl(var(--coral-glow)))" 
          } : {}}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <PauseCircle 
              className="w-8 h-8" 
              style={{ color: "hsl(var(--coral-active))" }}
            />
          ) : (
            <PlayCircle 
              className="w-8 h-8 text-muted-foreground hover:text-coral-active transition-colors" 
            />
          )}
        </button>

        {/* Ask Fluxa Button */}
        <button
          onClick={onTellMore}
          className="transition-all duration-300 hover:scale-125 active:scale-95"
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
          <MessageCircle className="w-7 h-7" />
        </button>

        {/* Next Button */}
        <button
          onClick={onNext}
          className="transition-all duration-300 hover:scale-125 active:scale-95"
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
          <ArrowRightCircle className="w-7 h-7" />
        </button>
      </div>

      {/* Floating Heart (Favorite) */}
      <button
        onClick={handleFavoriteToggle}
        className={cn(
          "absolute top-6 right-6 p-3 rounded-full transition-all duration-300 hover:scale-125 active:scale-95",
          isFavorited && "bg-white/30"
        )}
        style={isFavorited ? {
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 4px 12px hsl(0 0% 0% / 0.1)"
        } : {
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        aria-label="Favorite"
      >
        <Heart 
          className={cn(
            "w-7 h-7 transition-all duration-300",
            isFavorited ? "fill-white text-white scale-110" : "text-white/90"
          )} 
        />
      </button>
    </div>
  );
};
