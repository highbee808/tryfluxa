import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Flame } from "lucide-react";
import { TrendingCarousel } from "@/components/TrendingCarousel";

export type TrendingWidgetGist = {
  id: string;
  headline: string;
  image_url: string | null;
  topic?: string;
  topic_category?: string | null;
};

interface DesktopRightWidgetsProps {
  trendingGists?: TrendingWidgetGist[];
}

export const DesktopRightWidgets = ({ trendingGists }: DesktopRightWidgetsProps) => {
  const curatedTopics = [
    { topic: "AI Revolution", posts: "1.2k posts" },
    { topic: "Voice Interfaces", posts: "864 posts" },
    { topic: "Sports Tech", posts: "643 posts" },
    { topic: "Creator Economy", posts: "521 posts" },
  ];

  return (
    <div className="hidden lg:flex flex-col gap-6 sticky top-24 self-start">
      <Card className="glass rounded-3xl border-glass-border-light">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Discover</p>
              <h3 className="text-lg font-semibold">Trending right now</h3>
            </div>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-3">
            {curatedTopics.map((item) => (
              <button
                key={item.topic}
                className="w-full glass-light rounded-2xl px-4 py-3 text-left border border-white/5 hover:border-white/20 transition"
              >
                <p className="text-sm font-semibold">#{item.topic}</p>
                <p className="text-xs text-muted-foreground">{item.posts}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {trendingGists && trendingGists.length > 0 && (
        <Card className="glass rounded-3xl border-glass-border-light">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Fluxa Picks</p>
                <h3 className="text-lg font-semibold">Moments to follow</h3>
              </div>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <TrendingCarousel gists={trendingGists} fullWidth />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
