import type { ReactNode, MouseEvent } from "react";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Clock,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FluxaIcon from "@/assets/fluxa-icon.svg";

interface FeedCardProps {
  id: string;
  imageUrl?: string;
  headline: ReactNode;
  context: ReactNode;
  headlineText?: string;
  contextText?: string;
  fullContext?: string;
  author?: string;
  authorAvatar?: string;
  timeAgo?: string;
  category?: string;
  readTime?: string;
  likes?: number;
  comments?: number;
  bookmarks?: number;
  views?: number;
  shares?: number;
  credibilityScore?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onLike?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  onComment?: () => void;
}

export const FeedCard = ({
  id,
  imageUrl,
  headline,
  context,
  headlineText,
  contextText,
  fullContext,
  author = "Fluxa",
  authorAvatar,
  timeAgo = "2h ago",
  category = "Technology",
  readTime = "5 min",
  likes = 0,
  comments = 0,
  bookmarks = 0,
  views = 0,
  shares = 0,
  credibilityScore = 75,
  isLiked,
  isBookmarked,
  onLike,
  onBookmark,
  onShare,
  onComment,
}: FeedCardProps) => {
  const navigate = useNavigate();

  const fluxaTopic = category || "Trending";
  const fluxaHeadline =
    headlineText ||
    (typeof headline === "string" ? headline : undefined) ||
    "";
  const fluxaSummary =
    contextText ||
    (typeof context === "string" ? context : undefined) ||
    "";
  const fluxaFullContext = fullContext || fluxaSummary;

  const handleShareWithTracking = async () => {
    onShare?.();
    try {
      await supabase.functions.invoke("track-post-event", {
        body: { postId: id, event: "share" },
      });
    } catch (error) {
      console.error("Error tracking share:", error);
    }
  };

  const getCredibilityColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const handleCommentClick = () => {
    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          topic: category,
          summary: headline,
          fullContext: context,
        },
      },
    });
  };

  const handleCardClick = () => {
    navigate(`/post/${id}`);
  };

  const handleFluxaMode = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          topic: fluxaTopic,
          headline: fluxaHeadline,
          context: fluxaSummary,
          fullContext: fluxaFullContext,
          gistId: id,
        },
      },
    });
  };

  return (
    <Card className="w-full overflow-hidden border-glass-border-light shadow-glass hover:shadow-glass-glow transition-all duration-300 bg-card/95 backdrop-blur-sm">
      <CardContent className="p-0">
        <div
          role="button"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleCardClick();
            }
          }}
          className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
        >
          {/* Author + Meta */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                {authorAvatar ? (
                  <AvatarImage src={authorAvatar} alt={author} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                    {(author || "F").substring(0, 2).toUpperCase()}
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
              alt={
                typeof headline === "string" ? headline : fluxaHeadline || "image"
              }
              className="w-full h-48 sm:h-64 object-cover"
            />
          )}

          {/* Content */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {readTime} read
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-semibold mb-2 leading-tight">
              {headline}
            </h2>

            <p className="text-muted-foreground text-sm md:text-base mb-4 line-clamp-3">
              {context}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
            {/* Actions */}
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Like */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike?.();
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors group"
              >
                <Heart
                  className={`w-5 h-5 transition-all ${
                    isLiked
                      ? "fill-red-500 text-red-500 scale-110"
                      : "group-hover:scale-110"
                  }`}
                />
                <span className="text-sm font-medium">{likes}</span>
              </button>

              {/* Comment */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onComment ? onComment() : handleCommentClick();
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group"
              >
                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-all" />
                <span className="text-sm font-medium">
                  {onComment ? "Chat" : comments}
                </span>
              </button>

              {/* Bookmark */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark?.();
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-coral-active transition-colors group"
              >
                <Bookmark
                  className={`w-5 h-5 transition-all ${
                    isBookmarked
                      ? "fill-coral-active text-coral-active scale-110"
                      : "group-hover:scale-110"
                  }`}
                />
                <span className="text-sm font-medium">{bookmarks}</span>
              </button>

              {/* Share */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareWithTracking();
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors group"
              >
                <Share2 className="w-5 h-5 group-hover:scale-110 transition-all" />
                <span className="text-sm font-medium">{shares}</span>
              </button>
            </div>

            {/* Fluxa Button */}
            <button
              onClick={handleFluxaMode}
              className="ml-auto rounded-full bg-primary/10 border border-primary/20 p-2 hover:bg-primary/20 transition-colors"
              aria-label="Open Fluxa Mode"
            >
              <img
                src={FluxaIcon}
                alt="Fluxa"
                className="w-5 h-5 opacity-80"
              />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
