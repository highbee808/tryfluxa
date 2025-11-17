import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Bookmark, Share2, Play, Pause, ArrowLeft, Send, Reply, ThumbsUp, Flag } from "lucide-react";
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
  parent_id: string | null;
  likes_count: number;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

type CommentSort = 'newest' | 'oldest' | 'most_liked' | 'most_replied';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [analytics, setAnalytics] = useState<Analytics>({ views: 0, likes: 0, comments: 0, shares: 0, plays: 0 });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentLikes, setCommentLikes] = useState<Set<string>>(new Set());
  const [commentSort, setCommentSort] = useState<CommentSort>('newest');
  const [visibleReplies, setVisibleReplies] = useState<Set<string>>(new Set());
  const [replyLimit] = useState(3);

  useEffect(() => {
    loadPost();
    loadUserInteractions();
    loadAnalytics();
    trackView();

    // Setup realtime subscription for comments
    const channel = supabase
      .channel(`post-${postId}-comments`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'article_comments',
          filter: `article_id=eq.${postId}`
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    // Setup realtime subscription for analytics
    const analyticsChannel = supabase
      .channel(`post-${postId}-analytics`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'post_analytics',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          if (payload.new) {
            setAnalytics(payload.new as Analytics);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(analyticsChannel);
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
      const { data, error } = await supabase
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
      await supabase.functions.invoke('track-post-event', {
        body: { postId, event: 'view' }
      });
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  const trackPlay = async () => {
    try {
      await supabase.functions.invoke('track-post-event', {
        body: { postId, event: 'play' }
      });
    } catch (error) {
      console.error("Error tracking play:", error);
    }
  };

  const trackShare = async () => {
    try {
      await supabase.functions.invoke('track-post-event', {
        body: { postId, event: 'share' }
      });
    } catch (error) {
      console.error("Error tracking share:", error);
    }
  };

  const loadComments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from("article_comments")
        .select("*")
        .eq("article_id", postId);

      // Apply sorting
      switch (commentSort) {
        case 'oldest':
          query = query.order("created_at", { ascending: true });
          break;
        case 'most_liked':
          query = query.order("likes_count", { ascending: false });
          break;
        case 'most_replied':
          // Will be sorted in JS after building thread structure
          query = query.order("created_at", { ascending: false });
          break;
        default: // newest
          query = query.order("created_at", { ascending: false });
      }

      const { data: commentsData, error } = await query;

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

        // Load user's comment likes
        if (user) {
          const commentIds = commentsData.map(c => c.id);
          const { data: likesData } = await supabase
            .from("comment_likes")
            .select("comment_id")
            .eq("user_id", user.id)
            .in("comment_id", commentIds);

          setCommentLikes(new Set(likesData?.map(l => l.comment_id) || []));
        }

        const commentsWithProfiles: Comment[] = commentsData.map(comment => ({
          ...comment,
          profiles: profilesMap.get(comment.user_id) || {
            display_name: "Anonymous",
            avatar_url: null,
          },
          replies: []
        }));

        // Build threaded comment structure
        const topLevelComments = commentsWithProfiles.filter(c => !c.parent_id);
        const repliesMap = new Map<string, Comment[]>();
        
        commentsWithProfiles.filter(c => c.parent_id).forEach(reply => {
          if (!repliesMap.has(reply.parent_id!)) {
            repliesMap.set(reply.parent_id!, []);
          }
          repliesMap.get(reply.parent_id!)!.push(reply);
        });

        topLevelComments.forEach(comment => {
          comment.replies = repliesMap.get(comment.id) || [];
        });

        // Sort by most replied if selected
        let sortedComments = topLevelComments;
        if (commentSort === 'most_replied') {
          sortedComments = topLevelComments.sort((a, b) => 
            (b.replies?.length || 0) - (a.replies?.length || 0)
          );
        }

        setComments(sortedComments);
      } else {
        setComments([]);
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

  const handlePostComment = async (parentId: string | null = null) => {
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
          parent_id: parentId,
        });

      if (error) throw error;

      setNewComment("");
      setReplyingTo(null);
      toast.success(parentId ? "Reply posted!" : "Comment posted!");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to like comments");
        return;
      }

      const isLiked = commentLikes.has(commentId);

      if (isLiked) {
        await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        
        setCommentLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(commentId);
          return newSet;
        });
      } else {
        await supabase
          .from("comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });
        
        setCommentLikes(prev => new Set(prev).add(commentId));
      }
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleReportComment = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to report");
        return;
      }

      await supabase
        .from("article_comments")
        .update({ is_reported: true })
        .eq("id", commentId);

      toast.success("Comment reported. Our team will review it.");
    } catch (error) {
      console.error("Error reporting comment:", error);
      toast.error("Failed to report comment");
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
                  onClick={() => {
                    setIsPlaying(!isPlaying);
                    if (!isPlaying) trackPlay();
                  }}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 group-hover:scale-110 transition-all" />
                  ) : (
                    <Play className="w-5 h-5 group-hover:scale-110 transition-all" />
                  )}
                  <span className="text-sm font-medium">{analytics.plays}</span>
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
                      isBookmarked ? "fill-coral-active text-coral-active scale-110" : "group-hover:scale-110"
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

            {/* Comments Section */}
            <div className="p-6 pt-0">
              <h3 className="text-lg font-semibold mb-4">
                Comments ({analytics.comments})
                <Badge variant="secondary" className="ml-2 text-xs">
                  {analytics.views} views
                </Badge>
              </h3>
              
              {/* Comment Sorting */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <div className="flex gap-1">
                  {(['newest', 'oldest', 'most_liked', 'most_replied'] as CommentSort[]).map((sort) => (
                    <Button
                      key={sort}
                      variant={commentSort === sort ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCommentSort(sort)}
                      className="text-xs capitalize"
                    >
                      {sort.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Comment Input */}
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
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={() => handlePostComment(replyingTo)}
                    disabled={!newComment.trim()}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="space-y-3">
                    {/* Main Comment */}
                    <div className="flex gap-3">
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
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">
                            {comment.profiles?.display_name || "Anonymous"}
                          </p>
                          <UserBadges userId={comment.user_id} />
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm mb-2">{comment.content}</p>
                        
                        {/* Comment Actions */}
                        <div className="flex items-center gap-4 text-xs">
                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            className={cn(
                              "flex items-center gap-1 transition-colors",
                              commentLikes.has(comment.id)
                                ? "text-primary"
                                : "text-muted-foreground hover:text-primary"
                            )}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>{comment.likes_count}</span>
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(comment.id);
                              setNewComment("");
                            }}
                            className="flex items-center gap-1 text-muted-foreground hover:text-blue-500 transition-colors"
                          >
                            <Reply className="w-3 h-3" />
                            <span>Reply</span>
                          </button>
                          <button
                            onClick={() => handleReportComment(comment.id)}
                            className="flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Flag className="w-3 h-3" />
                            <span>Report</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-11 space-y-3 border-l-2 border-border pl-4">
                        {comment.replies
                          .slice(0, visibleReplies.has(comment.id) ? undefined : replyLimit)
                          .map((reply) => (
                          <div key={reply.id} className="flex gap-3">
                            <Avatar className="w-6 h-6">
                              {reply.profiles?.avatar_url ? (
                                <AvatarImage src={reply.profiles.avatar_url} />
                              ) : (
                                <AvatarFallback className="bg-secondary text-xs">
                                  {reply.profiles?.display_name?.substring(0, 2).toUpperCase() || "U"}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {reply.profiles?.display_name || "Anonymous"}
                              </p>
                              <p className="text-xs text-muted-foreground mb-2">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-sm mb-2">{reply.content}</p>
                              
                              {/* Reply Actions */}
                              <div className="flex items-center gap-4 text-xs">
                                <button
                                  onClick={() => handleLikeComment(reply.id)}
                                  className={cn(
                                    "flex items-center gap-1 transition-colors",
                                    commentLikes.has(reply.id)
                                      ? "text-primary"
                                      : "text-muted-foreground hover:text-primary"
                                  )}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  <span>{reply.likes_count}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingTo(comment.id);
                                    setNewComment("");
                                  }}
                                  className="flex items-center gap-1 text-muted-foreground hover:text-blue-500 transition-colors"
                                >
                                  <Reply className="w-3 h-3" />
                                  <span>Reply</span>
                                </button>
                                <button
                                  onClick={() => handleReportComment(reply.id)}
                                  className="flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                  <Flag className="w-3 h-3" />
                                  <span>Report</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Load More Replies Button */}
                        {comment.replies.length > replyLimit && !visibleReplies.has(comment.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVisibleReplies(prev => new Set([...prev, comment.id]))}
                            className="text-xs"
                          >
                            Load {comment.replies.length - replyLimit} more {comment.replies.length - replyLimit === 1 ? 'reply' : 'replies'}
                          </Button>
                        )}
                        
                        {visibleReplies.has(comment.id) && comment.replies.length > replyLimit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVisibleReplies(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(comment.id);
                              return newSet;
                            })}
                            className="text-xs"
                          >
                            Show less
                          </Button>
                        )}
                      </div>
                    )}
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
