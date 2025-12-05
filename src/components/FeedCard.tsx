import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Clock,
  Eye,
  Headphones,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdminFunction } from "@/lib/invokeAdminFunction";
import { FluxaLogo } from "@/components/FluxaLogo";

interface FeedCardProps {
  id: string;
  imageUrl?: string;
  imageUrls?: {
    primary?: string | null;
    source?: string | null;
    ai?: string | null;
  };
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
  onCardClick?: () => void;
  onFluxaAnalysis?: () => void;
}

export const FeedCard = ({
  id,
  imageUrl,
  imageUrls,
  headline,
  context,
  author = "Fluxa",
  authorAvatar,
  timeAgo = "2h ago",
  category,
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
  onCardClick,
  onFluxaAnalysis,
}: FeedCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    imageUrl || imageUrls?.primary || imageUrls?.source || imageUrls?.ai || null
  );

  // Debug log for music items (check if imageUrl is from music artwork paths)
  useEffect(() => {
    const isMusicArtwork = imageUrl && (
      imageUrl.includes("/img/music/") ||
      imageUrl.includes("spotify.com") ||
      imageUrl.includes("last.fm") ||
      imageUrl.includes("lastfm")
    );
    
    if (isMusicArtwork || (imageUrl && category)) {
      console.log("[FeedCard] music artwork debug:", {
        id: id,
        headline: headline,
        imageUrl: imageUrl,
        currentImageUrl: currentImageUrl,
        category: category,
        isMusicArtwork: isMusicArtwork,
      });
    }
  }, [id, headline, imageUrl, currentImageUrl, category]);

  const handleImageError = () => {
    // For music items, don't fall back to generic placeholder - keep trying curated artwork
    const isMusicItem = category && (category.toLowerCase().includes("music") || category.toLowerCase().includes("trending") || category.toLowerCase().includes("latest"));
    
    if (isMusicItem) {
      // For music, if image fails, just hide it (curated artwork should always work)
      setCurrentImageUrl(null);
      return;
    }

    // For non-music items, try fallback images in order: primary -> source -> ai -> placeholder
    if (currentImageUrl === (imageUrl || imageUrls?.primary)) {
      setCurrentImageUrl(imageUrls?.source || imageUrls?.ai || "/images/fluxa-placeholder.jpg");
    } else if (currentImageUrl === imageUrls?.source) {
      setCurrentImageUrl(imageUrls?.ai || "/images/fluxa-placeholder.jpg");
    } else if (currentImageUrl === imageUrls?.ai) {
      setCurrentImageUrl("/images/fluxa-placeholder.jpg");
    }
  };

  const handleCardClickInternal = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    if (onCardClick) {
      onCardClick();
    }
    // No fallback - onCardClick should always be provided with source
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComment) {
      onComment();
    }
    // No fallback - onComment should always be provided with source
  };

  const handleFluxaModeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFluxaAnalysis) {
      onFluxaAnalysis();
    } else {
      // Fallback with safe values
      const safeTopic = category && category.trim() !== "" ? category : "this story";
      navigate("/fluxa-mode", {
        state: {
          initialContext: {
            gistId: id,
            topic: safeTopic,
            headline: headline || "this post",
            context: context || "",
            fullContext: context || "",
          },
        },
      });
    }
  };

  const handleShareWithTracking = async () => {
    if (onShare) onShare();

    try {
      await invokeAdminFunction("track-post-event", {
        postId: id, event: "share"
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

  return (
    <Card 
      className="w-full overflow-hidden border border-border shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
      style={{ 
        backgroundColor: 'hsl(var(--card))', 
        opacity: 1,
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        position: 'relative',
        zIndex: 100,
        isolation: 'isolate'
      }}
      onClick={handleCardClickInternal}
    >
      <CardContent className="p-0">

        {/* Top Author Row */}
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
        {currentImageUrl && (
          <img
            src={currentImageUrl}
            alt={headline}
            className="w-full h-48 sm:h-64 object-cover"
            onError={handleImageError}
          />
        )}

        {/* Content */}
        <div className="p-6">
          <h2 className="text-xl md:text-2xl font-semibold mb-2 leading-tight hover:text-primary transition-colors">
            {headline}
          </h2>

          <p className="text-muted-foreground text-sm md:text-base mb-4 line-clamp-3">
            {context}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
            <div className="flex items-center gap-5">

              {/* Fluxa Mode */}
              <button
                onClick={handleFluxaModeClick}
                className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors group"
                aria-label="Ask Fluxa for deeper analysis"
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
                aria-label="View comments"
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
