import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useArticleLikes = (articleId: string) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkLikeStatus();
    fetchLikesCount();
  }, [articleId]);

  const checkLikeStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('article_likes')
        .select('id')
        .eq('article_id', articleId)
        .eq('user_id', user.id)
        .single();

      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const fetchLikesCount = async () => {
    try {
      const { count } = await supabase
        .from('article_likes')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId);

      setLikesCount(count || 0);
    } catch (error) {
      console.error('Error fetching likes count:', error);
    }
  };

  const toggleLike = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSocialFeatures.ts:toggleLike-entry',message:'toggleLike called',data:{articleId,isLiked,loading},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    // Prevent multiple clicks while loading
    if (loading) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSocialFeatures.ts:toggleLike-blocked',message:'Blocked - already loading',data:{articleId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to like articles',
          variant: 'destructive',
        });
        return;
      }

      if (isLiked) {
        await supabase
          .from('article_likes')
          .delete()
          .eq('article_id', articleId)
          .eq('user_id', user.id);

        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        await supabase.from('article_likes').insert({
          article_id: articleId,
          user_id: user.id,
        });

        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSocialFeatures.ts:toggleLike-success',message:'Like toggled successfully',data:{articleId,newIsLiked:!isLiked},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      console.error('Error toggling like:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSocialFeatures.ts:toggleLike-error',message:'Error toggling like',data:{articleId,error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      toast({
        title: 'Error',
        description: 'Failed to update like status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return { isLiked, likesCount, toggleLike, loading };
};

export const useArticleSaves = (articleId: string) => {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSaveStatus();
  }, [articleId]);

  const checkSaveStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('article_saves')
        .select('id')
        .eq('article_id', articleId)
        .eq('user_id', user.id)
        .single();

      setIsSaved(!!data);
    } catch (error) {
      console.error('Error checking save status:', error);
    }
  };

  const toggleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to save articles',
          variant: 'destructive',
        });
        return;
      }

      if (isSaved) {
        await supabase
          .from('article_saves')
          .delete()
          .eq('article_id', articleId)
          .eq('user_id', user.id);

        setIsSaved(false);
        toast({
          title: 'Removed from saved',
          description: 'Article removed from your saved items',
        });
      } else {
        await supabase.from('article_saves').insert({
          article_id: articleId,
          user_id: user.id,
        });

        setIsSaved(true);
        toast({
          title: 'Saved!',
          description: 'Article saved to your collection',
        });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast({
        title: 'Error',
        description: 'Failed to update save status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return { isSaved, toggleSave, loading };
};

export const useDeeperSummary = (articleId: string) => {
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkRequestStatus();
  }, [articleId]);

  const checkRequestStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('deeper_summary_requests')
        .select('id')
        .eq('article_id', articleId)
        .eq('user_id', user.id)
        .single();

      setRequested(!!data);
    } catch (error) {
      console.error('Error checking request status:', error);
    }
  };

  const requestDeeperSummary = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to request deeper summaries',
          variant: 'destructive',
        });
        return;
      }

      if (requested) {
        toast({
          title: 'Already requested',
          description: 'You have already requested a deeper summary for this article',
        });
        return;
      }

      await supabase.from('deeper_summary_requests').insert({
        article_id: articleId,
        user_id: user.id,
      });

      setRequested(true);
      toast({
        title: 'Request submitted!',
        description: 'Fluxa will analyze this deeper. Check back soon!',
      });
    } catch (error) {
      console.error('Error requesting deeper summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return { requested, requestDeeperSummary, loading };
};
