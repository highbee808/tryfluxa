import { FeedCard } from './FeedCard';
import { useArticleLikes, useArticleSaves, useDeeperSummary } from '@/hooks/useSocialFeatures';

interface FeedCardWithSocialProps {
  id: string;
  imageUrl?: string;
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
  onPlay: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

export const FeedCardWithSocial = (props: FeedCardWithSocialProps) => {
  const { isLiked, likesCount, toggleLike } = useArticleLikes(props.id);
  const { isSaved, toggleSave } = useArticleSaves(props.id);
  const { requested, requestDeeperSummary } = useDeeperSummary(props.id);

  return (
    <FeedCard
      {...props}
      likes={likesCount}
      isLiked={isLiked}
      bookmarks={0}
      isBookmarked={isSaved}
      onLike={toggleLike}
      onBookmark={toggleSave}
      onDeeperSummary={requestDeeperSummary}
      deeperSummaryRequested={requested}
    />
  );
};
