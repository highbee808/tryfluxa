import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Clock,
  Sparkles,
  Eye,
  Headphones,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { FluxaLogo } from "@/components/FluxaLogo";

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
  isLiked?: boolean;
  isBookmarked?: boolean;
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
  isLiked,
  isBookmarked,
  onLike,
  onComment,
  onBookmark,
  onShare,
  onDeeperSummary,
  deeperSummaryRequested,
}: FeedCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleShareWithTracking = async () => {
    if (onShare) {
      onShare();
      try {
        await supabase.functions.invoke("track-post-event", {
          body: { postId: id, event: "share" },
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

  const handleFluxaModeClick = () => {
    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          gistId: id,
          topic: category,
          headline,
          context,
          fullContext: context,
        },
      },
    });
  };

  const handleCommentClick = () => {
    if (onComment) {
      onComment();
    } else {
      navigate(`/post/${id}`);
    }
  };

  return (
    <Card className="w-full overflow-hidden border border-border shadow-md hover:shadow-xl transition-all duration-300 bg-card/95 backdrop-blur">
      <CardContent className="p-0">
        {/* Top Row: Author Info */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              {authorAvatar ? (
                <AvatarImage src={authorAvatar} alt={author} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                  {author.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="text-sm font-medium">{author}</p>
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
            className={`text-xs ${getCredibilityColor(credibilityScore)}`}
          >
            {credibilityScore}%
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
          <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{readTime} read</span>
            </div>

            <div className="flex items-center gap-1">
              <Headphones className="w-4 h-4 opacity-70" />
              <span className="text-xs">{plays} listens</span>
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-semibold mb-2 leading-tight">
            {headline}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mb-4 line-clamp-3">
            {context}
          </p>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
            <div className="flex items-center gap-5">
              {/* Fluxa Mode First & Bigger */}
              <button
                onClick={handleFluxaModeClick}
                className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors group"
              >
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                  <FluxaLogo size={20} fillColor="hsl(var(--primary))" />
                </span>
              </button>

              {/* Like */}
              <button
                onClick={onLike}
                className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors group"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isLiked ? "fill-red-500 text-red-500 scale-110" : ""
                  } group-hover:scale-110 transition-all`}
                />
                <span className="text-sm">{likes}</span>
              </button>

              {/* Comment */}
              <button
                onClick={handleCommentClick}
                className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group"
              >
                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-all" />
                <span className="text-sm">{comments}</span>
              </button>

              {/* Bookmark */}
              <button
                onClick={onBookmark}
                className="flex items-center gap-2 text-muted-foreground hover:text-coral-active transition-colors group"
              >
                <Bookmark
                  className={`w-5 h-5 ${
                    isBookmarked
                      ? "fill-coral-active text-coral-active scale-110"
                      : ""
                  } group-hover:scale-110 transition-all`}
                />
                <span className="text-sm">{bookmarks}</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShareWithTracking}
                className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors group"
              >
                <Share2 className="w-5 h-5 group-hover:scale-110 transition-all" />
                <span className="text-sm">{shares}</span>
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
                {!isMobile &&
                  (deeperSummaryRequested ? "Requested" : "Deeper Analysis")}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
