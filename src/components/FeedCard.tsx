import { Heart, MessageCircle, Bookmark, Share2, Play, Pause, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  isPlaying: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onPlay: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
}

export const FeedCard = ({
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
  isPlaying,
  isLiked,
  isBookmarked,
  onPlay,
  onLike,
  onComment,
  onBookmark,
  onShare,
}: FeedCardProps) => {
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
          <Badge variant="outline" className="text-xs capitalize">
            {author}
          </Badge>
        </div>

        {/* Image with Play Button */}
        {imageUrl && (
          <div className="relative group cursor-pointer" onClick={onPlay}>
            <img
              src={imageUrl}
              alt={headline}
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            <button
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-blue-600" />
              ) : (
                <Play className="w-8 h-8 text-blue-600 ml-1" />
              )}
            </button>
          </div>
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
          <div className="flex items-center gap-6 pt-4 border-t border-border">
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
              onClick={onComment}
              className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group"
            >
              <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-all" />
              <span className="text-sm font-medium">{comments}</span>
            </button>

            <button
              onClick={onBookmark}
              className="flex items-center gap-2 text-muted-foreground hover:text-purple-500 transition-colors group"
            >
              <Bookmark
                className={`w-5 h-5 transition-all ${
                  isBookmarked ? "fill-purple-500 text-purple-500 scale-110" : "group-hover:scale-110"
                }`}
              />
              <span className="text-sm font-medium">{bookmarks}</span>
            </button>

            <button
              onClick={onShare}
              className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors ml-auto group"
            >
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-all" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
