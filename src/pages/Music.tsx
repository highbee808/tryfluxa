import { useEffect, useState, useCallback, useMemo } from "react";
import {
  fetchTrendingMusic,
  fetchLatestReleases,
  getArtworkForMusicItem,
  type MusicItem,
} from "@/lib/musicService";
import MusicCard from "@/components/MusicCard";
import MusicSearchBar from "@/components/MusicSearchBar";
import BottomNavigation from "@/components/BottomNavigation";
import { Card } from "@/components/ui/card";
import { Music as MusicIcon, TrendingUp, Calendar } from "lucide-react";
import { loadMusicKit } from "@/lib/apple/musickit";
import { searchAppleMusic } from "@/lib/apple/search";
import { playPreview, pausePreview } from "@/lib/apple/player";

type MusicState = {
  trending: MusicItem[];
  latest: MusicItem[];
  loading: boolean;
  error?: string;
};

const initialState: MusicState = {
  trending: [],
  latest: [],
  loading: true,
};

// Skeleton loader component matching MusicCard 2.1 theme-aware design
const SkeletonCard = () => (
  <div className="flex flex-col rounded-3xl bg-white dark:bg-[#050816] border border-black/5 dark:border-white/5 shadow-lg overflow-hidden animate-pulse">
    <div className="aspect-[4/3] bg-black/5 dark:bg-white/5"></div>
    <div className="p-4 md:p-5 space-y-3">
      <div>
        <div className="h-5 bg-black/10 dark:bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-black/5 dark:bg-white/5 rounded w-1/2"></div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-5 bg-black/5 dark:bg-white/5 rounded-full w-16"></div>
        <div className="h-4 bg-black/5 dark:bg-white/5 rounded w-20"></div>
      </div>
      <div className="flex items-center gap-3 flex-wrap mt-3">
        <div className="h-9 w-9 rounded-full bg-black/5 dark:bg-white/5"></div>
        <div className="h-9 w-9 rounded-full bg-black/5 dark:bg-white/5"></div>
        <div className="h-9 w-9 rounded-full bg-black/5 dark:bg-white/5"></div>
      </div>
    </div>
  </div>
);

export default function Music() {
  const [state, setState] = useState<MusicState>(initialState);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);

  // Load music data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch all data in parallel using Promise.allSettled
        const [trendingResult, latestResult] = await Promise.allSettled([
          fetchTrendingMusic(),
          fetchLatestReleases(),
        ]);

        if (cancelled) return;

        // Extract results safely
        const trending =
          trendingResult.status === "fulfilled" && trendingResult.value
            ? trendingResult.value
            : [];

        const latest =
          latestResult.status === "fulfilled" && latestResult.value
            ? latestResult.value
            : [];

        // Single setState call
        setState({
          trending,
          latest,
          loading: false,
          error: undefined,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[Music] Error loading music data:", err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Could not load music feed. Please try again later.",
        }));
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []); // IMPORTANT: no dependencies, runs once

  useEffect(() => {
    loadMusicKit().catch((err) =>
      console.error("[Music] MusicKit load failed:", err),
    );
  }, []);

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);

    if (q.length < 2) return;
    const data = await searchAppleMusic(q);
    setResults(data);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 pb-32 md:pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <MusicIcon className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">Music</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Your personalized music hub
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
        {/* Search Bar */}
        <div className="sticky top-4 z-10">
          <MusicSearchBar placeholder="who's your fav?" />
        </div>

        {/* Error Message */}
        {state.error && (
          <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {state.error}
            </p>
          </Card>
        )}

        {/* Regular Content */}
        <>
            {/* Latest Drops Section */}
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Latest Drops
              </h2>
              {state.loading ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : state.latest.length === 0 ? (
                <Card className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    No recent releases available.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {state.latest.map((item) => {
                    // Debug log for Latest Drops section (for consistency)
                    const artwork = getArtworkForMusicItem(item);
                    console.log("[Latest] FINAL render:", {
                      title: item.title,
                      artwork: artwork,
                      source: item.source,
                    });
                    
                    return (
                      <MusicCard key={item.id} item={item} />
                    );
                  })}
                </div>
              )}
            </section>

        </>

        <div className="apple-music-section mt-10 space-y-4">
          <h2 className="section-title text-xl font-semibold">
            Apple Music Search
          </h2>

          <input
            value={query}
            onChange={handleSearch}
            placeholder="Search Apple Music…"
            className="apple-music-search w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          <div className="apple-results grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results?.results?.songs?.data?.map((song: any) => (
              <div
                key={song.id}
                className="apple-song-card flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
                onClick={() => playPreview(song.id)}
              >
                <img
                  src={song.attributes.artwork.url
                    .replace("{w}", "200")
                    .replace("{h}", "200")}
                  alt={song.attributes.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div className="flex flex-col">
                  <p className="name text-sm font-semibold">
                    {song.attributes.name}
                  </p>
                  <p className="artist text-xs text-muted-foreground">
                    {song.attributes.artistName}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={pausePreview}
            className="apple-pause-btn inline-flex items-center justify-center rounded-xl border border-border bg-muted px-4 py-2 text-sm font-medium transition hover:bg-muted/80"
          >
            Pause Preview
          </button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
