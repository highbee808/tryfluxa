import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { fetchPostBySourceAndId, incrementViewCount } from "@/lib/postData";
import { sharePost } from "@/lib/shareUtils";
import { buildAskFluxaPrompt } from "@/lib/fluxaPrompt";
import { supabase } from "@/integrations/supabase/client";
import { fetchRecentGists, type DbGist } from "@/lib/feedData";

import BottomNavigation from "@/components/BottomNavigation";
import { DesktopNavigationWidget } from "@/components/DesktopNavigationWidget";
import { DesktopRightWidgets } from "@/components/DesktopRightWidgets";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Eye,
  Clock,
  Headphones,
  ArrowLeft,
  Send,
} from "lucide-react";

import { FluxaLogo } from "@/components/FluxaLogo";

interface PostData {
  id: string;
  headline: string;
  title?: string;
  context: string;
  summary?: string;
  script?: string;
  narration?: string;
  image_url: string | null;
  topic: string;
  topic_category?: string | null;
  category?: string;
  published_at: string | null;
  created_at?: string | null;
  audio_url?: string | null;
  source_url?: string | null;
  source_image_url?: string | null;
  ai_image_url?: string | null;
  url?: string;
  views_count?: number;
  comments_count?: number;
  play_count?: number;
  like_count?: number;
  save_count?: number;
  comment_count?: number;
}

const EXPAND_THRESHOLD = 300;

export default function PostDetail() {
  const { source, id } = useParams<{ source: string; id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const origin = searchParams.get('origin') || 'feed'; // Default to 'feed' if not specified
  const teamId = searchParams.get('teamId'); // For team origin
  const artistId = searchParams.get('artistId'); // For music origin (future)

  const [post, setPost] = useState<PostData | null>(null);
  const [postSource, setPostSource] = useState<"gist" | "news" | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [bookmarks, setBookmarks] = useState(0);
  const [views, setViews] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const commentArticleFieldRef = useRef<"article_id" | "post_id">("article_id");
  const [trendingGists, setTrendingGists] = useState<DbGist[]>([]);
  const isLoadingPostRef = useRef(false);

  useEffect(() => {
    if (!source || !id) {
      setLoading(false);
      return;
    }
    // Validate source is either "gist" or "news"
    if (source !== "gist" && source !== "news") {
      setLoading(false);
      return;
    }
    // Prevent multiple simultaneous loads
    if (isLoadingPostRef.current) {
      return;
    }
    loadPost();
    loadTrendingGists();
  }, [source, id]);

  const loadTrendingGists = async () => {
    try {
      const gists = await fetchRecentGists(5);
      setTrendingGists(gists);
    } catch (error) {
      console.error("Error loading trending gists:", error);
    }
  };

  async function loadPost() {
    if (!source || !id) return;
    if (source !== "gist" && source !== "news") return;
    
    // Prevent multiple simultaneous loads
    if (isLoadingPostRef.current) {
      return;
    }
    isLoadingPostRef.current = true;

    setLoading(true);
    const loadStartTime = Date.now();
    try {
      const result = await fetchPostBySourceAndId(source as "gist" | "news", id);

      if (!result) {
        setLoading(false);
        return;
      }

      const { source: resultSource, data } = result;
      setPostSource(resultSource);

      // Normalize data from both sources
      const normalizedPost: PostData = {
        id: data.id,
        headline: data.headline || data.title || "Untitled",
        title: data.title,
        context: data.context || data.summary || "",
        summary: data.summary,
        script: data.script || data.narration || "",
        narration: data.narration,
        image_url: data.image_url && data.image_url !== 'null' && data.image_url.trim() !== '' ? data.image_url : null,
        source_image_url: (data.source_image_url && data.source_image_url !== 'null' && data.source_image_url.trim() !== '') 
          || (data.meta?.source_image_url && data.meta.source_image_url !== 'null' && data.meta.source_image_url.trim() !== '')
          ? (data.source_image_url || data.meta?.source_image_url) : null,
        ai_image_url: data.ai_image_url && data.ai_image_url !== 'null' && data.ai_image_url.trim() !== '' 
          ? data.ai_image_url 
          : (data.meta?.ai_generated_image && data.meta.ai_generated_image !== 'null' && data.meta.ai_generated_image.trim() !== '' 
            ? data.meta.ai_generated_image : null),
        topic: data.topic || data.category || "General",
        topic_category: data.topic_category,
        category: data.category,
        published_at: data.published_at || data.created_at || null,
        created_at: data.created_at,
        audio_url: data.audio_url,
        source_url: data.source_url,
        url: data.url,
        views_count: data.views_count || 0,
        comments_count: data.comments_count || 0,
        play_count: data.play_count || 0,
        like_count: data.like_count || 0,
        save_count: data.save_count || 0,
        comment_count: data.comment_count || 0,
      };

      setPost(normalizedPost);
      setLikes(normalizedPost.like_count || 0);
      setBookmarks(normalizedPost.save_count || 0);
      setViews(normalizedPost.views_count || 0);

      // Increment view count
      if (resultSource) {
        await incrementViewCount(resultSource, id);
        // Update local view count after increment
        setViews((prev) => prev + 1);
      }

      // Load user actions and comments (for gists and content_items)
      // Note: Comments use article_id for both gists and content_items
      if (resultSource === "gist" || resultSource === "news") {
        const userActionsStart = Date.now();
        const authUser = await supabase.auth.getUser();

        if (authUser.data.user) {
          const userId = authUser.data.user.id;

          // Use Promise.race with timeout for user actions
          const likePromise = supabase
            .from("article_likes")
            .select("id")
            .eq("article_id", id)
            .eq("user_id", userId)
            .maybeSingle();

          const savePromise = supabase
            .from("article_saves")
            .select("id")
            .eq("article_id", id)
            .eq("user_id", userId)
            .maybeSingle();

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("User actions timeout")), 2000)
          );

          try {
            const [likeResult, saveResult] = await Promise.race([
              Promise.all([likePromise, savePromise]),
              timeoutPromise
            ]) as any[];
            
            setIsLiked(!!likeResult?.data);
            setIsBookmarked(!!saveResult?.data);
          } catch (error) {
            console.warn("[PostDetail] User actions query timeout or error:", error);
            // Continue without user actions
          }
        }

        // Load comments (with timeout)
        const commentsStart = Date.now();
        try {
          await Promise.race([
            loadComments(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Comments timeout")), 3000))
          ]);
        } catch (error) {
          console.warn("[PostDetail] Comments load timeout or error:", error);
          // Continue without comments
        }
      }
    } catch (error) {
      console.error("Error loading post:", error);
    } finally {
      setLoading(false);
      isLoadingPostRef.current = false;
    }
  }

  const toggleLike = async () => {
    if (!id || !postSource) return; // Allow likes for both gists and content_items
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    if (isLiked) {
      await supabase
        .from("article_likes")
        .delete()
        .eq("article_id", id)
        .eq("user_id", user.id);
      setLikes((l) => l - 1);
    } else {
      await supabase
        .from("article_likes")
        .insert({ article_id: id, user_id: user.id });
      setLikes((l) => l + 1);
    }

    setIsLiked(!isLiked);
  };

  const toggleBookmark = async () => {
    if (!id || !postSource) return; // Allow bookmarks for both gists and content_items
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    if (isBookmarked) {
      await supabase
        .from("article_saves")
        .delete()
        .eq("article_id", id)
        .eq("user_id", user.id);
      setBookmarks((b) => b - 1);
    } else {
      await supabase
        .from("article_saves")
        .insert({ article_id: id, user_id: user.id });
      setBookmarks((b) => b + 1);
    }

    setIsBookmarked(!isBookmarked);
  };

  const isMissingColumnError = (error: any, column: "article_id" | "post_id") => {
    const combined = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
    return combined.includes(column) && combined.includes("column");
  };

  const fetchCommentsByColumn = async (column: "article_id" | "post_id") => {
    // Use dynamic column approach to avoid TypeScript issues
    const query: any = supabase.from("article_comments").select("*");
    const filtered = column === "article_id" ? query.eq("article_id", id) : query.eq("post_id", id);
    return await filtered.order("created_at", { ascending: false });
  };

  const loadComments = async () => {
    if (!id || !postSource) return; // Allow comments for both gists and content_items

    setIsLoadingComments(true);
    try {
      const column = commentArticleFieldRef.current;
      
      // Add timeout to comments query
      const commentsQueryPromise = fetchCommentsByColumn(column);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Comments query timeout")), 2000)
      );

      let { data, error } = await Promise.race([commentsQueryPromise, timeoutPromise]) as any;

      if (error && isMissingColumnError(error, column)) {
        const fallbackColumn = column === "article_id" ? "post_id" : "article_id";
        console.warn(
          `[comments] Column "${column}" missing, retrying with "${fallbackColumn}".`
        );
        commentArticleFieldRef.current = fallbackColumn;
        
        const fallbackPromise = fetchCommentsByColumn(fallbackColumn);
        const fallbackTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Fallback comments query timeout")), 2000)
        );
        ({ data, error } = await Promise.race([fallbackPromise, fallbackTimeout]) as any);
      }

      if (error) {
        console.error("Error loading comments:", error);
        return;
      }

      // Get all unique user IDs
      const userIds: string[] = Array.from(new Set(
        (data || []).map((c: any) => {
          const uid = c.user_id;
          return typeof uid === 'string' ? uid : String(uid || '');
        }).filter((uid: string) => uid && uid.trim() !== '')
      )) as string[];
      
      // Fetch all profiles at once
      const { data: profiles } = userIds.length > 0 ? await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds) : { data: null };

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      const commentsWithProfiles = (data || []).map((comment) => {
        const profile = profileMap.get(comment.user_id);
        
        // If no profile exists, try to extract username from user_id or use a default
        // For now, we'll show a generic name but ensure it's not "Anonymous" for signed-in users
        if (!profile) {
          // Check if we can get user info - for signed-in users, we should have a profile
          // If not, it might be an old comment or the profile wasn't created
          return {
            ...comment,
            profile: {
              display_name: "User",
              avatar_url: null,
            },
          };
        }

        return {
          ...comment,
          profile: {
            display_name: profile.display_name || "User",
            avatar_url: profile.avatar_url,
          },
        };
      });
      setComments(commentsWithProfiles);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!id || !commentText.trim() || !postSource || isSubmittingComment) return; // Allow comments for both gists and content_items

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      toast.error("You need to be signed in to comment");
      return;
    }

    setIsSubmittingComment(true);
    try {
      const trimmedContent = commentText.trim();
      if (!trimmedContent) {
        toast.error("Comment cannot be empty");
        setIsSubmittingComment(false);
        return;
      }

      const insertComment = async (column: "article_id" | "post_id") => {
        // Ensure user_id matches auth.uid() for RLS policy
        const basePayload = {
          user_id: user.id, // Must match auth.uid() exactly
          content: trimmedContent,
        };
        
        // Create properly typed payload based on column
        const payload = column === "article_id" 
          ? { ...basePayload, article_id: id }
          : { ...basePayload, post_id: id };

        // Add timeout to insert
        const insertPromise = supabase.from("article_comments").insert(payload as any).select().single();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Insert timeout")), 5000)
        );

        const result = await Promise.race([insertPromise, timeoutPromise]) as any;

        return result;
      };

      const column = commentArticleFieldRef.current;
      let { error, data } = await insertComment(column);

      if (error && isMissingColumnError(error, column)) {
        const fallbackColumn = column === "article_id" ? "post_id" : "article_id";
        console.warn(
          `[comments] Insert failed for column "${column}", retrying with "${fallbackColumn}".`
        );
        commentArticleFieldRef.current = fallbackColumn;
        ({ error, data } = await insertComment(fallbackColumn));
      }

      if (error) {
        console.error("Error submitting comment:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        console.error("User ID:", user.id);
        console.error("Article ID:", id);
        
        if (error.code === "42501" || error.message?.includes("permission") || error.message?.includes("policy")) {
          toast.error("You don't have permission to comment. Please sign out and sign back in.");
        } else if (error.code === "23503" || error.message?.includes("foreign key")) {
          toast.error("This post doesn't exist or has been removed.");
        } else if (error.code === "23514" || error.message?.includes("check constraint")) {
          toast.error("Comment content is invalid.");
        } else {
          toast.error(`Couldn't post your comment: ${error.message || "Unknown error"}`);
        }
      } else {
        // Comment was successfully posted
        setCommentText("");
        
        // Try to ensure user has a profile entry (non-blocking)
        // This runs in the background and won't affect comment submission
        supabase.auth.getUser().then(async ({ data: { user: currentUser } }) => {
          if (currentUser) {
            try {
              const { data: existingProfile } = await supabase
                .from("profiles")
                .select("user_id")
                .eq("user_id", currentUser.id)
                .maybeSingle();

              if (!existingProfile) {
                const username = currentUser.email?.split('@')[0] || 'User';
                await supabase
                  .from("profiles")
                  .insert({
                    user_id: currentUser.id,
                    display_name: username,
                    avatar_url: null,
                  });
                // Ignore errors - profile might already exist or RLS might prevent it
              }
            } catch (profileErr) {
              // Silently ignore profile creation errors
              console.log('Profile creation skipped:', profileErr);
            }
          }
        }).catch(() => {
          // Ignore auth errors
        });

        // Reload comments to show the new one
        await loadComments();
        toast.success("Comment posted!");
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Couldn't post your comment: ${errorMessage}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    await sharePost({
      title: post.headline,
      text: post.context || post.summary || "",
      url: window.location.href,
    });
  };

  const openFluxaMode = () => {
    if (!post) return;

    const prompt = buildAskFluxaPrompt({
      title: post.headline || post.title,
      summary: post.summary || post.context,
      category: post.category || post.topic,
      sourceName: post.source_url ? "Source article" : undefined,
    });

    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          prompt: prompt,
        },
      },
    });
  };

  const formatTimeAgo = (iso?: string | null) => {
    if (!iso) return "Just now";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Just now";

    const diff = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < hour) {
      const minutes = Math.max(1, Math.floor(diff / minute));
      return `${minutes}m ago`;
    }
    if (diff < day) {
      const hours = Math.max(1, Math.floor(diff / hour));
      return `${hours}h ago`;
    }

    const days = Math.max(1, Math.floor(diff / day));
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Post not found</h1>
          <p className="text-muted-foreground mb-6">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/feed")}>Go to Feed</Button>
        </div>
      </div>
    );
  }

  const fullText = post.script || post.narration
    ? `${post.context}\n\n${post.script || post.narration}`
    : post.context;

  const shouldTruncate = fullText.length > EXPAND_THRESHOLD;
  const displayText = expanded || !shouldTruncate
    ? fullText
    : fullText.slice(0, EXPAND_THRESHOLD) + "...";

  const handlePlay = (gistId: string, audioUrl: string | null) => {
    if (!audioUrl) return;
    // Navigate to feed with the playing gist
    navigate("/feed", { state: { playingGistId: gistId } });
  };

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 pt-4 pb-6 max-w-6xl lg:py-6">
        {/* Desktop Layout: 3 columns using grid */}
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          {/* Left Sidebar - Desktop Only */}
          <DesktopNavigationWidget />

          {/* Main Content */}
          <div className="w-full max-w-[640px] mx-auto lg:max-w-none lg:mx-0 lg:overflow-y-auto lg:h-full scrollbar-hide">
            {/* Header */}
            <button
              onClick={() => {
                // Navigate back based on origin query parameter
                if (origin === 'sports') {
                  navigate("/sports-hub");
                } else if (origin === 'team' && teamId) {
                  navigate(`/sports/team/${teamId}`);
                } else if (origin === 'live') {
                  navigate("/live");
                } else if (origin === 'music') {
                  if (artistId) {
                    navigate(`/music/artist/${artistId}`);
                  } else {
                    navigate("/music");
                  }
                } else {
                  navigate("/feed"); // Default fallback to feed
                }
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {
                origin === 'sports' ? 'Sports' :
                origin === 'team' ? 'Team' :
                origin === 'live' ? 'Live' :
                origin === 'music' ? (artistId ? 'Artist' : 'Music') :
                'Feed'
              }</span>
            </button>

        <Card className="overflow-hidden bg-card/90 backdrop-blur border-glass-border-light shadow-glass">
          <CardContent className="p-0">
            {(() => {
              // Validate image URLs - filter out empty strings, "null", and invalid URLs
              const isValidImageUrl = (url: string | null | undefined): boolean => {
                if (!url) return false;
                if (typeof url !== 'string') return false;
                if (url.trim() === '' || url === 'null' || url === 'undefined') return false;
                return true;
              };

              const heroImage =
                (isValidImageUrl(post.image_url) ? post.image_url : null) ||
                (isValidImageUrl(post.source_image_url) ? post.source_image_url : null) ||
                (isValidImageUrl(post.ai_image_url) ? post.ai_image_url : null) ||
                null;

              // Debug logging
              if (!heroImage && (post.image_url || post.source_image_url || post.ai_image_url)) {
                console.log('Image URLs found but invalid:', {
                  image_url: post.image_url,
                  source_image_url: post.source_image_url,
                  ai_image_url: post.ai_image_url
                });
              }

              if (!heroImage) {
                return (
                  <div className="w-full h-64 sm:h-80 bg-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <svg
                        className="w-14 h-14 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p>Image unavailable</p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="relative w-full h-64 sm:h-80 bg-muted overflow-hidden">
                  <img
                    src={heroImage}
                    alt={post.headline}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      console.error("Image failed to load:", heroImage);
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                            <div class="text-center p-4">
                              <svg class="w-16 h-16 mx-auto text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p class="text-sm text-muted-foreground">Image unavailable</p>
                            </div>
                          </div>
                        `;
                      }
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              );
            })()}

            <div className="p-6">
              {/* Topic + Fluxa Mode */}
              <div className="flex justify-between items-center mb-4">
                <Badge variant="secondary">{post.topic}</Badge>

                <button
                  onClick={openFluxaMode}
                  className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors"
                  aria-label="Ask Fluxa for deeper analysis"
                >
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary/20 transition-all">
                    <FluxaLogo size={18} fillColor="hsl(var(--primary))" />
                  </span>
                  <span className="font-semibold text-sm">Ask Fluxa</span>
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold mb-4 leading-tight">
                {post.headline}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimeAgo(post.published_at)}</span>
                </div>

                {views > 0 && (
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{views} views</span>
                  </div>
                )}

                {post.audio_url && (
                  <div className="flex items-center gap-1">
                    <Headphones className="w-4 h-4 opacity-70" />
                    <span>Audio available</span>
                  </div>
                )}

                {post.source_url || post.url ? (
                  <a
                    href={post.source_url || post.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View source
                  </a>
                ) : null}
              </div>

              {/* Body */}
              <div className="mb-6">
                <p className="text-base leading-relaxed whitespace-pre-line text-foreground">
                  {displayText}
                </p>

                {shouldTruncate && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-primary mt-3 font-semibold hover:underline transition-colors"
                  >
                    {expanded ? "See Less" : "See More"}
                  </button>
                )}
              </div>

              {/* Audio Player */}
              {post.audio_url && (
                <div className="mb-6 p-4 bg-secondary/50 rounded-lg">
                  <audio controls className="w-full" src={post.audio_url}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-6 pt-4 border-t border-border">
                {(postSource === "gist" || postSource === "news") && (
                  <>
                    <button
                      onClick={toggleLike}
                      className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors"
                      aria-label="Like post"
                    >
                      <Heart
                        className={`w-6 h-6 ${
                          isLiked ? "fill-red-500 text-red-500" : ""
                        }`}
                      />
                      <span>{likes}</span>
                    </button>

                    <button
                      onClick={toggleBookmark}
                      className="flex items-center gap-2 text-muted-foreground hover:text-coral-active transition-colors"
                      aria-label="Bookmark post"
                    >
                      <Bookmark
                        className={`w-6 h-6 ${
                          isBookmarked
                            ? "fill-coral-active text-coral-active"
                            : ""
                        }`}
                      />
                      <span>{bookmarks}</span>
                    </button>
                  </>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="w-6 h-6" />
                  <span>{post.comments_count || post.comment_count || 0}</span>
                </div>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors ml-auto"
                  aria-label="Share post"
                >
                  <Share2 className="w-6 h-6" />
                </button>
              </div>

              {/* Comments Section - For gist posts and content_items */}
              {(postSource === "gist" || postSource === "news") && (
                <div className="mt-8 pt-6 border-t border-border">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Comments ({comments.length})
                  </h2>

                  {/* Comment Input */}
                  <div className="mb-6">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="min-h-[100px] mb-2"
                      disabled={isSubmittingComment}
                    />
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="w-full sm:w-auto"
                    >
                      {isSubmittingComment ? (
                        "Posting..."
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Post Comment
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Comments List */}
                  {isLoadingComments ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading comments...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No comments yet. Be the first to comment!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment: any) => (
                        <div
                          key={comment.id}
                          className="flex gap-3 p-4 bg-secondary/50 rounded-lg"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={comment.profile?.avatar_url}
                              alt={comment.profile?.display_name || "User"}
                            />
                            <AvatarFallback>
                              {(comment.profile?.display_name || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                {comment.profile?.display_name || "Anonymous"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
          </div>

          {/* Right Sidebar - Desktop Only */}
          <DesktopRightWidgets
            trendingGists={trendingGists.length > 0 ? trendingGists.map(g => ({
              id: g.id,
              headline: g.headline,
              audio_url: g.audio_url || '',
              image_url: g.image_url,
              context: g.context || '',
              topic: g.topic,
              topic_category: g.topic_category
            })) : undefined}
            onPlay={trendingGists.length > 0 ? (gistId, audioUrl) => handlePlay(gistId, audioUrl) : undefined}
          />
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
