import { useNavigate } from "react-router-dom";
import { MessageSquare, Heart, Bookmark, Share2 } from "lucide-react";
import { FluxaLogo } from "./FluxaLogo";

export const FeedCard = ({ gist }) => {
  const navigate = useNavigate();

  const handleOpenPost = () => {
    navigate(`/post/${gist.id}`, { state: { gist } });
  };

  const handleOpenFluxa = () => {
    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          gistId: gist.id,
          headline: gist.headline,
          context: gist.context,
          fullContext: gist.script,
          topic: gist.topic,
        },
      },
    });
  };

  return (
    <div
      className="p-4 border-b border-border cursor-pointer hover:bg-secondary/20 transition-colors"
      onClick={handleOpenPost}
    >
      {/* Topic Tag */}
      <div className="text-xs font-semibold text-primary mb-2 bg-primary/10 px-2 py-1 rounded w-fit">
        {gist.topic_category}
      </div>

      {/* Headline */}
      <h2 className="text-lg font-bold leading-snug mb-1">{gist.headline}</h2>

      {/* Context */}
      <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
        {gist.context}
      </p>

      {/* Image */}
      {gist.image_url && (
        <div className="rounded-xl overflow-hidden border">
          <img
            src={gist.image_url}
            alt="Gist visual"
            className="w-full object-cover"
          />
        </div>
      )}

      {/* Action Row */}
      <div
        className="flex items-center gap-6 mt-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fluxa Mode Button */}
        <button
          onClick={handleOpenFluxa}
          className="flex items-center gap-1 text-primary hover:opacity-80 transition"
        >
          <FluxaLogo size={16} fillColor="currentColor" />
        </button>

        {/* Like */}
        <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition">
          <Heart className="w-4 h-4" />
        </button>

        {/* Comment */}
        <button
          onClick={handleOpenPost}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        {/* Bookmark */}
        <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition">
          <Bookmark className="w-4 h-4" />
        </button>

        {/* Share */}
        <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition">
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FeedCard;
