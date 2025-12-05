import React from "react";
import { Play, ExternalLink } from "lucide-react";
import type { Track } from "@/lib/musicService";
import { cn } from "@/lib/utils";

interface TrackRowProps {
  track: Track;
  index: number;
  onPlay?: (track: Track) => void;
}

export default function TrackRow({ track, index, onPlay }: TrackRowProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const buildSearchUrl = (platform: "youtube" | "spotify" | "apple", artist: string, title: string) => {
    const query = encodeURIComponent(`${artist} ${title}`);
    switch (platform) {
      case "youtube":
        return `https://www.youtube.com/results?search_query=${query}`;
      case "spotify":
        return `https://open.spotify.com/search/${query}`;
      case "apple":
        return `https://music.apple.com/search?term=${query}`;
    }
  };

  const handlePlay = () => {
    if (onPlay) {
      onPlay(track);
    } else {
      // Default: open YouTube search
      const url = buildSearchUrl("youtube", track.artist, track.name);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg",
        "bg-white dark:bg-[#050816]",
        "border border-black/5 dark:border-white/5",
        "hover:bg-black/5 dark:hover:bg-white/5",
        "transition-colors duration-200",
        "group"
      )}
    >
      {/* Track Number */}
      <span className="text-sm font-bold text-black/40 dark:text-white/40 w-6 text-center">
        {index + 1}
      </span>

      {/* Thumbnail */}
      <div className="flex-shrink-0 relative">
        {track.imageUrl ? (
          <img
            src={track.imageUrl}
            alt={track.name}
            className="w-12 h-12 rounded-lg object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <div
          className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            "bg-black/5 dark:bg-white/5",
            "text-black/20 dark:text-white/20",
            track.imageUrl ? "hidden" : ""
          )}
        >
          <Play className="w-5 h-5" />
        </div>
        {/* Play overlay on hover */}
        <button
          onClick={handlePlay}
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-black/40 dark:bg-white/40",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-200",
            "rounded-lg"
          )}
        >
          <Play className="w-6 h-6 text-white dark:text-black fill-white dark:fill-black" />
        </button>
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-base text-black dark:text-white truncate">
          {track.name}
        </div>
        {track.album && (
          <div className="text-sm text-black/60 dark:text-white/60 truncate">
            {track.album}
          </div>
        )}
      </div>

      {/* Duration */}
      <span className="text-sm text-black/40 dark:text-white/40">
        {formatDuration(track.duration)}
      </span>

      {/* Play Button */}
      <button
        onClick={handlePlay}
        className={cn(
          "p-2 rounded-full",
          "bg-black/5 dark:bg-white/5",
          "hover:bg-black/10 dark:hover:bg-white/10",
          "transition-colors duration-200",
          "flex-shrink-0"
        )}
        aria-label={`Play ${track.name}`}
      >
        <Play className="w-4 h-4 text-black dark:text-white" />
      </button>
    </div>
  );
}

