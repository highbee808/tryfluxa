import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNavigation from "@/components/BottomNavigation";
import { Loader2, ArrowLeft, Music, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { FeedCardWithSocial } from "@/components/FeedCardWithSocial";
import {
  fetchGenreData,
  mapMusicItemToFeedCardProps,
  type Artist,
  type Track,
} from "@/lib/musicService";

const GenrePage = () => {
  const { genreId } = useParams<{ genreId: string }>();
  const navigate = useNavigate();
  const [genreName, setGenreName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!genreId) return;

    const loadGenreData = async () => {
      setLoading(true);
      try {
        // Convert genreId back to genre name
        const name = genreId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        setGenreName(name);

        // Fetch genre data
        const genreData = await fetchGenreData(name);
        if (genreData) {
          setDescription(genreData.description || `${name} music genre`);
          setTopArtists(genreData.topArtists || []);
          setTopTracks(genreData.topTracks || []);
        } else {
          setDescription(`${name} music genre`);
        }
      } catch (error) {
        console.error("Error loading genre data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGenreData();
  }, [genreId]);

  const handleCardClick = (gist: any) => {
    navigate(`/post/music/${gist.id}?origin=music`);
  };

  const handleCommentClick = (gist: any) => {
    navigate(`/post/music/${gist.id}?origin=music`);
  };

  const handleShare = (gist: any) => {
    // Share functionality
    toast.info("Share feature coming soon");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-32 md:pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading genre...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => navigate("/music")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">{genreName}</h1>
          {description && (
            <p className="text-muted-foreground text-lg">{description}</p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 mt-6">
        {/* Top Artists */}
        {topArtists.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Music className="w-5 h-5" />
              Top Artists in {genreName}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {topArtists.map((artist) => {
                const artistId = artist.id || artist.name.toLowerCase().replace(/\s+/g, '-');
                return (
                  <Card
                    key={artistId}
                    className="min-w-[120px] p-3 border-primary/20 bg-gradient-to-br from-primary/5 to-background flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/music/artist/${artistId}`)}
                  >
                    <div className="text-center">
                      {artist.imageUrl ? (
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold mx-auto mb-2">
                          {artist.name.charAt(0)}
                        </div>
                      )}
                      <div className="font-medium text-sm line-clamp-1">{artist.name}</div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        )}

        {/* Trending Songs */}
        {topTracks.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Trending Songs in {genreName}
            </h2>
            <div className="space-y-2">
              {topTracks.slice(0, 20).map((track, i) => (
                <div
                  key={track.id || i}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <span className="text-muted-foreground font-bold w-6">{i + 1}</span>
                  <div className="flex-1">
                    <div className="font-medium">{track.name}</div>
                    <div className="text-sm text-muted-foreground">{track.artist}</div>
                  </div>
                  {track.duration && (
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Genre Buzz / News */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">{genreName} Buzz & News</h2>
          <div className="text-center py-12">
            <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No News Yet</h3>
            <p className="text-muted-foreground">
              Check back soon for the latest {genreName} music news and culture moments!
            </p>
          </div>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default GenrePage;

