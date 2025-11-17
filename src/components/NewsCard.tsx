import { useState, useEffect } from "react";
import { Heart, MessageCircle, Bookmark, Share2, Play, Pause, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NewsCardProps {
  id: string;
  title: string;
  source: string;
  time: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  category?: string;
  entityName?: string;
  isPlaying: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onPlay: (audioUrl?: string) => void;
  onLike?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
}

export const NewsCard = ({
  id,
  title,
  source,
  time,
  description,
  url,
  imageUrl,
  category = "News",
  entityName,
  isPlaying,
  isLiked,
  isBookmarked,
  onPlay,
  onLike,
  onComment,
  onBookmark,
  onShare,
}: NewsCardProps) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // Audio generation is now disabled for news cards to improve performance
  // News items from entity feeds don't have narration audio
  useEffect(() => {
    // Don't auto-generate audio for news items
    // Audio is only available for generated gists
    setAudioUrl(null);
  }, []);

  const handlePlayClick = () => {
    // News items don't have audio - show info message
    toast.info("Audio narration is only available for Fluxa-generated gists");
  };

  return (
    <Card className="overflow-hidden border-glass-border-light shadow-glass hover:shadow-glass-glow transition-all duration-300 bg-card/95 backdrop-blur-sm hover-glow">
      <CardContent className="p-0">
        {/* Author Info - Fluxa */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                FL
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Fluxa</p>
              <p className="text-xs text-muted-foreground">{time}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {entityName || category}
          </Badge>
        </div>

        {/* Image with Play Button */}
        <div className="relative group cursor-pointer" onClick={handlePlayClick}>
          <img
            src={imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800"}
            alt={title}
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <button
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayClick();
            }}
            disabled={loadingAudio}
          >
            <Play className="w-8 h-8 text-blue-600 ml-1 opacity-50" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">2 min read</span>
            <span className="text-xs text-muted-foreground">• {source}</span>
          </div>

          <h2 className="text-xl md:text-2xl font-semibold mb-2 leading-tight">
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground text-sm md:text-base mb-4 line-clamp-3">
              {description}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 pt-4 border-t border-border">
            <button
              onClick={onLike}
              className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors group"
            >
              <Heart
                className={`w-5 h-5 transition-all ${
                  isLiked ? "fill-red-500 text-red-500 scale-110" : "group-hover:scale-110"
                }`}
              />
              <span className="text-sm font-medium">{Math.floor(Math.random() * 500)}</span>
            </button>

            <button
              onClick={onComment}
              className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group"
            >
              <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-all" />
              <span className="text-sm font-medium">{Math.floor(Math.random() * 100)}</span>
            </button>

            <button
              onClick={onBookmark}
              className="flex items-center gap-2 text-muted-foreground hover:text-coral-active transition-colors group"
            >
              <Bookmark
                className={`w-5 h-5 transition-all ${
                  isBookmarked ? "fill-coral-active text-coral-active scale-110" : "group-hover:scale-110"
                }`}
              />
              <span className="text-sm font-medium">{Math.floor(Math.random() * 200)}</span>
            </button>

            <button
              onClick={onShare}
              className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors ml-auto group"
            >
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-all" />
            </button>
          </div>

          {/* Read More Link */}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Read full article →
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
