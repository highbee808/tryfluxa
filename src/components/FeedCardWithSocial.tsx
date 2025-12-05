import { FeedCard } from './FeedCard';
import { useArticleLikes, useArticleSaves, useDeeperSummary } from '@/hooks/useSocialFeatures';

interface FeedCardWithSocialProps {
  id: string;
  imageUrl?: string;
  imageUrls?: {
    primary?: string | null;
    source?: string | null;
    ai?: string | null;
  };
  headline: string;
  context: string;
  author?: string;
  authorAvatar?: string;
  timeAgo?: string;
  category?: string;
  readTime?: string;
  comments?: number;
  credibilityScore?: number;
  isPlaying: boolean;
  views?: number;
  plays?: number;
  shares?: number;
  onPlay: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onCardClick?: () => void;
  onFluxaAnalysis?: () => void;
}

export const FeedCardWithSocial = (props: FeedCardWithSocialProps) => {
  const { isLiked, likesCount, toggleLike } = useArticleLikes(props.id);
  const { isSaved, toggleSave } = useArticleSaves(props.id);
  const { requested, requestDeeperSummary } = useDeeperSummary(props.id);

  return (
    <FeedCard
      {...props}
      imageUrls={props.imageUrls}
      likes={likesCount}
      isLiked={isLiked}
      bookmarks={0}
      isBookmarked={isSaved}
      views={props.views || 0}
      plays={props.plays || 0}
      shares={props.shares || 0}
      comments={props.comments || 0}
      onLike={toggleLike}
      onBookmark={toggleSave}
      onCardClick={props.onCardClick}
      onFluxaAnalysis={props.onFluxaAnalysis}
    />
  );
};
