import React from "react";
import type { MusicItem } from "@/lib/musicService";
import { getArtworkForMusicItem } from "@/lib/musicService";

// Real Platform Icons - Brand colors in light mode, white in dark mode
const YouTubeIcon = ({ className = "", ...props }: { className?: string; [key: string]: any }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" className={className} {...props}>
    <path d="M23.5 6.2s-.2-1.6-.8-2.3c-.8-.9-1.7-.9-2.1-1C16.6 2.5 12 2.5 12 2.5h-.1s-4.6 0-8.6.4c-.4.1-1.3.1-2.1 1-.6.7-.8 2.3-.8 2.3S0 8.1 0 9.9v1.8c0 1.8.2 3.7.2 3.7s.2 1.6.8 2.3c.8.9 1.9.9 2.4 1 1.7.2 7.4.4 7.4.4s4.6 0 8.6-.4c.4-.1 1.3-.1 2.1-1 .6-.7.8-2.3.8-2.3s.2-1.8.2-3.7V9.9c.1-1.9-.1-3.7-.1-3.7zM9.8 13.6V7.7l6 2.9-6 3z" fill="currentColor"/>
  </svg>
);

const SpotifyIcon = ({ className = "", ...props }: { className?: string; [key: string]: any }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" className={className} {...props}>
    <path d="M12 0C5.372 0 0 5.373 0 12c0 6.628 5.372 12 12 12s12-5.372 12-12C24 5.373 18.628 0 12 0zm5.485 17.262a.747.747 0 0 1-1.028.25c-2.821-1.728-6.369-2.118-10.548-1.162a.75.75 0 1 1-.33-1.462c4.572-1.033 8.51-.583 11.606 1.344a.748.748 0 0 1 .3 1.03zm1.47-3.258a.94.94 0 0 1-1.29.314c-3.228-1.992-8.144-2.572-11.94-1.412a.94.94 0 1 1-.58-1.797c4.31-1.389 9.705-.75 13.39 1.586a.94.94 0 0 1 .42 1.309zm.13-3.41c-3.79-2.256-10.077-2.463-13.729-1.354a1.127 1.127 0 1 1-.674-2.155c4.27-1.336 11.3-1.1 15.656 1.562a1.126 1.126 0 0 1-1.253 1.947z" fill="currentColor"/>
  </svg>
);

const AppleMusicIcon = ({ className = "", ...props }: { className?: string; [key: string]: any }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" className={className} {...props}>
    <path d="M16.365 3.433a1 1 0 0 1 1.235.965v11.74a3.53 3.53 0 0 1-3.53 3.53c-1.947 0-3.53-1.583-3.53-3.53s1.583-3.53 3.53-3.53c.777 0 1.493.252 2.08.676V7.382l-6.47 1.248v9.536a3.53 3.53 0 1 1-2-3.178V6.316a1 1 0 0 1 .801-.98l8.884-1.703z" fill="currentColor"/>
  </svg>
);

function buildSearchUrl(base: string, artist: string, title: string) {
  return `${base}${encodeURIComponent(`${artist} ${title}`)}`;
}

export default function MusicCard({ item }: { item: MusicItem }) {
  const title = item.title ?? "Unknown track";
  const artist = item.artist ?? "Unknown artist";
  
  // Global-ready genre logic: use tags if available, otherwise "Global"
  const genre = item.tags && item.tags.length > 0 ? item.tags[0] : "Global";

  // Get artwork using the helper function (handles API images + curated fallbacks)
  const artworkUrl = getArtworkForMusicItem(item);

  // Debug log
  console.log("[MusicCard] artwork debug:", {
    id: item.id,
    title: title,
    source: item.source,
    hasImageUrl: !!item.imageUrl,
    artworkUrl: artworkUrl,
  });

  // Derive URLs from title + artist automatically
  const youtubeUrl = buildSearchUrl("https://www.youtube.com/results?search_query=", artist, title);
  const spotifyUrl = buildSearchUrl("https://open.spotify.com/search/", artist, title);
  const appleUrl = buildSearchUrl("https://music.apple.com/search?term=", artist, title);

  // Final render debug log
  console.log("[MusicCard] FINAL render:", {
    title: title,
    artworkUrl: artworkUrl,
  });

  // Fallback placeholder (only used if artworkUrl is missing)
  const fallback = "/img/placeholders/music-star.svg";

  return (
    <article className="flex flex-col rounded-3xl bg-white dark:bg-[#050816] border border-black/5 dark:border-white/5 shadow-lg overflow-hidden">
      {/* Top image - 4:3 ratio */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {artworkUrl ? (
          <img 
            src={artworkUrl} 
            className="w-full h-full object-cover"
            alt={`${title} by ${artist}`}
            loading="lazy"
            style={{
              display: 'block',
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-white/5 text-black/20 dark:text-white/20 text-5xl">
            ★
          </div>
        )}
      </div>

      <div className="p-4 md:p-5 space-y-3">
        {/* Title */}
        <div>
          <h3 className="font-semibold text-base md:text-lg line-clamp-2 text-black dark:text-white">{title}</h3>
          <p className="text-xs md:text-sm text-black/60 dark:text-white/60 mt-1">{artist}</p>
        </div>

        {/* Genre chip and category label */}
        <div className="flex items-center gap-2">
          <span className="bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full text-[11px] font-medium text-black/60 dark:text-white/70">
            {genre}
          </span>
          <span className="text-[11px] text-black/40 dark:text-white/30">
            {item.category === "trending" ? "Trending" : "Latest drop"}
          </span>
        </div>

        {/* Streaming icons row - Theme-adaptive with brand colors */}
        <div className="flex items-center gap-3 flex-wrap mt-3">
          <button
            onClick={() => window.open(youtubeUrl, "_blank", "noopener,noreferrer")}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-red-500/15 dark:bg-red-500/15 border border-red-500/40 dark:border-red-500/30 hover:bg-red-500/25 dark:hover:bg-red-500/25 transition-colors"
            aria-label="Open on YouTube"
          >
            <YouTubeIcon className="text-red-600 dark:text-white" />
          </button>

          <button
            onClick={() => window.open(spotifyUrl, "_blank", "noopener,noreferrer")}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-green-500/15 dark:bg-green-500/15 border border-green-500/40 dark:border-green-500/30 hover:bg-green-500/25 dark:hover:bg-green-500/25 transition-colors"
            aria-label="Open on Spotify"
          >
            <SpotifyIcon className="text-green-600 dark:text-white" />
          </button>

          <button
            onClick={() => window.open(appleUrl, "_blank", "noopener,noreferrer")}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-pink-500/20 dark:bg-pink-500/20 border border-pink-500/40 dark:border-pink-500/30 hover:bg-pink-500/30 dark:hover:bg-pink-500/30 transition-colors"
            aria-label="Open on Apple Music"
          >
            <AppleMusicIcon className="text-pink-600 dark:text-white" />
          </button>
        </div>
      </div>
    </article>
  );
}
