import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

interface LiveMatchRoomProps {
  isOpen: boolean;
  onClose: () => void;
  match: {
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    match_time: string;
    league: string;
    match_id?: string;
  };
  entityId: string;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_email?: string;
}

export const LiveMatchRoom = ({ isOpen, onClose, match, entityId }: LiveMatchRoomProps) => {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !match.match_id) return;

    // Load existing comments
    loadComments();

    // Subscribe to new comments
    const channel = supabase
      .channel(`match-${match.match_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fan_posts',
          filter: `entity_id=eq.${entityId}`
        },
        (payload) => {
          const newComment = payload.new as Comment;
          setComments(prev => [newComment, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, match.match_id, entityId]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('fan_posts')
      .select('*')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading comments:', error);
      return;
    }

    setComments(data || []);
  };

  const handlePostComment = async () => {
    if (!comment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to sign in to comment",
        variant: "destructive"
      });
      return;
    }

    setIsPosting(true);
    const { error } = await supabase
      .from('fan_posts')
      .insert({
        entity_id: entityId,
        user_id: user.id,
        content: comment,
        reactions: {}
      });

    if (error) {
      toast({
        title: "Error posting comment",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setComment('');
      toast({
        title: "Comment posted!",
        description: "Your comment has been shared with the fanbase"
      });
    }

    setIsPosting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              LIVE MATCH
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Live Score Header */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{match.league}</span>
            <span className="text-sm font-semibold text-red-500">{match.match_time}</span>
          </div>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center flex-1">
              <div className="text-lg font-semibold mb-2">{match.home_team}</div>
              <div className="text-4xl font-bold text-primary">{match.home_score}</div>
            </div>
            <div className="text-2xl text-muted-foreground">VS</div>
            <div className="text-center flex-1">
              <div className="text-lg font-semibold mb-2">{match.away_team}</div>
              <div className="text-4xl font-bold text-primary">{match.away_score}</div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-secondary/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium">Fan</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts with the fanbase..."
            className="flex-1 min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePostComment();
              }
            }}
          />
          <Button 
            onClick={handlePostComment} 
            disabled={isPosting || !comment.trim()}
            className="h-[60px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
