import React from "react";
import { Music } from "lucide-react";
import type { Album } from "@/lib/musicService";
import { cn } from "@/lib/utils";

interface AlbumCardProps {
  album: Album;
  onClick?: (album: Album) => void;
}

export default function AlbumCard({ album, onClick }: AlbumCardProps) {
  return (
    <button
      onClick={() => onClick?.(album)}
      className={cn(
        "text-left group",
        "transition-transform duration-200",
        "hover:scale-105"
      )}
    >
      <div className="aspect-square rounded-xl bg-black/5 dark:bg-white/5 mb-3 overflow-hidden relative">
        {album.imageUrl ? (
          <img
            src={album.imageUrl}
            alt={album.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            "bg-black/5 dark:bg-white/5",
            "text-black/20 dark:text-white/20",
            album.imageUrl ? "hidden" : ""
          )}
        >
          <Music className="w-12 h-12" />
        </div>
      </div>
      <div className="font-medium text-sm text-black dark:text-white line-clamp-2 mb-1">
        {album.name}
      </div>
      {album.year && (
        <div className="text-xs text-black/40 dark:text-white/40">
          {album.year}
        </div>
      )}
    </button>
  );
}

