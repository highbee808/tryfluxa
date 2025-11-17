import { Heart, MessageCircle, Bookmark, Share2, Play, Pause, Clock, Sparkles, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface FeedCardProps {
  id: string;
  imageUrl?: string;
  headline: string;
  context: string;
  author?: string;
  authorAvatar?: string;
  timeAgo?: string;
  category?: string;
  readTime?: string;
  likes?: number;
  comments?: number;
  bookmarks?: number;
  views?: number;
  plays?: number;
  shares?: number;
  credibilityScore?: number;
  isPlaying: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onPlay: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  onDeeperSummary?: () => void;
  deeperSummaryRequested?: boolean;
}

export const FeedCard = ({
  id,
  imageUrl,
  headline,
  context,
  author = "Fluxa",
  authorAvatar,
  timeAgo = "2h ago",
  category = "Technology",
  readTime = "5 min",
  likes = 0,
  comments = 0,
  bookmarks = 0,
  views = 0,
  plays = 0,
  shares = 0,
  credibilityScore = 75,
  isPlaying,
  isLiked,
  isBookmarked,
  onPlay,
  onLike,
  onComment,
  onBookmark,
  onShare,
  onDeeperSummary,
  deeperSummaryRequested,
}: FeedCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const handlePlayWithTracking = async () => {
    onPlay();
    if (!isPlaying) {
      // Track play event
      try {
        await supabase.functions.invoke('track-post-event', {
          body: { postId: id, event: 'play' }
        });
      } catch (error) {
        console.error("Error tracking play:", error);
      }
    }
  };

  const handleShareWithTracking = async () => {
    if (onShare) {
      onShare();
      // Track share event
      try {
        await supabase.functions.invoke('track-post-event', {
          body: { postId: id, event: 'share' }
        });
      } catch (error) {
        console.error("Error tracking share:", error);
      }
    }
  };
  
  const getCredibilityColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const handleCommentClick = () => {
    navigate(`/post/${id}`);
  };
  return (
    <Card className="ios-card ios-card--interactive overflow-hidden">
      <CardContent className="p-0">
        {/* Author Info */}
        <div className="p-5 flex items-center justify-between bg-white/40 backdrop-blur-sm border-b border-white/50">
          <div className="flex items-center gap-3">
            <Avatar className="w-11 h-11">
              {authorAvatar ? (
                <AvatarImage src={authorAvatar} alt={author} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                  {author?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{author}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{timeAgo}</span>
                <span>•</span>
                <Eye className="w-3 h-3" />
                <span>{views}</span>
              </div>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "px-3 py-1 rounded-full text-[0.7rem] font-semibold border-0",
              getCredibilityColor(credibilityScore)
            )}
          >
            {credibilityScore}%
          </Badge>
        </div>

        {/* Image */}
        {imageUrl && (
          <div
            className="relative w-full h-52 sm:h-64 overflow-hidden cursor-pointer"
            onClick={() => navigate(`/post/${id}`)}
          >
            <img src={imageUrl} alt={headline} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent" />
            <span className="absolute bottom-4 left-4 text-xs font-medium text-white/80 flex items-center gap-1">
              <Clock className="w-4 h-4" /> {readTime} read
            </span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          {!imageUrl && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{readTime} read</span>
            </div>
          )}

          <h2 className="text-xl md:text-2xl font-semibold leading-tight tracking-tight">
            {headline}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            {context}
          </p>

          <div className="ios-divider" />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button
                onClick={handlePlayWithTracking}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 group-hover:scale-110 transition-all" />
                ) : (
                  <Play className="w-5 h-5 group-hover:scale-110 transition-all" />
                )}
                <span className="text-sm font-medium">{plays}</span>
              </button>

              <button
                onClick={onLike}
                className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors group"
              >
                <Heart
                  className={cn(
                    "w-5 h-5 transition-all",
                    isLiked ? "fill-red-500 text-red-500 scale-110" : "group-hover:scale-110"
                  )}
                />
                <span className="text-sm font-medium">{likes}</span>
              </button>

              <button
                onClick={() => navigate(`/post/${id}`)}
                className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group"
              >
                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-all" />
                <span className="text-sm font-medium">{comments}</span>
              </button>

              <button
                onClick={onBookmark}
                className="flex items-center gap-2 text-muted-foreground hover:text-coral-active transition-colors group"
              >
                <Bookmark
                  className={cn(
                    "w-5 h-5 transition-all",
                    isBookmarked ? "fill-coral-active text-coral-active scale-110" : "group-hover:scale-110"
                  )}
                />
                <span className="text-sm font-medium">{bookmarks}</span>
              </button>

              <button
                onClick={handleShareWithTracking}
                className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors group"
              >
                <Share2 className="w-5 h-5 group-hover:scale-110 transition-all" />
                <span className="text-sm font-medium">{shares}</span>
              </button>
            </div>

            {onDeeperSummary && (
              <Button
                size="sm"
                variant={deeperSummaryRequested ? "secondary" : "outline"}
                onClick={onDeeperSummary}
                disabled={deeperSummaryRequested}
                className="gap-2 w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4" />
                {!isMobile && (deeperSummaryRequested ? "Requested" : "Deeper Analysis")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
