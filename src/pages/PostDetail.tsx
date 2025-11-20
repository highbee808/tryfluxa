import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Eye,
  Clock,
  Headphones,
} from "lucide-react";

import BottomNavigation from "@/components/BottomNavigation";
import { FluxaLogo } from "@/components/FluxaLogo";
import { toast } from "sonner";

interface Gist {
  id: string;
  headline: string;
  context: string;
  script: string;
  image_url: string | null;
  topic: string;
  published_at: string;
  play_count: number;
  like_count: number;
  comment_count: number;
  bookmark_count: number;
  share_count: number;
  view_count: number;
}

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [gist, setGist] = useState<Gist | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchGist = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("gists")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      toast.error("Unable to load post.");
      return;
    }

    setGist(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchGist();
  }, [id]);

  if (loading || !gist) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const fullText = `${gist.context}\n\n${gist.script}`;
  const previewText = fullText.slice(0, 260);

  const handleFluxaModeClick = () => {
    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          gistId: gist.id,
          topic: gist.topic,
          headline: gist.headline,
          fullContext: fullText,
        },
      },
    });
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="mx-auto max-w-2xl w-full">
        {/* Header */}
        <div className="p-4 flex items-center gap-3 border-b border-border sticky top-0 bg-background/90 backdrop-blur z-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-muted-foreground"
          >
            ← Back
          </Button>
          <h1 className="font-semibold text-lg truncate">Post</h1>
        </div>

        {/* Image */}
        {gist.image_url && (
          <img
            src={gist.image_url}
            alt={gist.headline}
            className="w-full h-64 md:h-80 object-cover"
          />
        )}

        <Card className="shadow-none border-none">
          <CardContent className="p-6">
            {/* Meta */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    FX
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="font-medium">Fluxa</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(gist.published_at).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <Eye className="w-3 h-3" />
                    <span>{gist.view_count}</span>
                  </div>
                </div>
              </div>

              <Badge variant="outline" className="text-xs">
                {gist.topic}
              </Badge>
            </div>

            {/* Headline */}
            <h2 className="text-2xl font-bold mb-3">{gist.headline}</h2>

            {/* Body with collapse */}
            <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
              {expanded ? fullText : previewText}

              {fullText.length > 260 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-primary font-medium mt-3 block"
                >
                  {expanded ? "See Less" : "See More"}
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 border-t border-border pt-4 flex items-center justify-between">
              <div className="flex items-center gap-5">
                {/* Fluxa Mode */}
                <button
                  onClick={handleFluxaModeClick}
                  className="flex items-center"
                >
                  <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <FluxaLogo size={22} fillColor="hsl(var(--primary))" />
                  </span>
                </button>

                {/* Like */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Heart className="w-5 h-5" />
                  <span>{gist.like_count}</span>
                </div>

                {/* Comment */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="w-5 h-5" />
                  <span>{gist.comment_count}</span>
                </div>

                {/* Bookmark */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bookmark className="w-5 h-5" />
                  <span>{gist.bookmark_count}</span>
                </div>

                {/* Share */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Share2 className="w-5 h-5" />
                  <span>{gist.share_count}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Headphones className="w-4 h-4 opacity-50" />
                <span>{gist.play_count} listens</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default PostDetail;
