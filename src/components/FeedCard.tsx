import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { FluxaLogo } from "@/components/FluxaLogo";
import { cn } from "@/lib/utils";

interface FeedCardProps {
  id: string;
  headline: string;
  context: string;
  image_url: string | null;
  topic: string;
  topic_category: string;
  published_at: string;
}

export const FeedCard = ({
  id,
  headline,
  context,
  image_url,
  topic,
  topic_category,
  published_at
}: FeedCardProps) => {

  const navigate = useNavigate();

  const openPost = () => navigate(`/post/${id}`);

  const openFluxaMode = () => {
    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          gistId: id,
          topic,
          headline,
          context,
          fullContext: context
        }
      }
    });
  };

  return (
    <Card
      className="border rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer bg-card"
      onClick={openPost}
    >
      <CardContent className="p-0">
        
        {/* IMAGE */}
        {image_url && (
          <div className="relative w-full overflow-hidden">
            <img
              src={image_url}
              alt={headline}
              className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

        {/* TEXT CONTENT */}
        <div className="p-4">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
            {topic_category}
          </span>

          <h2 className="font-semibold text-lg mt-2 line-clamp-2">{headline}</h2>

          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
            {context}
          </p>

          {/* ACTION ROW */}
          <div
            className="flex items-center justify-between mt-4 pt-3 border-t border-border"
            onClick={(e) => e.stopPropagation()} // prevent card click
          >
            {/* LEFT ACTIONS */}
            <div className="flex items-center gap-4">

              <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition">
                <Heart className="w-5 h-5" />
              </button>

              <button
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition"
                onClick={() => navigate(`/post/${id}#comments`)}
              >
                <MessageCircle className="w-5 h-5" />
              </button>

              <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition">
                <Bookmark className="w-5 h-5" />
              </button>
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex items-center gap-4">

              <button className="text-muted-foreground hover:text-primary transition">
                <Share2 className="w-5 h-5" />
              </button>

              {/* FLUXA BUTTON */}
              <button
                className="text-primary hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  openFluxaMode();
                }}
                aria-label="Chat with Fluxa about this gist"
              >
                <FluxaLogo
                  size={20}
                  fillColor="currentColor"
                  className="w-5 h-5"
                />
              </button>

            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
