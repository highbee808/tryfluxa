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

  // Validate image URL - reject null, empty, or "null" string
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    return !!url && url !== 'null' && url.trim() !== '' && url.trim() !== 'null';
  };

  // Normalized image logic - prioritize source images first, then AI, then primary
  // This ensures source images are always preferred over AI-generated ones
  // Only use valid URLs
  const normalizedImageUrl = 
    (imageUrls?.source && isValidImageUrl(imageUrls.source) ? imageUrls.source : null) ||
    (imageUrl && isValidImageUrl(imageUrl) ? imageUrl : null) ||
    (imageUrls?.primary && isValidImageUrl(imageUrls.primary) ? imageUrls.primary : null) ||
    (imageUrls?.ai && isValidImageUrl(imageUrls.ai) ? imageUrls.ai : null) ||
    null;
  
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'FeedCard.tsx:83',message:'FeedCard image priority',data:{id,headline:headline?.substring(0,50),hasSource:!!imageUrls?.source,hasPrimary:!!imageUrl,hasAi:!!imageUrls?.ai,normalizedUrl:normalizedImageUrl?.substring(0,50)||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }, [id, headline, imageUrl, imageUrls, normalizedImageUrl]);
  // #endregion

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    normalizedImageUrl
  );

  // Debug log for image flow - helps identify which posts need normalization
  useEffect(() => {
    const finalImageSrc = currentImageUrl || normalizedImageUrl;
    console.log("IMAGE FOR", headline, "→", finalImageSrc);
    
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
  }, [id, headline, imageUrl, currentImageUrl, category, normalizedImageUrl]);

  const handleImageError = () => {
    // For music items, don't fall back to generic placeholder - keep trying curated artwork
    const isMusicItem = category && (category.toLowerCase().includes("music") || category.toLowerCase().includes("trending") || category.toLowerCase().includes("latest"));
    
    if (isMusicItem) {
      // For music, if image fails, just hide it (curated artwork should always work)
      setCurrentImageUrl(null);
      return;
    }

    // Validate URLs before using them as fallbacks
    const validPrimary = imageUrl && isValidImageUrl(imageUrl) ? imageUrl : null;
    const validPrimaryFromUrls = imageUrls?.primary && isValidImageUrl(imageUrls.primary) ? imageUrls.primary : null;
    const validAi = imageUrls?.ai && isValidImageUrl(imageUrls.ai) ? imageUrls.ai : null;
    const validSource = imageUrls?.source && isValidImageUrl(imageUrls.source) ? imageUrls.source : null;

    // For non-music items, try fallback images in order: source -> primary -> ai -> placeholder
    // This maintains source image priority even on error
    if (currentImageUrl === validSource) {
      // If source image fails, try primary, then AI, then placeholder
      setCurrentImageUrl(validPrimary || validPrimaryFromUrls || validAi || "/fallback/news.jpg");
    } else if (currentImageUrl === (validPrimary || validPrimaryFromUrls)) {
      // If primary fails, try AI, then placeholder
      setCurrentImageUrl(validAi || "/fallback/news.jpg");
    } else if (currentImageUrl === validAi) {
      // If AI fails, use placeholder
      setCurrentImageUrl("/fallback/news.jpg");
    } else {
      // If we don't know which image failed, just use placeholder
      setCurrentImageUrl("/fallback/news.jpg");
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
        {currentImageUrl && isValidImageUrl(currentImageUrl) ? (
          <img
            src={currentImageUrl}
            alt={headline}
            className="w-full h-48 sm:h-64 object-cover"
            onError={(e) => {
              console.warn("[FeedCard] Image failed to load:", {
                id,
                headline: headline?.substring(0, 50),
                imageUrl: currentImageUrl,
                src: (e.target as HTMLImageElement).src,
              });
              handleImageError();
            }}
            onLoad={() => {
              // Log successful image loads for debugging
              if (import.meta.env.DEV) {
                console.log("[FeedCard] Image loaded successfully:", {
                  id,
                  imageUrl: currentImageUrl?.substring(0, 100),
                });
              }
            }}
          />
        ) : (
          // Fallback placeholder when no valid image
          <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-4xl mb-2">📰</div>
              <p className="text-sm text-muted-foreground">No image available</p>
            </div>
          </div>
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
