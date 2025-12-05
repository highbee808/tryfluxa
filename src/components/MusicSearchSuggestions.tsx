import React, { useState, useRef, useEffect } from "react";
import { Clock, TrendingUp, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ArtistSearchResult } from "@/lib/musicService";
import ArtistQuickView from "./ArtistQuickView";

interface MusicSearchSuggestionsProps {
  query: string;
  suggestions: ArtistSearchResult[];
  recentSearches: Array<{ id: string; name: string; imageUrl?: string }>;
  trendingSearches: Array<{ id: string; name: string; imageUrl?: string }>;
  loading?: boolean;
  onArtistClick: (artist: ArtistSearchResult | { id: string; name: string; imageUrl?: string }) => void;
  onClearRecent?: (artistId: string) => void;
  isMobile?: boolean;
}

export default function MusicSearchSuggestions({
  query,
  suggestions,
  recentSearches,
  trendingSearches,
  loading = false,
  onArtistClick,
  onClearRecent,
  isMobile = false,
}: MusicSearchSuggestionsProps) {
  const navigate = useNavigate();
  const [hoveredArtistId, setHoveredArtistId] = useState<string | null>(null);
  const [quickViewArtistId, setQuickViewArtistId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Clear hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (artistId: string) => {
    if (isMobile) return; // No hover on mobile
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredArtistId(artistId);
    }, 300); // 300ms delay before showing quick view
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredArtistId(null);
  };

  const handleItemClick = (artist: ArtistSearchResult | { id: string; name: string; imageUrl?: string }) => {
    if (isMobile) {
      // Mobile: Open quick view modal
      setQuickViewArtistId(artist.id);
    } else {
      // Desktop: Navigate directly
      onArtistClick(artist);
    }
  };

  const handleQuickViewClose = () => {
    setQuickViewArtistId(null);
  };

  const renderArtistItem = (
    artist: ArtistSearchResult | { id: string; name: string; imageUrl?: string },
    showGenre: boolean = true
  ) => {
    const primaryGenre = 'genres' in artist && artist.genres && artist.genres.length > 0
      ? artist.genres[0]
      : null;

    return (
      <div
        key={artist.id}
        className="relative"
        onMouseEnter={() => !isMobile && handleMouseEnter(artist.id)}
        onMouseLeave={handleMouseLeave}
      >
        <button
          ref={(el) => {
            if (el) itemRefs.current.set(artist.id, el);
          }}
          onClick={() => handleItemClick(artist)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl",
            "hover:bg-black/5 dark:hover:bg-white/5",
            "transition-colors text-left",
            "group"
          )}
        >
          {/* Artist Image (50px rounded) */}
          <div className="flex-shrink-0 relative">
            {artist.imageUrl ? (
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="w-12 h-12 rounded-full object-cover border border-black/10 dark:border-white/10"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              "bg-black/5 dark:bg-white/5",
              "text-black/40 dark:text-white/40 text-sm font-medium",
              "border border-black/10 dark:border-white/10",
              artist.imageUrl ? "hidden absolute inset-0" : ""
            )}>
              {artist.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Artist Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-black dark:text-white truncate">
              {artist.name}
            </p>
            {showGenre && primaryGenre && (
              <p className="text-xs text-black/60 dark:text-white/60 truncate mt-0.5">
                {primaryGenre}
              </p>
            )}
          </div>
        </button>

        {/* Quick View (Desktop hover) */}
        {!isMobile && hoveredArtistId === artist.id && (
          <div className="absolute left-full ml-4 top-0 z-50">
            <ArtistQuickView
              artistId={artist.id}
              onClose={() => setHoveredArtistId(null)}
              isMobile={false}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={cn(
        "absolute top-full left-0 right-0 mt-2 z-50",
        "bg-white dark:bg-[#050816]",
        "border border-black/10 dark:border-white/10",
        "rounded-2xl shadow-xl",
        "max-h-[400px] overflow-y-auto",
        "opacity-100 transition-opacity duration-200"
      )}>
        {/* Suggestions Section (when typing) */}
        {query.trim().length >= 2 && (
          <div className="p-4">
            {loading ? (
              <div className="p-4 text-center">
                <p className="text-sm text-black/60 dark:text-white/60">Searching...</p>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-1">
                {suggestions.map((artist, index) => (
                  <React.Fragment key={artist.id}>
                    {renderArtistItem(artist, true)}
                    {index < suggestions.length - 1 && (
                      <div className="h-px bg-black/5 dark:bg-white/5 mx-3" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-black/60 dark:text-white/60">
                  No artists found
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recent Searches + Trending (when empty) */}
        {query.trim().length === 0 && (
          <div className="p-4 space-y-6">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-black/60 dark:text-white/60" />
                  <h3 className="text-sm font-semibold text-black/80 dark:text-white/80">
                    Recent Searches
                  </h3>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((artist) => (
                    <div key={artist.id} className="relative group">
                      {renderArtistItem(artist, false)}
                      {onClearRecent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onClearRecent(artist.id);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 z-10"
                          aria-label="Remove from recent searches"
                        >
                          <X className="w-3 h-3 text-black/40 dark:text-white/40" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            {trendingSearches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-black/60 dark:text-white/60" />
                  <h3 className="text-sm font-semibold text-black/80 dark:text-white/80">
                    Trending Searches
                  </h3>
                </div>
                <div className="space-y-1">
                  {trendingSearches.map((artist) => (
                    <React.Fragment key={artist.id}>
                      {renderArtistItem(artist, false)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick View Modal (Mobile) */}
      {isMobile && quickViewArtistId && (
        <ArtistQuickView
          artistId={quickViewArtistId}
          onClose={handleQuickViewClose}
          isMobile={true}
        />
      )}
    </>
  );
}

