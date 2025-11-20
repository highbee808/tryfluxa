import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  ArrowLeft,
  Send,
  Reply,
  ThumbsUp,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { MentionInput } from "@/components/MentionInput";
import { UserBadges } from "@/components/UserBadges";

interface Gist {
  id: string;
  headline: string;
  context: string;
  script: string;
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
  parent_id: string | null;
  likes_count: number;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

type CommentSort = "newest" | "oldest" | "most_liked" | "most_replied";

interface Analytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  plays: number;
}

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [gist, setGist] = useState<Gist | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [analytics, setAnalytics] = useState<Analytics>({
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    plays: 0,
  });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentLikes, setCommentLikes] = useState<Set<string>>(new Set());
  const [commentSort, setCommentSort] = useState<CommentSort>("newest");
  const [visibleReplies, setVisibleReplies] = useState<Set<string>>(new Set());
  const [replyLimit] = useState(3);
  const [isExpanded, setIsExpanded] = useState(false);

  const fullBody = `${gist?.context || ""}${
    gist?.context && gist?.script ? "\n\n" : ""
  }${gist?.script || ""}`.trim();

  const COLLAPSE_LIMIT = 420;
  const shouldCollapse = fullBody.length > COLLAPSE_LIMIT;
  const displayedBody = !shouldCollapse || isExpanded
    ? fullBody
    : fullBody.slice(0, COLLAPSE_LIMIT).trimEnd() + "…";

  useEffect(() => {
    loadPost();
    loadUserInteractions();
    loadAnalytics();
    trackView();

    const channel = supabase
      .channel(`post-${postId}-comments`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "article_comments",
          filter: `article_id=eq.${postId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    const analyticsChannel = supabase
      .channel(`post-${postId}-analytics`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "post_analytics",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          if (payload.new) {
            setAnalytics(payload.new as Analytics);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel as RealtimeChannel);
      supabase.removeChannel(analyticsChannel as RealtimeChannel);
    };
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [postId, commentSort]);

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

  const loadAnalytics = async () => {
    try {
      const { data } = await supabase
        .from("post_analytics")
        .select("*")
        .eq("post_id", postId)
        .single();

      if (data) {
        setAnalytics(data);
        setCommentsCount(data.comments);
        setLikesCount(data.likes);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const trackView = async () => {
    try {
      await supabase.functions.invoke("track-post-event", {
        body: { postId, event: "view" },
      });
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  const trackShare = async () => {
    try {
      await supabase.functions.invoke("track-post-event", {
        body: { postId, event: "share" },
      });
    } catch (error) {
      console.error("Error tracking share:", error);
    }
  };

  const loadComments = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let query = supabase
        .from("article_comments")
        .select("*")
        .eq("article_id", postId);

      switch (commentSort) {
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "most_liked":
          query = query.order("likes_count", { ascending: false });
          break;
        case "most_replied":
          query = query.order("reply_count", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      const commentLikesSet = new Set<string>();
      if (user) {
        const { data: likesData } = await supabase
          .from("comment_likes")
          .select("comment_id")
          .eq("user_id", user.id);

        likesData?.forEach((like) => {
          commentLikesSet.add(like.comment_id);
        });
      }

      const { data: replies, error: repliesError } = await supabase
        .from("article_comments")
        .select("*")
        .eq("article_id", postId)
        .not("parent_id", "is", null);

      if (repliesError) throw repliesError;

      const repliesMap = new Map<string, Comment[]>();
      replies?.forEach((reply) => {
        if (!reply.parent_id) return;
        if (!repliesMap.has(reply.parent_id)) {
          repliesMap.set(reply.parent_id, []);
        }
        repliesMap.get(reply.parent_id)?.push(reply as Comment);
      });

      const rootComments = (data as Comment[])
        .filter((comment) => !comment.parent_id)
        .map((comment) => ({
          ...comment,
          replies: repliesMap.get(comment.id) || [],
        }));

      setComments(rootComments);
      setCommentLikes(commentLikesSet);
      setCommentsCount(data.length);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const loadUserInteractions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: likeData } = await supabase
        .from("post_likes")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: bookmarkData } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      setIsLiked(!!likeData);
      setIsBookmarked(!!bookmarkData);
      setBookmarksCount(bookmarkData ? bookmarksCount + 1 : bookmarksCount);
    } catch (error) {
      console.error("Error loading interactions:", error);
    }
  };

  const handleLike = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to like posts");
        return;
      }

      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount((prev) => prev + (newLikedState ? 1 : -1));

      const { error } = await supabase.functions.invoke("toggle-like", {
        body: { postId, userId: user.id },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error toggling like:", error);
      setIsLiked((prev) => !prev);
      setLikesCount((prev) => prev + (isLiked ? 1 : -1));
    }
  };

  const handleBookmark = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to bookmark posts");
        return;
      }

      const newBookmarkState = !isBookmarked;
      setIsBookmarked(newBookmarkState);
      setBookmarksCount((prev) => prev + (newBookmarkState ? 1 : -1));

      const { error } = await supabase.functions.invoke("toggle-bookmark", {
        body: { postId, userId: user.id },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      setIsBookmarked((prev) => !prev);
      setBookmarksCount((prev) => prev + (isBookmarked ? 1 : -1));
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to comment");
        return;
      }

      const { data, error } = await supabase
        .from("article_comments")
        .insert({
          article_id: postId,
          user_id: user.id,
          content: newComment,
          parent_id: replyingTo,
        })
        .select(
          "*, profiles:profiles(user_id, display_name, avatar_url)"
        )
        .single();

      if (error) throw error;

      setNewComment("");
      setReplyingTo(null);

      if (replyingTo) {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === replyingTo
              ? {
                  ...comment,
                  replies: [
                    ...(comment.replies || []),
                    data as unknown as Comment,
                  ],
                }
              : comment
          )
        );
      } else {
        setComments((prev) => [data as unknown as Comment, ...prev]);
      }

      setCommentsCount((prev) => prev + 1);
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to like comments");
        return;
      }

      const isLikedComment = commentLikes.has(commentId);
      const newCommentLikes = new Set(commentLikes);

      if (isLikedComment) {
        newCommentLikes.delete(commentId);
      } else {
        newCommentLikes.add(commentId);
      }

      setCommentLikes(newCommentLikes);
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                likes_count: comment.likes_count + (isLikedComment ? -1 : 1),
              }
            : comment
        )
      );

      const { error } = await supabase.functions.invoke("toggle-comment-like", {
        body: { commentId, userId: user.id },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error toggling comment like:", error);
    }
  };

  const handleReportComment = async (commentId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to report comments");
        return;
      }

      const { error } = await supabase.from("comment_reports").insert({
        comment_id: commentId,
        user_id: user.id,
        reason: "Inappropriate content",
      });

      if (error) throw error;
      toast.success("Comment reported");
    } catch (error) {
      console.error("Error reporting comment:", error);
      toast.error("Failed to report comment");
    }
  };

  const toggleReplies = (commentId: string) => {
    setVisibleReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const showReplies = visibleReplies.has(comment.id);
    const replies = comment.replies || [];
    const limitedReplies = replies.slice(0, replyLimit);
    const hiddenReplies = replies.length - limitedReplies.length;

    return (
      <div key={comment.id} className="space-y-3">
        <div className="flex gap-2">
          <Avatar className="w-9 h-9">
            {comment.profiles?.avatar_url ? (
              <AvatarImage
                src={comment.profiles.avatar_url}
                alt={comment.profiles.display_name}
              />
            ) : (
              <AvatarFallback>
                {comment.profiles?.display_name?.substring(0, 2).toUpperCase() ||
                  "U"}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {comment.profiles?.display_name || "Anonymous"}
              </span>
              <UserBadges userId={comment.user_id} size="sm" />
              {comment.user_id === gist?.id && (
                <Badge variant="outline" className="text-xs">
                  Author
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {comment.content}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <button
                onClick={() => handleLikeComment(comment.id)}
                className={cn(
                  "flex items-center gap-1",
                  commentLikes.has(comment.id) && "text-primary"
                )}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{comment.likes_count}</span>
              </button>
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="flex items-center gap-1 hover:text-primary"
              >
                <Reply className="w-4 h-4" />
                <span>Reply</span>
              </button>
              <button
                onClick={() => handleReportComment(comment.id)}
                className="flex items-center gap-1 hover:text-destructive"
              >
                <Flag className="w-4 h-4" />
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>

        {replies.length > 0 && (
          <div className="ml-12 space-y-3">
            <button
              onClick={() => toggleReplies(comment.id)}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              {showReplies
                ? "Hide replies"
                : `Show replies (${replies.length})`}
            </button>

            {showReplies && (
              <div className="space-y-3">
                {limitedReplies.map((reply) => (
                  <div key={reply.id} className="flex gap-2">
                    <Avatar className="w-8 h-8">
                      {reply.profiles?.avatar_url ? (
                        <AvatarImage
                          src={reply.profiles.avatar_url}
                          alt={reply.profiles.display_name}
                        />
                      ) : (
                        <AvatarFallback>
                          {reply.profiles?.display_name
                            ?.substring(0, 2)
                            .toUpperCase() || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {reply.profiles?.display_name || "Anonymous"}
                        </span>
                        <UserBadges userId={reply.user_id} size="sm" />
                        {reply.user_id === gist?.id && (
                          <Badge variant="outline" className="text-xs">
                            Author
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                ))}

                {hiddenReplies > 0 && (
                  <button className="text-xs text-muted-foreground">
                    +{hiddenReplies} more replies
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <div className="h-12 w-32 bg-secondary/50 rounded-full animate-pulse" />
          <div className="h-8 w-64 bg-secondary/50 rounded-full animate-pulse" />
          <div className="h-64 w-full bg-secondary/50 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!gist) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto p-4 text-center space-y-4">
          <h1 className="text-2xl font-bold">Post not found</h1>
          <Button onClick={() => navigate("/")}>Return to feed</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto p-4 pb-20 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Button>

        <Card className="border-glass-border-light shadow-glass bg-card/90 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="p-4 flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {gist.image_url ? (
                  <AvatarImage src={gist.image_url} alt={gist.headline} />
                ) : (
                  <AvatarFallback>
                    {gist.headline.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h2 className="font-semibold">Fluxa</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Posted {new Date(gist.published_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <Badge variant="secondary">{gist.topic}</Badge>
                </div>
              </div>
            </div>

            {gist.image_url && (
              <img
                src={gist.image_url}
                alt={gist.headline}
                className="w-full h-64 object-cover"
              />
            )}

            <div className="p-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-4">
                {gist.headline}
              </h1>

              {fullBody && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {displayedBody}
                  </p>

                  {shouldCollapse && (
                    <button
                      type="button"
                      onClick={() => setIsExpanded((prev) => !prev)}
                      className="text-xs font-semibold text-primary hover:text-primary/80"
                    >
                      {isExpanded ? "See less" : "See more"}
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-6 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm font-medium">{analytics.plays}</span>
                  <span className="text-xs uppercase tracking-wide">Listens</span>
                </div>

                <button
                  onClick={handleLike}
                  className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors group"
                >
                  <Heart
                    className={`w-5 h-5 transition-all ${
                      isLiked
                        ? "fill-red-500 text-red-500 scale-110"
                        : "group-hover:scale-110"
                    }`}
                  />
                  <span className="text-sm font-medium">{analytics.likes}</span>
                </button>

                <button className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group">
                  <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-all" />
                  <span className="text-sm font-medium">{analytics.comments}</span>
                </button>

                <button
                  onClick={handleBookmark}
                  className="flex items-center gap-2 text-muted-foreground hover:text-coral-active transition-colors group"
                >
                  <Bookmark
                    className={`w-5 h-5 transition-all ${
                      isBookmarked
                        ? "fill-coral-active text-coral-active scale-110"
                        : "group-hover:scale-110"
                    }`}
                  />
                  <span className="text-sm font-medium">{bookmarksCount}</span>
                </button>

                <button
                  onClick={trackShare}
                  className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors ml-auto group"
                >
                  <Share2 className="w-5 h-5 group-hover:scale-110 transition-all" />
                  <span className="text-sm font-medium">{analytics.shares}</span>
                </button>
              </div>
            </div>

            <div className="p-6 pt-0">
              <h3 className="text-lg font-semibold mb-4">
                Comments ({analytics.comments})
                <Badge variant="secondary" className="ml-2 text-xs">
                  {analytics.views} views
                </Badge>
              </h3>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <div className="flex gap-1">
                  {(["newest", "oldest", "most_liked", "most_replied"] as CommentSort[]).map(
                    (sort) => (
                      <Button
                        key={sort}
                        variant={commentSort === sort ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCommentSort(sort)}
                        className="text-xs capitalize"
                      >
                        {sort.replace("_", " ")}
                      </Button>
                    )
                  )}
                </div>
              </div>

              <div className="flex gap-2 mb-6">
                <MentionInput
                  placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                  value={newComment}
                  onChange={setNewComment}
                  className="min-h-[80px]"
                />
                <div className="flex flex-col gap-2">
                  {replyingTo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(null);
                        setNewComment("");
                      }}
                    >
                      Cancel reply
                    </Button>
                  )}
                  <Button onClick={handleComment} size="sm" className="gap-2">
                    <Send className="w-4 h-4" />
                    Post
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {comments.map((comment) => renderComment(comment))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomNavigation />
    </div>
  );
}
