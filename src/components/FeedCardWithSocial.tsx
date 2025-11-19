import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageSquare, Bookmark, Share2 } from "lucide-react";
import { useArticleLikes, useArticleSaves } from "@/hooks/useSocialFeatures";
import { FluxaLogo } from "./FluxaLogo";

interface FeedCardWithSocialProps {
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
  comments?: number;
  credibilityScore?: number;
  views?: number;
  shares?: number;
  onShare?: () => void;
}

export const FeedCardWithSocial = (props: FeedCardWithSocialProps) => {
  const navigate = useNavigate();
  const { isLiked, likesCount, toggleLike } = useArticleLikes(props.id);
  const { isSaved, toggleSave } = useArticleSaves(props.id);

  const openPost = () => navigate(`/post/${props.id}`);

  const openFluxaMode = () => {
    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          gistId: props.id,
          topic: props.category,
          headline: props.headlineText || (typeof props.headline === "string" ? props.headline : undefined),
          context: props.contextText || (typeof props.context === "string" ? props.context : undefined),
          fullContext: props.fullContext || props.contextText,
        },
      },
    });
  };

  return (
    <article
      className="p-4 border-b border-border cursor-pointer hover:bg-secondary/20 transition-colors"
      onClick={openPost}
    >
      <div className="text-xs font-semibold text-primary mb-2 bg-primary/10 px-2 py-1 rounded w-fit">
        {props.category || "Trending"}
      </div>

      <h2 className="text-lg font-bold leading-snug mb-1">{props.headline}</h2>

      <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
        {props.context}
      </p>

      {props.imageUrl && (
        <div className="rounded-xl overflow-hidden border">
          <img
            src={props.imageUrl}
            alt={typeof props.headline === "string" ? props.headline : "Gist visual"}
            className="w-full object-cover"
          />
        </div>
      )}

      <div
        className="flex items-center gap-6 mt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={openFluxaMode}
          className="flex items-center gap-1 text-primary hover:opacity-80 transition"
          aria-label="Open Fluxa Mode"
        >
          <FluxaLogo size={16} fillColor="currentColor" />
        </button>

        <button
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition"
          onClick={toggleLike}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
          <span className="text-xs font-semibold">{likesCount}</span>
        </button>

        <button
          onClick={openPost}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-xs font-semibold">{props.comments ?? 0}</span>
        </button>

        <button
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition"
          onClick={() => toggleSave()}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
        </button>

        <button
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition"
          onClick={props.onShare}
        >
          <Share2 className="w-4 h-4" />
          <span className="sr-only">Share</span>
        </button>
      </div>
    </article>
  );
};
