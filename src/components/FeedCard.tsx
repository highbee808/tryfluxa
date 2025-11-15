import { Heart, MessageCircle, Bookmark, Share2, Play, Pause, Clock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

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
  
  const getCredibilityColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const handleCommentClick = () => {
    navigate(`/post/${id}`);
  };
  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300 bg-card">
      <CardContent className="p-0">
        {/* Author Info */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              {authorAvatar ? (
                <AvatarImage src={authorAvatar} alt={author} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                  {author?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="text-sm font-medium">{author}</p>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className={`text-xs ${getCredibilityColor(credibilityScore)}`}
          >
            {credibilityScore}% verified
          </Badge>
        </div>

        {/* Image */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={headline}
            className="w-full h-48 sm:h-64 object-cover cursor-pointer"
            onClick={() => navigate(`/post/${id}`)}
          />
        )}

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{readTime} read</span>
          </div>

          <h2 className="text-xl md:text-2xl font-semibold mb-2 leading-tight">
            {headline}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mb-4 line-clamp-3">
            {context}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={onPlay}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 group-hover:scale-110 transition-all" />
                ) : (
                  <Play className="w-5 h-5 group-hover:scale-110 transition-all" />
                )}
                <span className="text-sm font-medium">{likes}</span>
              </button>

              <button
                onClick={onLike}
                className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors group"
              >
                <Heart
                  className={`w-5 h-5 transition-all ${
                    isLiked ? "fill-red-500 text-red-500 scale-110" : "group-hover:scale-110"
                  }`}
                />
                <span className="text-sm font-medium">{likes}</span>
              </button>

              <button
                onClick={handleCommentClick}
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
                  className={`w-5 h-5 transition-all ${
                    isBookmarked ? "fill-coral-active text-coral-active scale-110" : "group-hover:scale-110"
                  }`}
                />
                <span className="text-sm font-medium">{bookmarks}</span>
              </button>

              <button
                onClick={onShare}
                className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors group"
              >
                <Share2 className="w-5 h-5 group-hover:scale-110 transition-all" />
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
