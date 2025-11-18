import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Gist {
  id: string;
  headline: string;
  context: string;
  image_url: string | null;
  topic: string;
  play_count?: number;
}

interface TrendingCarouselProps {
  gists: Gist[];
  onPlay: (gistId: string, audioUrl: string) => void;
  currentPlayingId: string | null;
  fullWidth?: boolean;
  className?: string;
}

export const TrendingCarousel = ({ gists, onPlay, currentPlayingId, fullWidth = false, className }: TrendingCarouselProps) => {
  const autoplayPlugin = Autoplay({ delay: 4000, stopOnInteraction: false });

  if (gists.length === 0) return null;

  return (
    <div className={cn("mb-4 trending-carousel", className)}>
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[autoplayPlugin]}
        className="w-full"
      >
        <CarouselContent>
          {gists.map((gist) => (
            <CarouselItem
              key={gist.id}
              className={fullWidth ? "basis-full" : "md:basis-1/2 lg:basis-1/3"}
            >
              <Card className="overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 bg-card cursor-pointer group">
                <CardContent className="p-0">
                  {gist.image_url && (
                    <div className="relative overflow-hidden">
                      <img
                        src={gist.image_url}
                        alt={gist.headline}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Badge className="absolute top-3 right-3 bg-primary/90 backdrop-blur-sm">
                        🔥 {gist.play_count || 0} plays
                      </Badge>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {gist.headline}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {gist.context}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
};
