import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Clock, Trophy, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdminFunction } from "@/lib/invokeAdminFunction";
import { toast } from "sonner";

interface Match {
  match_id: string;
  team_home: string;
  team_away: string;
  score_home: number | null;
  score_away: number | null;
  status: string;
  match_date: string;
  league: string;
}

interface MatchesCarouselProps {
  entity: any;
  primaryColor: string;
  secondaryColor: string;
}

export const MatchesCarousel = ({ entity, primaryColor, secondaryColor }: MatchesCarouselProps) => {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<{ [matchId: string]: any }>({});
  const [loadingPrediction, setLoadingPrediction] = useState<string | null>(null);

  useEffect(() => {
    if (entity.category === 'sports') {
      fetchAllMatches();
    }
  }, [entity.name]);

  const fetchAllMatches = async () => {
    try {
      // Fetch recent matches (finished)
      const { data: recentMatches } = await supabase
        .from("match_results")
        .select("*")
        .or(`team_home.eq.${entity.name},team_away.eq.${entity.name}`)
        .in("status", ["Final", "FT", "Match Finished", "AOT", "AET"])
        .order("match_date", { ascending: false })
        .limit(5);

      // Fetch upcoming matches
      const { data: upcomingMatches } = await supabase
        .from("match_results")
        .select("*")
        .or(`team_home.eq.${entity.name},team_away.eq.${entity.name}`)
        .in("status", ["Scheduled", "NS", "TBD", "Upcoming"])
        .order("match_date", { ascending: true })
        .limit(5);

      const combined = [...(recentMatches || []), ...(upcomingMatches || [])];
      setAllMatches(combined);
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  const getPrediction = async (matchId: string) => {
    if (predictions[matchId]) {
      return; // Already loaded
    }

    setLoadingPrediction(matchId);
    try {
      const { data, error } = await invokeAdminFunction("predict-match", {
        matchId
      });

      if (error) throw new Error(error.message || 'Prediction failed');

      setPredictions((prev) => ({
        ...prev,
        [matchId]: data.prediction,
      }));

      toast.success("Fluxa's prediction loaded! 🔮");
    } catch (error: any) {
      console.error("Error getting prediction:", error);
      toast.error("Failed to get prediction");
    } finally {
      setLoadingPrediction(null);
    }
  };

  const isUpcoming = (status: string) => {
    return ["Scheduled", "NS", "TBD", "Upcoming"].includes(status);
  };

  const isRecent = (status: string) => {
    return ["Final", "FT", "Match Finished", "AOT", "AET"].includes(status);
  };

  if (entity.category !== 'sports' || allMatches.length === 0) {
    // Fallback to original logic for non-sports or when no matches
    return null;
  }

  return (
    <Card className="mt-6 p-6">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        📅 Matches & Fixtures
      </h3>
      <Carousel className="w-full">
        <CarouselContent>
          {allMatches.map((match) => {
            const prediction = predictions[match.match_id];
            const upcoming = isUpcoming(match.status);
            const recent = isRecent(match.status);

            return (
              <CarouselItem key={match.match_id} className="md:basis-1/2 lg:basis-1/3">
                <Card
                  className={`p-4 h-full transition-colors ${
                    upcoming
                      ? "border-2 hover:border-primary"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  style={upcoming ? { borderColor: primaryColor } : {}}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant={upcoming ? "outline" : "secondary"} className="font-bold">
                        {upcoming ? "⚽ Upcoming" : "⏮️ Recent"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {match.league}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div className="text-center flex-1">
                        <p className="font-bold text-sm mb-2">{match.team_home}</p>
                        {!upcoming && (
                          <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                            {match.score_home ?? "-"}
                          </p>
                        )}
                      </div>
                      <div className="text-muted-foreground px-3 text-sm font-bold">
                        {upcoming ? "VS" : "-"}
                      </div>
                      <div className="text-center flex-1">
                        <p className="font-bold text-sm mb-2">{match.team_away}</p>
                        {!upcoming && (
                          <p className="text-2xl font-bold" style={{ color: secondaryColor }}>
                            {match.score_away ?? "-"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-center pt-2 border-t">
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(match.match_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* AI Prediction Section for Upcoming Matches */}
                    {upcoming && (
                      <div className="pt-3 border-t">
                        {prediction ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3" style={{ color: primaryColor }} />
                                Fluxa's Prediction
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-xs"
                                style={{
                                  backgroundColor: `${primaryColor}20`,
                                  color: primaryColor,
                                }}
                              >
                                {prediction.confidence}% confident
                              </Badge>
                            </div>
                            <p className="text-xs font-bold">{prediction.prediction}</p>
                            <p className="text-xs text-muted-foreground italic">
                              {prediction.reasoning}
                            </p>
                            <p className="text-xs font-semibold">
                              Score: {prediction.predicted_score}
                            </p>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => getPrediction(match.match_id)}
                            disabled={loadingPrediction === match.match_id}
                          >
                            {loadingPrediction === match.match_id ? (
                              <>Loading...</>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 mr-1" />
                                Get Fluxa's Prediction
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}

                    {recent && match.score_home !== null && match.score_away !== null && (
                      <div className="pt-3 border-t text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Trophy className="w-4 h-4" style={{ color: primaryColor }} />
                          <span className="text-xs font-bold">
                            {match.score_home > match.score_away
                              ? `${match.team_home} Won`
                              : match.score_away > match.score_home
                              ? `${match.team_away} Won`
                              : "Draw"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </Card>
  );
};
