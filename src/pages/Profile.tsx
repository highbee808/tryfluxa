import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Gist {
  id: string;
  headline: string;
  topic: string;
  topic_category: string;
  audio_url: string;
  image_url: string | null;
  published_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Gist[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to view favorites");
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      // Get user's favorited gist IDs
      const { data: favData, error: favError } = await supabase
        .from("user_favorites")
        .select("gist_id")
        .eq("user_id", user.id);

      if (favError) throw favError;

      if (!favData || favData.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const gistIds = favData.map((f) => f.gist_id);

      // Get the actual gists
      const { data: gists, error: gistsError } = await supabase
        .from("gists")
        .select("*")
        .in("id", gistIds)
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (gistsError) throw gistsError;

      setFavorites(gists || []);
    } catch (error) {
      console.error("Error loading favorites:", error);
      toast.error("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const handleUnfavorite = async (gistId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("gist_id", gistId)
        .eq("user_id", userId);

      if (error) throw error;

      setFavorites(favorites.filter((g) => g.id !== gistId));
      toast.success("Removed from favorites");
    } catch (error) {
      console.error("Error unfavoriting:", error);
      toast.error("Failed to remove favorite");
    }
  };

  const playGist = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/feed")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Button>
          <h1 className="text-2xl font-bold">My Favorites</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>

        {/* Favorites List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : favorites.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-4">
              Start liking gists to see them here!
            </p>
            <Button onClick={() => navigate("/feed")}>
              Explore Feed
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {favorites.map((gist) => (
              <Card
                key={gist.id}
                className="p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {gist.image_url && (
                    <img
                      src={gist.image_url}
                      alt={gist.topic}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs text-primary font-medium">
                          {gist.topic_category}
                        </span>
                        <h3 className="font-semibold text-lg">
                          {gist.headline}
                        </h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUnfavorite(gist.id)}
                      >
                        <Heart className="w-5 h-5 fill-primary text-primary" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {new Date(gist.published_at).toLocaleDateString()}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => playGist(gist.audio_url)}
                    >
                      Play
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
