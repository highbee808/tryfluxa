import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { TrendingCarousel } from "@/components/TrendingCarousel";

export type TrendingWidgetGist = {
  id: string;
  headline: string;
  audio_url: string;
  image_url: string | null;
  context: string;
  topic: string;
  topic_category?: string | null;
};

interface DesktopRightWidgetsProps {
  trendingGists?: TrendingWidgetGist[];
  currentPlayingId?: string | null;
  onPlay?: (gistId: string, audioUrl: string) => void;
}

export const DesktopRightWidgets = ({
  trendingGists,
  currentPlayingId,
  onPlay,
}: DesktopRightWidgetsProps) => {
  return (
    <div className="hidden lg:flex flex-col gap-6 sticky bottom-6 self-start max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide">
      <Card className="shadow-glass border-glass-border-light glass">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Trending Topics</h3>
          </div>
          <div className="space-y-3">
            {[
              { topic: "AI Revolution", posts: "1.2k posts" },
              { topic: "Audio Content", posts: "856 posts" },
              { topic: "Digital Wellness", posts: "643 posts" },
              { topic: "Voice Tech", posts: "521 posts" },
              { topic: "Productivity", posts: "412 posts" },
            ].map((item, i) => (
              <div
                key={i}
                className="p-3 bg-secondary/50 rounded-lg hover:bg-secondary/70 cursor-pointer transition-colors"
              >
                <p className="text-sm font-medium">{item.topic}</p>
                <p className="text-xs text-muted-foreground">{item.posts}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {trendingGists && trendingGists.length > 0 && onPlay && (
        <Card className="glass rounded-3xl border-glass-border-light">
          <CardContent className="p-5 pb-3">
            <TrendingCarousel
              gists={trendingGists}
              onPlay={onPlay}
              currentPlayingId={currentPlayingId}
              fullWidth
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
