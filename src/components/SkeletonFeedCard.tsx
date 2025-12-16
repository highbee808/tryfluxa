import { Card, CardContent } from "@/components/ui/card";

export const SkeletonFeedCard = () => {
  return (
    <Card className="w-full overflow-hidden border border-border shadow-md">
      <CardContent className="p-0">
        {/* Top Author Row Skeleton */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="h-5 w-12 bg-muted animate-pulse rounded" />
        </div>

        {/* Image Skeleton */}
        <div className="w-full h-48 sm:h-64 bg-muted animate-pulse" />

        {/* Content Skeleton */}
        <div className="p-6 space-y-3">
          <div className="h-6 w-full bg-muted animate-pulse rounded" />
          <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
          
          {/* Actions Skeleton */}
          <div className="flex items-center gap-5 pt-4 border-t border-border">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="h-5 w-12 bg-muted animate-pulse rounded" />
            <div className="h-5 w-12 bg-muted animate-pulse rounded" />
            <div className="h-5 w-12 bg-muted animate-pulse rounded" />
            <div className="h-5 w-12 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
