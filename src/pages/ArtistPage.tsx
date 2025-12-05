import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNavigation from "@/components/BottomNavigation";
import { Loader2, ArrowLeft, Music, Heart, Play, Users, TrendingUp, Calendar, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { FeedCardWithSocial } from "@/components/FeedCardWithSocial";
import TrackRow from "@/components/TrackRow";
import AlbumCard from "@/components/AlbumCard";
import ArtistStatCard from "@/components/ArtistStatCard";
import {
  fetchArtistProfile,
  fetchArtistNews,
  mapMusicItemToFeedCardProps,
  type Artist,
  type Track,
  type Album,
  type MusicItem,
} from "@/lib/musicService";
import { cn } from "@/lib/utils";

/**
 * Animated number hook for smooth stat transitions
 */
function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return value;
}

/**
 * Stat Card component with animated numbers
 */
function StatCard({ label, value }: { label: string; value: number }) {
  const animated = useAnimatedNumber(value ?? 0);
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#050816] px-3 py-3">
      <div className="text-[11px] text-black/60 dark:text-white/60 mb-1">
        {label}
      </div>
      <div className="text-lg font-semibold text-black dark:text-white">
        {animated}
      </div>
    </div>
  );
}

const ArtistPage = () => {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<MusicItem[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    if (!artistId) return;

    console.log("[ArtistPage] Loaded:", artistId);

    const loadArtistData = async () => {
      setLoading(true);
      try {
        // Fetch artist profile using slug (e.g., "drake", "wizkid")
        const artistData = await fetchArtistProfile(artistId);
        if (artistData) {
          setArtist(artistData);
          
          // Fetch artist news using the real artist ID/slug
          const newsData = await fetchArtistNews(artistData.slug || artistId, 10);
          setNews(newsData);
          
          // Check follow status
          await checkFollowStatus();
        } else {
          // No data available - will show 404
          setArtist(null);
        }
      } catch (error) {
        console.error("Error loading artist data:", error);
        setArtist(null);
      } finally {
        setLoading(false);
      }
    };

    loadArtistData();
  }, [artistId]);

  const checkFollowStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsFollowing(false);
        return;
      }

      const favoriteArtists = (user.user_metadata?.favorite_artists || []) as string[];
      setIsFollowing(favoriteArtists.includes(artistId || ''));
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const handleToggleFollow = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error("Please sign in to follow artists");
        navigate("/auth");
        return;
      }

      const favoriteArtists = (user.user_metadata?.favorite_artists || []) as string[];
      let updatedArtists: string[];

      if (isFollowing) {
        updatedArtists = favoriteArtists.filter(id => id !== artistId);
      } else {
        updatedArtists = [...favoriteArtists, artistId || ''];
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          favorite_artists: updatedArtists
        }
      });

      if (updateError) {
        throw updateError;
      }

      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? "Unfollowed artist" : "Following artist");
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    }
  };

  const handleCardClick = (gist: any) => {
    navigate(`/post/music/${gist.id}?origin=music&artistId=${artistId}`);
  };

  const handleCommentClick = (gist: any) => {
    navigate(`/post/music/${gist.id}?origin=music&artistId=${artistId}`);
  };

  const handleShare = (gist: any) => {
    toast.info("Share feature coming soon");
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Skeleton loader
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-32 md:pb-20">
        {/* Hero Skeleton */}
        <div className="h-64 md:h-80 bg-black/5 dark:bg-white/5 animate-pulse" />
        
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 mt-6">
          {/* Stats Skeleton */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="min-w-[140px] h-24 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
          
          {/* Content Skeleton */}
          <div className="space-y-4">
            <div className="h-32 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
            <div className="h-64 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-background pb-32 md:pb-20 flex items-center justify-center">
        <Card className="p-12 text-center max-w-md bg-white dark:bg-[#050816] border border-black/5 dark:border-white/5">
          <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-semibold mb-2 text-black dark:text-white">Artist Not Found</h2>
          <p className="text-muted-foreground mb-4">
            No data available yet for this artist. Please try searching for the artist by name.
          </p>
          <Button onClick={() => navigate("/music")}>
            Back to Music Hub
          </Button>
        </Card>
      </div>
    );
  }

  // Always use real artist name (never use artist.id or fallback)
  const artistName = artist.name || 'Unknown Artist';
  // Only show bio if it exists (no placeholder)
  const bioText = artist.bio || "";
  const shouldTruncateBio = bioText.length > 200;
  const displayBio = bioExpanded || !shouldTruncateBio ? bioText : `${bioText.slice(0, 200)}...`;

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-20">
      {/* Hero Header Section */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {/* Background Image */}
        {artist.imageUrl ? (
          <img
            src={artist.imageUrl}
            alt={artistName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30" />
        )}
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/30 dark:bg-black/60" />
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 text-white hover:bg-white/20 z-10"
          onClick={() => navigate("/music")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Follow Button */}
        <Button
          onClick={handleToggleFollow}
          className={cn(
            "absolute top-4 right-4 z-10",
            "bg-black text-white dark:bg-white dark:text-black",
            "hover:bg-black/90 dark:hover:bg-white/90"
          )}
          size="sm"
        >
          <Heart className={cn("w-4 h-4 mr-2", isFollowing && "fill-current")} />
          {isFollowing ? "Following" : "Follow"}
        </Button>

        {/* Artist Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end gap-4">
              {/* Artist Avatar - Always show real image if available */}
              <div className="relative flex-shrink-0">
                {artist.imageUrl ? (
                  <img
                    src={artist.imageUrl}
                    alt={artistName}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white dark:border-[#050816] shadow-2xl object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl md:text-3xl font-bold border-4 border-white dark:border-[#050816] shadow-2xl"
                  style={{ display: artist.imageUrl ? 'none' : 'flex' }}
                >
                  {artistName.charAt(0)}
                </div>
              </div>

              {/* Artist Name & Genres */}
              <div className="flex-1 text-white pb-2">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-semibold text-white">
                      {artistName} News
                    </h1>
                  </div>
                  {/* Open News Feed Button */}
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("artist-news-section")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5
                               bg-white text-black text-xs md:text-sm
                               hover:opacity-90 transition-opacity flex-shrink-0"
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>Open News Feed</span>
                  </button>
                </div>
                
                {/* Genres */}
                {artist.genres && artist.genres.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {artist.genres.map((genre) => (
                      <Badge
                        key={genre}
                        className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 mt-6">
        {/* Fluxa-native Stats - Four tiles with animated numbers */}
        {artist.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <StatCard label="Popularity Score" value={artist.stats.popularityScore ?? 0} />
            <StatCard label="Fluxa Rank" value={artist.stats.fluxaRank ?? 999} />
            <StatCard label="Engagement Score" value={artist.stats.engagementScore ?? 0} />
            <StatCard label="Buzz Score" value={artist.stats.buzzScore ?? 0} />
          </div>
        )}

        {/* About Section - Only show if bio exists */}
        {artist.bio && (
          <Card className="p-6 bg-white dark:bg-[#050816] border border-black/5 dark:border-white/5">
            <h2 className="text-xl font-bold mb-3 text-black dark:text-white">About</h2>
            <p className="text-sm md:text-base text-black/70 dark:text-white/70 leading-relaxed">
              {displayBio}
            </p>
            {shouldTruncateBio && (
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                className="mt-2 text-sm text-primary hover:underline"
              >
                {bioExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </Card>
        )}

        {/* Top Tracks */}
        {artist.topTracks && artist.topTracks.length > 0 && (
          <Card className="p-6 bg-white dark:bg-[#050816] border border-black/5 dark:border-white/5">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-black dark:text-white">
              <Play className="w-5 h-5" />
              Top Tracks
            </h2>
            <div className="space-y-2">
              {artist.topTracks.slice(0, 5).map((track: Track, i: number) => (
                <TrackRow key={track.id || i} track={track} index={i} />
              ))}
            </div>
          </Card>
        )}

        {/* Top Albums */}
        {artist.topAlbums && artist.topAlbums.length > 0 && (
          <Card className="p-6 bg-white dark:bg-[#050816] border border-black/5 dark:border-white/5">
            <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Top Albums</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {artist.topAlbums.slice(0, 6).map((album: Album, i: number) => (
                <AlbumCard key={album.id || i} album={album} />
              ))}
            </div>
          </Card>
        )}

        {/* Artist Buzz / News */}
        <section id="artist-news-section" className="mt-8">
        {news.length > 0 && (
          <Card className="p-6 bg-white dark:bg-[#050816] border border-black/5 dark:border-white/5">
            <h2 className="text-xl font-bold mb-4 text-black dark:text-white">{artistName} News & Buzz</h2>
            <div className="space-y-3">
              {news.map((item) => {
                const cardProps = mapMusicItemToFeedCardProps(item);
                return (
                  <FeedCardWithSocial
                    key={item.id}
                    id={cardProps.id}
                    headline={cardProps.headline}
                    context={cardProps.summary || cardProps.headline}
                    imageUrl={cardProps.imageUrl}
                    author={cardProps.author}
                    timeAgo={new Date(cardProps.publishedAt).toLocaleDateString()}
                    category={cardProps.topic}
                    isPlaying={false}
                    onPlay={() => {}}
                    onCardClick={() => handleCardClick({ id: item.id })}
                    onComment={() => handleCommentClick({ id: item.id })}
                    onShare={handleShare}
                  />
                );
              })}
            </div>
          </Card>
        )}

        {news.length === 0 && (
          <Card className="p-12 text-center bg-white dark:bg-[#050816] border border-black/5 dark:border-white/5">
            <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">No News Yet</h3>
            <p className="text-muted-foreground">
              Check back soon for the latest updates about {artistName}!
            </p>
          </Card>
        )}
        </section>

        {/* Related Artists */}
        {artist.relatedArtists && artist.relatedArtists.length > 0 && (
          <Card className="p-6 bg-white dark:bg-[#050816] border border-black/5 dark:border-white/5">
            <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Fans Also Like</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {artist.relatedArtists.map((relatedArtist) => (
                <button
                  key={relatedArtist.id}
                  onClick={() => navigate(`/music/artist/${relatedArtist.id}?origin=music`)}
                  className="flex flex-col items-center gap-2 min-w-[100px] text-center group"
                >
                  <div className="relative">
                    {relatedArtist.imageUrl ? (
                      <img
                        src={relatedArtist.imageUrl}
                        alt={relatedArtist.name}
                        className="w-20 h-20 rounded-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-2xl font-bold text-black/20 dark:text-white/20 group-hover:scale-105 transition-transform">
                        {relatedArtist.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-black dark:text-white line-clamp-1">
                    {relatedArtist.name}
                  </p>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ArtistPage;
