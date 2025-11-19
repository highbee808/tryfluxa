import type { MouseEvent } from "react";
import { Heart, MessageCircle, Bookmark, Share2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import FluxaIcon from "@/assets/fluxa-icon.svg";

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
  isLiked?: boolean;
  isBookmarked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  onCardClick?: () => void;
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
  isLiked,
  isBookmarked,
  onLike,
  onComment,
  onBookmark,
  onShare,
  onCardClick,
}: NewsCardProps) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    if (onCardClick) {
      onCardClick();
      return;
    }

    navigate(`/post/${id}`);
  };

  const handleCommentClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (onComment) {
      onComment();
    } else {
      handleNavigate();
    }
  };

  const handleFluxaMode = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const topic = entityName || category || "News";
    const summary = description || title;
    navigate('/fluxa-mode', {
      state: {
        initialContext: {
          topic,
          headline: title,
          context: summary,
          fullContext: summary,
          gistId: id,
        },
      },
    });
  };

  return (
    <Card className="w-full overflow-hidden border-glass-border-light shadow-glass hover:shadow-glass-glow transition-all duration-300 bg-card/95 backdrop-blur-sm hover-glow">
      <CardContent className="p-0">
        <div
          role="button"
          tabIndex={0}
          onClick={handleNavigate}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleNavigate();
            }
          }}
          className="cursor-pointer"
        >
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={imageUrl || undefined} alt={title} />
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

          <div className="relative group">
            <img
              src={imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800"}
              alt={title}
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

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
          </div>
        </div>

        <div className="p-6 pt-0">
          <div className="flex items-center gap-6 pt-4 border-t border-border">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onLike?.();
              }}
          className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors group"
        >
          <Heart
            className={`w-4 h-4 transition-all ${
              isLiked ? "fill-red-500 text-red-500 scale-110" : "group-hover:scale-110"
            }`}
          />
          <span className="text-sm font-medium">{Math.floor(Math.random() * 500)}</span>
        </button>

            <button
          onClick={handleCommentClick}
          className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group"
        >
          <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-all" />
          <span className="text-sm font-medium">{Math.floor(Math.random() * 100)}</span>
        </button>

            <button
              onClick={(event) => {
                event.stopPropagation();
                onBookmark?.();
              }}
          className="flex items-center gap-2 text-muted-foreground hover:text-coral-active transition-colors group"
        >
          <Bookmark
            className={`w-4 h-4 transition-all ${
              isBookmarked ? "fill-coral-active text-coral-active scale-110" : "group-hover:scale-110"
            }`}
          />
          <span className="text-sm font-medium">{Math.floor(Math.random() * 200)}</span>
        </button>

            <div className="ml-auto flex items-center gap-3">
              <button
          onClick={(event) => {
            event.stopPropagation();
            onShare?.();
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors group"
        >
          <Share2 className="w-4 h-4 group-hover:scale-110 transition-all" />
        </button>

              <button
                onClick={handleFluxaMode}
                className="rounded-full bg-primary/10 border border-primary/20 p-2 hover:bg-primary/20 transition-colors"
                aria-label="Open Fluxa Mode"
              >
                <img src={FluxaIcon} alt="Fluxa" className="w-6 h-6 opacity-80" />
              </button>
            </div>
          </div>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
              onClick={(event) => event.stopPropagation()}
            >
              Read full article →
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
