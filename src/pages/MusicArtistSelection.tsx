import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, X, Loader2, Music } from "lucide-react";
import { searchArtists } from "@/lib/musicService";

const MusicArtistSelection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load genres from location state (passed from onboarding)
  useEffect(() => {
    if (location.state?.selectedGenres) {
      setSelectedGenres(location.state.selectedGenres);
    } else {
      // Fallback: load from user metadata
      const loadExisting = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.user_metadata?.favorite_genres) {
            setSelectedGenres(user.user_metadata.favorite_genres || []);
          }
        } catch (error) {
          console.error("Error loading genres:", error);
        }
      };
      loadExisting();
    }
  }, [location.state]);

  // Load existing artists
  useEffect(() => {
    const loadExisting = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.favorite_artists) {
          setSelectedArtists(user.user_metadata.favorite_artists || []);
        }
      } catch (error) {
        console.error("Error loading artists:", error);
      }
    };
    loadExisting();
  }, []);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      // Optional: show a little helper text state like "Type at least 2 characters"
      return;
    }

    try {
      setLoading(true);
      const artists = await searchArtists(trimmed);
      setResults(artists);
    } catch (err) {
      console.error("[MusicArtistSelection] search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const addArtist = (artist: any) => {
    const artistId = artist.id || artist.name.toLowerCase().replace(/\s+/g, '-');
    if (!selectedArtists.includes(artistId)) {
      setSelectedArtists([...selectedArtists, artistId]);
      setQuery("");
      setResults([]);
      toast.success(`Added ${artist.name}`);
    } else {
      toast.info("Artist already selected");
    }
  };

  const removeArtist = (artistId: string) => {
    setSelectedArtists((prev) => prev.filter((id) => id !== artistId));
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("Auth error:", authError);
        toast.error("Please sign in first");
        navigate("/auth");
        return;
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          favorite_genres: selectedGenres,
          favorite_artists: selectedArtists
        }
      });

      if (updateError) {
        console.error("Database error:", updateError);
        throw new Error(`Failed to save: ${updateError.message}`);
      }

      toast.success(`Music preferences saved! ${selectedGenres.length} genre(s), ${selectedArtists.length} artist(s) 🎵`);
      
      // Navigate to feed
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate("/feed");
    } catch (error) {
      console.error("Error saving preferences:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save preferences";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    // Can skip artists - just save genres
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      await supabase.auth.updateUser({
        data: {
          favorite_genres: selectedGenres,
          favorite_artists: []
        }
      });

      toast.success("Music preferences saved! 🎵");
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate("/feed");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-hero)" }}>
      <div className="max-w-4xl w-full space-y-8 animate-fade-in">
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/onboarding", { state: { returnToMusic: true } })}
            className="gap-2"
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Genres
          </Button>

          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              Select Your Favorite Artists 🎤
            </h1>
            <p className="text-xl text-foreground font-medium mt-4">
              Search and add your favorite artists (optional)
            </p>
          </div>
        </div>

        {/* Selected Genres Summary - Always Visible */}
        {selectedGenres.length > 0 && (
          <Card className="p-4 bg-background/80 backdrop-blur border-primary/20">
            <p className="text-sm font-semibold text-primary mb-2">Selected Genres:</p>
            <div className="flex flex-wrap gap-2">
              {selectedGenres.map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-1 bg-primary/10 border border-primary rounded-md text-xs font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Search Bar with Search Button */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-20 h-12 text-base"
            disabled={saving}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSearch}
            disabled={saving || !query.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Search Results */}
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Searching...</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Search Results</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((artist) => {
                const artistId = artist.id || artist.name.toLowerCase().replace(/\s+/g, '-');
                const isSelected = selectedArtists.includes(artistId);
                return (
                  <div
                    key={artistId}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted border-border"
                    }`}
                    onClick={() => !isSelected && addArtist(artist)}
                  >
                    <div className="flex items-center gap-3">
                      {artist.imageUrl ? (
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                          {artist.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{artist.name}</div>
                        {artist.genres && artist.genres.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {artist.genres.slice(0, 2).join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-primary text-lg">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <Card className="p-8 text-center">
            <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Artists Found</h3>
            <p className="text-muted-foreground">Try a different search term.</p>
          </Card>
        )}

        {/* Selected Artists */}
        {selectedArtists.length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Selected Artists ({selectedArtists.length})</h3>
            <div className="flex flex-wrap gap-2">
              {selectedArtists.map((artistId) => {
                const artistName = artistId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <div
                    key={artistId}
                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary rounded-md"
                  >
                    <span className="text-xs font-medium">{artistName}</span>
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeArtist(artistId)}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={saving}
          >
            Skip Artists
          </Button>
          <Button
            onClick={handleContinue}
            disabled={saving}
            size="lg"
            className="text-lg font-bold min-w-[200px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Continue to Feed →"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MusicArtistSelection;

