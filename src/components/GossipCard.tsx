import React from "react";
import Image from "next/image";
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

export const GossipCard: React.FC<GossipCardProps> = ({
  imageUrl,
  headline,
  context,
  isPlaying,
  onPlay,
  onNext,
  onTellMore,
}) => {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg transform transition-all duration-300 ease-out
      hover:scale-[1.01] animate-slide-in bg-background border border-border"
    >
      <div className="relative w-full h-64">
        <Image src={imageUrl} alt={headline} fill className="object-cover" />
      </div>

      <div className="p-5 flex flex-col gap-3">
        <h2 className="text-2xl font-bold leading-tight text-foreground">{headline}</h2>

        <p className="text-base text-muted-foreground whitespace-pre-line">{context}</p>

        {/* Play Button */}
        <Button
          onClick={onPlay}
          disabled={isPlaying}
          className="w-full py-3 rounded-full font-extrabold transition-all hover:scale-105
          disabled:opacity-60 bg-primary text-primary-foreground shadow-md"
        >
          {isPlaying ? (
            <div className="flex items-center gap-2 justify-center">
              <span className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-primary-foreground rounded-full animate-ping" />
              Playing...
            </div>
          ) : (
            "Play Gist"
          )}
        </Button>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground font-medium">
          <button onClick={onTellMore} className="hover:underline">
            Tell me more
          </button>

          <button onClick={onNext} className="hover:underline text-right">
            Next gist →
          </button>
        </div>
      </div>
    </div>
  );
};
