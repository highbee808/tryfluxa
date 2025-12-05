import React, { useState, useEffect } from "react";
import { X, Play, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { fetchArtistProfile } from "@/lib/musicService";
import type { Artist } from "@/lib/musicService";

interface ArtistQuickViewProps {
  artistId: string;
  onClose: () => void;
  isMobile?: boolean;
}

export default function ArtistQuickView({ artistId, onClose, isMobile = false }: ArtistQuickViewProps) {
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);

  console.log("[QuickView] artistId:", artistId);

  useEffect(() => {
    let cancelled = false;

    async function loadArtist() {
      setLoading(true);
      try {
        const data = await fetchArtistProfile(artistId);
        if (!cancelled) {
          setArtist(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("[ArtistQuickView] Error loading artist:", err);
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadArtist();

    return () => {
      cancelled = true;
    };
  }, [artistId]);

  const handleViewFullPage = () => {
    console.log("[QuickView] CTA clicked:", artistId);
    navigate(`/music/artist/${artistId}?origin=music`);
    if (onClose) onClose();
  };

  const topTracks = artist?.topTracks?.slice(0, 2) || [];

  if (isMobile) {
    // Mobile: Bottom sheet modal
    return (
      <div className="fixed inset-0 z-50 flex items-end">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Bottom Sheet */}
        <div className={cn(
          "relative w-full bg-white dark:bg-[#050816]",
          "rounded-t-3xl shadow-2xl",
          "max-h-[80vh] flex flex-col",
          "animate-in slide-in-from-bottom duration-300"
        )}>
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-[#050816] border-b border-black/10 dark:border-white/10 p-4 flex items-center justify-between z-10 flex-shrink-0">
            <h2 className="text-lg font-semibold text-black dark:text-white">Artist Preview</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5 text-black dark:text-white" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="overflow-y-auto max-h-[70vh] px-4 pb-24">
            {loading ? (
              <div className="space-y-4 pt-6">
                <div className="h-32 w-32 rounded-full bg-black/10 dark:bg-white/10 animate-pulse mx-auto" />
                <div className="h-6 bg-black/10 dark:bg-white/10 rounded w-3/4 mx-auto animate-pulse" />
              </div>
            ) : artist ? (
              <>
                {/* Artist Image */}
                <div className="flex justify-center mb-6 pt-4">
                  {artist.imageUrl ? (
                    <img
                      src={artist.imageUrl}
                      alt={artist.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-black/10 dark:border-white/10 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 text-4xl font-bold text-black/40 dark:text-white/40">
                      {artist.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Artist Name */}
                <h3 className="text-2xl font-bold text-center text-black dark:text-white mb-2">
                  {artist.name}
                </h3>

                {/* Genres */}
                {artist.genres && artist.genres.length > 0 && (
                  <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                    {artist.genres.slice(0, 3).map((genre, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Monthly Listeners (if available from stats) */}
                {artist.stats?.popularityScore !== undefined && (
                  <div className="text-center mb-6">
                    <p className="text-sm text-black/60 dark:text-white/60">
                      Popularity Score: <span className="font-semibold text-black dark:text-white">{artist.stats.popularityScore}</span>
                    </p>
                  </div>
                )}

                {/* Top Tracks */}
                {topTracks.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-black/80 dark:text-white/80 mb-3">
                      Top Tracks
                    </h4>
                    <div className="space-y-2">
                      {topTracks.map((track, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5"
                        >
                          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10">
                            <Play className="w-4 h-4 text-black/60 dark:text-white/60" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black dark:text-white truncate">
                              {track.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* View Full Page Button */}
                <button
                  onClick={handleViewFullPage}
                  className={cn(
                    "w-full flex items-center justify-center gap-2",
                    "px-6 py-3 rounded-xl",
                    "bg-black text-white dark:bg-white dark:text-black",
                    "font-semibold text-sm",
                    "hover:opacity-90 transition-opacity",
                    "mt-4"
                  )}
                >
                  <span>View Full Artist Page</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-black/60 dark:text-white/60">
                  Artist not found
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Hover card
  return (
    <div className={cn(
      "absolute z-50 w-80",
      "bg-white dark:bg-[#050816]",
      "border border-black/10 dark:border-white/10",
      "rounded-2xl shadow-2xl",
      "p-6",
      "animate-in fade-in slide-in-from-top-2 duration-200"
    )}>
      {loading ? (
        <div className="space-y-4">
          <div className="h-24 w-24 rounded-full bg-black/10 dark:bg-white/10 animate-pulse mx-auto" />
          <div className="h-5 bg-black/10 dark:bg-white/10 rounded w-3/4 mx-auto animate-pulse" />
        </div>
      ) : artist ? (
        <>
          {/* Close Button (Desktop) */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4 text-black/60 dark:text-white/60" />
          </button>

          {/* Artist Image */}
          <div className="flex justify-center mb-4">
            {artist.imageUrl ? (
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-black/10 dark:border-white/10 shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 text-3xl font-bold text-black/40 dark:text-white/40">
                {artist.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Artist Name */}
          <h3 className="text-xl font-bold text-center text-black dark:text-white mb-2">
            {artist.name}
          </h3>

          {/* Genres */}
          {artist.genres && artist.genres.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
              {artist.genres.slice(0, 3).map((genre, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Monthly Listeners */}
          {artist.stats?.popularityScore !== undefined && (
            <div className="text-center mb-4">
              <p className="text-xs text-black/60 dark:text-white/60">
                Popularity: <span className="font-semibold text-black dark:text-white">{artist.stats.popularityScore}</span>
              </p>
            </div>
          )}

          {/* Top Tracks */}
          {topTracks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-black/80 dark:text-white/80 mb-2">
                Top Tracks
              </h4>
              <div className="space-y-1.5">
                {topTracks.map((track, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-black/5 dark:bg-white/5"
                  >
                    <Play className="w-3 h-3 text-black/60 dark:text-white/60 flex-shrink-0" />
                    <p className="text-xs font-medium text-black dark:text-white truncate">
                      {track.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Full Page Button */}
          <button
            onClick={handleViewFullPage}
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "px-4 py-2 rounded-xl",
              "bg-black text-white dark:bg-white dark:text-black",
              "font-semibold text-xs",
              "hover:opacity-90 transition-opacity",
              "mt-2"
            )}
          >
            <span>View Full Artist Page</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-xs text-black/60 dark:text-white/60">
            Artist not found
          </p>
        </div>
      )}
    </div>
  );
}

