import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Music } from "lucide-react";
import type { MusicArtist } from "@/lib/musicService";
import { cn } from "@/lib/utils";

interface MusicSearchResultsProps {
  artists: MusicArtist[];
  loading: boolean;
  query: string;
}

export default function MusicSearchResults({
  artists,
  loading,
  query,
}: MusicSearchResultsProps) {
  const navigate = useNavigate();

  const handleArtistClick = (artist: MusicArtist) => {
    navigate(`/music/artist/${artist.id}?origin=music`);
  };

  if (loading) {
    return (
      <div className="mt-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl",
              "bg-white dark:bg-[#050816]",
              "border border-black/5 dark:border-white/5",
              "animate-pulse"
            )}
          >
            {/* Artist Image Skeleton */}
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-black/10 dark:bg-white/10" />
            
            {/* Artist Name Skeleton */}
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-1/2" />
            </div>
            
            {/* Arrow Skeleton */}
            <div className="flex-shrink-0 w-5 h-5 rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (query.trim().length < 2) {
    return null;
  }

  if (artists.length === 0) {
    return (
      <div className="mt-4 p-8 text-center rounded-xl bg-white dark:bg-[#050816] border border-black/5 dark:border-white/5">
        <Music className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">No artists found</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {artists.map((artist) => (
        <button
          key={artist.id}
          onClick={() => handleArtistClick(artist)}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-xl",
            "bg-white dark:bg-[#050816]",
            "border border-black/5 dark:border-white/5",
            "text-black dark:text-white",
            "hover:bg-black/5 dark:hover:bg-white/5",
            "transition-colors duration-200",
            "text-left"
          )}
        >
          {/* Artist Image */}
          <div className="flex-shrink-0 relative">
            {artist.imageUrl ? (
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="w-12 h-12 rounded-full object-cover border border-black/10 dark:border-white/10"
                onError={(e) => {
                  // Hide image and show fallback
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    const fallback = parent.querySelector('.artist-fallback') as HTMLElement;
                    if (fallback) fallback.classList.remove("hidden");
                  }
                }}
              />
            ) : null}
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                "bg-black/5 dark:bg-white/5",
                "text-black/20 dark:text-white/20",
                "text-2xl font-bold",
                "border border-black/10 dark:border-white/10",
                "artist-fallback",
                artist.imageUrl ? "hidden absolute inset-0" : ""
              )}
            >
              {artist.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Artist Name */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-base truncate">{artist.name}</p>
          </div>

          {/* Right Arrow */}
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

