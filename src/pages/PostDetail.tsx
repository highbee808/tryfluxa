import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import BottomNavigation from "@/components/BottomNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Eye,
  Clock,
  Headphones
} from "lucide-react";

import { FluxaLogo } from "@/components/FluxaLogo";

interface Gist {
  id: string;
  headline: string;
  context: string;
  script: string;
  image_url: string | null;
  topic: string;
  published_at: string;
  play_count: number;
  like_count: number;
  save_count: number;
  comment_count: number;
  credibility_score: number;
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState<Gist | null>(null);
  const [expanded, setExpanded] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [bookmarks, setBookmarks] = useState(0);

  useEffect(() => {
    if (!id) return;
    loadPost();
  }, [id]);

  async function loadPost() {
    const { data, error } = await supabase
      .from("gists")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error loading post:", error);
      return;
    }

    if (data) {
      setPost(data);
      setLikes(data.like_count || 0);
      setBookmarks(data.save_count || 0);
    }

    // Load user actions
    const authUser = await supabase.auth.getUser();

    if (authUser.data.user) {
      const userId = authUser.data.user.id;

      const { data: likeData } = await supabase
        .from("article_likes")
        .select("id")
        .eq("article_id", id)
        .eq("user_id", userId)
        .maybeSingle();

      const { data: saveData } = await supabase
        .from("article_saves")
        .select("id")
        .eq("article_id", id)
        .eq("user_id", userId)
        .maybeSingle();

      setIsLiked(!!likeData);
      setIsBookmarked(!!saveData);
    }
  }

  const toggleLike = async () => {
    if (!id) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    if (isLiked) {
      await supabase.from("article_likes").delete().eq("article_id", id).eq("user_id", user.id);
      setLikes((l) => l - 1);
    } else {
      await supabase.from("article_likes").insert({ article_id: id, user_id: user.id });
      setLikes((l) => l + 1);
    }

    setIsLiked(!isLiked);
  };

  const toggleBookmark = async () => {
    if (!id) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    if (isBookmarked) {
      await supabase.from("article_saves").delete().eq("article_id", id).eq("user_id", user.id);
      setBookmarks((b) => b - 1);
    } else {
      await supabase.from("article_saves").insert({ article_id: id, user_id: user.id });
      setBookmarks((b) => b + 1);
    }

    setIsBookmarked(!isBookmarked);
  };

  const handleShare = () => {
    navigator.share?.({
      title: post?.headline,
      text: post?.context,
      url: window.location.href,
    });
  };

  const openFluxaMode = () => {
    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          gistId: post?.id,
          topic: post?.topic,
          headline: post?.headline,
          context: post?.context,
          fullContext: post?.context + "\n\n" + post?.script,
        },
      },
    });
  };

  if (!post) return <div className="p-6">Loading...</div>;

  const bodyText = `${post.context}\n\n${post.script}`;
  const collapsedText = bodyText.slice(0, 250);

  return (
    <div className="pb-24">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <button
          onClick={() => navigate("/feed")}
          className="text-muted-foreground mb-4"
        >
          ← Back
        </button>

        <Card className="overflow-hidden bg-card/90 backdrop-blur border-glass-border-light shadow-glass">
          <CardContent className="p-0">
            {post.image_url && (
              <img
                src={post.image_url}
                alt={post.headline}
                className="w-full h-60 object-cover"
              />
            )}

            <div className="p-6">
              {/* Topic + Fluxa Mode */}
              <div className="flex justify-between items-center mb-3">
                <Badge>{post.topic}</Badge>

                <button
                  onClick={openFluxaMode}
                  className="flex items-center gap-2 text-primary"
                >
                  <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <FluxaLogo size={18} fillColor="hsl(var(--primary))" />
                  </span>
                  <span className="font-semibold">Fluxa Mode</span>
                </button>
              </div>

              <h1 className="text-2xl font-bold mb-4">{post.headline}</h1>

              {/* Meta */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>5 min read</span>
                </div>

                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{post.play_count}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Headphones className="w-4 h-4 opacity-70" />
                  <span>{post.play_count} listens</span>
                </div>
              </div>

              {/* Body */}
              <p className="text-base whitespace-pre-line text-foreground">
                {expanded ? bodyText : collapsedText}
              </p>

              {bodyText.length > 250 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-primary mt-2 font-semibold"
                >
                  {expanded ? "See Less" : "See More"}
                </button>
              )}

              {/* Actions */}
              <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border">
                <button
                  onClick={toggleLike}
                  className="flex items-center gap-2 text-muted-foreground hover:text-red-500"
                >
                  <Heart
                    className={`w-6 h-6 ${
                      isLiked ? "fill-red-500 text-red-500" : ""
                    }`}
                  />
                  <span>{likes}</span>
                </button>

                <button
                  onClick={() => {}}
                  className="flex items-center gap-2 text-muted-foreground hover:text-blue-500"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span>{post.comment_count}</span>
                </button>

                <button
                  onClick={toggleBookmark}
                  className="flex items-center gap-2 text-muted-foreground hover:text-coral-active"
                >
                  <Bookmark
                    className={`w-6 h-6 ${
                      isBookmarked ? "fill-coral-active text-coral-active" : ""
                    }`}
                  />
                  <span>{bookmarks}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 text-muted-foreground hover:text-green-500"
                >
                  <Share2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}
