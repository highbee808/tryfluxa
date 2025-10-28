import { playGistAudio, stopGistAudio } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GossipCardProps {
  imageUrl: string;
  headline: string;
  context: string;
  isPlaying: boolean;
  onPlay: () => void;
  onNext: () => void;
  onTellMore: () => void;
}

export const GossipCard = ({
  imageUrl,
  headline,
  context,
  isPlaying,
  onPlay,
  onNext,
  onTellMore,
}: GossipCardProps) => {
  return (
    <div className="bg-card rounded-3xl overflow-hidden max-w-md w-full animate-scale-in" style={{ boxShadow: 'var(--shadow-soft)' }}>
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={imageUrl}
          alt={headline}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground leading-tight">
            {headline}
          </h3>
          <p className="text-muted-foreground leading-relaxed">{context}</p>
        </div>

        {/* Play Button */}
        <Button
  onClick={onPlay}
  disabled={isPlaying}
  ...
>
  {isPlaying ? "Playing..." : "Play Gist"}
</Button>


        {/* Quick Replies */}
        <div className="flex gap-3">
          <Button
            onClick={onTellMore}
            variant="outline"
            className="flex-1 rounded-xl border-2 hover:border-accent/50 hover:bg-accent/10 transition-all duration-200"
          >
            Tell me more
          </Button>
          <Button
            onClick={onNext}
            variant="outline"
            className="flex-1 rounded-xl border-2 hover:border-accent/50 hover:bg-accent/10 transition-all duration-200"
          >
            Next gist →
          </Button>
        </div>
      </div>
    </div>
  );
};
