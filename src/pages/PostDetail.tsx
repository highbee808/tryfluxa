import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NavigationBar } from "@/components/NavigationBar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Bookmark, Share2, Play, Pause, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

interface Gist {
  id: string;
  headline: string;
  context: string;
  script: string;
  audio_url: string;
  image_url: string | null;
  topic: string;
  published_at: string;
  play_count: number;
  favorite_count: number;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  };
}

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [gist, setGist] = useState<Gist | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);

  useEffect(() => {
    loadPost();
    loadComments();
    loadUserInteractions();
  }, [postId]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from("gists")
        .select("*")
        .eq("id", postId)
        .single();

      if (error) throw error;
      setGist(data);
      setLikesCount(data.favorite_count || 0);
    } catch (error) {
      console.error("Error loading post:", error);
      toast.error("Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from("article_comments")
        .select("*")
        .eq("article_id", postId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for comment authors
      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, p]) || []
        );

        const commentsWithProfiles = commentsData.map(comment => ({
          ...comment,
          profiles: profilesMap.get(comment.user_id) || {
            display_name: "Anonymous",
            avatar_url: null,
          },
        }));

        setComments(commentsWithProfiles);
        setCommentsCount(commentsWithProfiles.length);
      } else {
        setComments([]);
        setCommentsCount(0);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const loadUserInteractions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [likesData, savesData] = await Promise.all([
        supabase
          .from("article_likes")
          .select("id")
          .eq("article_id", postId)
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("article_saves")
          .select("id")
          .eq("article_id", postId)
          .eq("user_id", user.id)
          .single(),
      ]);

      setIsLiked(!!likesData.data);
      setIsBookmarked(!!savesData.data);
    } catch (error) {
      console.error("Error loading user interactions:", error);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to comment");
        return;
      }

      const { error } = await supabase
        .from("article_comments")
        .insert({
          article_id: postId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      loadComments();
      toast.success("Comment posted!");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    }
  };

  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to like");
        return;
      }

      if (isLiked) {
        await supabase
          .from("article_likes")
          .delete()
          .eq("article_id", postId)
          .eq("user_id", user.id);
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await supabase
          .from("article_likes")
          .insert({ article_id: postId, user_id: user.id });
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleBookmark = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to bookmark");
        return;
      }

      if (isBookmarked) {
        await supabase
          .from("article_saves")
          .delete()
          .eq("article_id", postId)
          .eq("user_id", user.id);
        setIsBookmarked(false);
        setBookmarksCount(prev => prev - 1);
      } else {
        await supabase
          .from("article_saves")
          .insert({ article_id: postId, user_id: user.id });
        setIsBookmarked(true);
        setBookmarksCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!gist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Post not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavigationBar />
      
      <div className="max-w-2xl mx-auto p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Button>

        <Card className="overflow-hidden border shadow-sm bg-card">
          <CardContent className="p-0">
            {/* Author Info */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                    FL
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Fluxa</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(gist.published_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs capitalize">
                {gist.topic}
              </Badge>
            </div>

            {/* Image */}
            {gist.image_url && (
              <img
                src={gist.image_url}
                alt={gist.headline}
                className="w-full h-64 object-cover"
              />
            )}

            {/* Content */}
            <div className="p-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-4">
                {gist.headline}
              </h1>
              <p className="text-muted-foreground text-base mb-6">
                {gist.context}
              </p>
              <div className="prose prose-sm max-w-none mb-6">
                <p className="whitespace-pre-line">{gist.script}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-6 pt-4 border-t border-border">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 group-hover:scale-110 transition-all" />
                  ) : (
                    <Play className="w-5 h-5 group-hover:scale-110 transition-all" />
                  )}
                  <span className="text-sm font-medium">{gist.play_count || 0}</span>
                </button>

                <button
                  onClick={handleLike}
                  className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors group"
                >
                  <Heart
                    className={`w-5 h-5 transition-all ${
                      isLiked ? "fill-red-500 text-red-500 scale-110" : "group-hover:scale-110"
                    }`}
                  />
                  <span className="text-sm font-medium">{likesCount}</span>
                </button>

                <button className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group">
                  <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-all" />
                  <span className="text-sm font-medium">{commentsCount}</span>
                </button>

                <button
                  onClick={handleBookmark}
                  className="flex items-center gap-2 text-muted-foreground hover:text-coral-active transition-colors group"
                >
                  <Bookmark
                    className={`w-5 h-5 transition-all ${
                      isBookmarked ? "fill-coral-active text-coral-active scale-110" : "group-hover:scale-110"
                    }`}
                  />
                  <span className="text-sm font-medium">{bookmarksCount}</span>
                </button>

                <button className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors ml-auto group">
                  <Share2 className="w-5 h-5 group-hover:scale-110 transition-all" />
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="p-6 pt-0">
              <h3 className="text-lg font-semibold mb-4">Comments ({commentsCount})</h3>
              
              {/* Comment Input */}
              <div className="flex gap-2 mb-6">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  onClick={handlePostComment}
                  disabled={!newComment.trim()}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      {comment.profiles?.avatar_url ? (
                        <AvatarImage src={comment.profiles.avatar_url} />
                      ) : (
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {comment.profiles?.display_name?.substring(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {comment.profiles?.display_name || "Anonymous"}
                      </p>
                      <p className="text-xs text-muted-foreground mb-1">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}
