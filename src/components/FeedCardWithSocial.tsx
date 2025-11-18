import type { ReactNode } from 'react';
import { FeedCard } from './FeedCard';
import { useArticleLikes, useArticleSaves } from '@/hooks/useSocialFeatures';

interface FeedCardWithSocialProps {
  id: string;
  imageUrl?: string;
  headline: ReactNode;
  context: ReactNode;
  headlineText?: string;
  contextText?: string;
  fullContext?: string;
  author?: string;
  authorAvatar?: string;
  timeAgo?: string;
  category?: string;
  readTime?: string;
  comments?: number;
  credibilityScore?: number;
  views?: number;
  shares?: number;
  onShare?: () => void;
}

export const FeedCardWithSocial = (props: FeedCardWithSocialProps) => {
  const { isLiked, likesCount, toggleLike } = useArticleLikes(props.id);
  const { isSaved, toggleSave } = useArticleSaves(props.id);

  return (
    <FeedCard
      {...props}
      likes={likesCount}
      isLiked={isLiked}
      bookmarks={0}
      isBookmarked={isSaved}
      views={props.views || 0}
      shares={props.shares || 0}
      comments={props.comments || 0}
      onLike={toggleLike}
      onBookmark={toggleSave}
    />
  );
};
