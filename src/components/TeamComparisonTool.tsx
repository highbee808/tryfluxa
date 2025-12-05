import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdminFunction } from "@/lib/invokeAdminFunction";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface TeamStats {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string[];
}

export const TeamComparisonTool = () => {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<{
    team1Stats: TeamStats;
    team2Stats: TeamStats;
    analysis: string;
    headToHead: string;
  } | null>(null);
  const { toast } = useToast();

  const compareTeams = async () => {
    if (!team1 || !team2) {
      toast({
        title: "Missing teams",
        description: "Please enter both team names",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await invokeAdminFunction('compare-teams', {
        team1, team2, userId: user?.id
      });

      if (error) throw error;

      setComparison(data);
      toast({
        title: "Comparison complete",
        description: "AI analysis ready!",
      });
    } catch (error) {
      console.error('Error comparing teams:', error);
      toast({
        title: "Error",
        description: "Failed to compare teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (value1: number, value2: number) => {
    if (value1 > value2) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value1 < value2) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Team Comparison Tool</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Team 1</label>
          <Input
            placeholder="e.g., Manchester United"
            value={team1}
            onChange={(e) => setTeam1(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Team 2</label>
          <Input
            placeholder="e.g., Liverpool"
            value={team2}
            onChange={(e) => setTeam2(e.target.value)}
          />
        </div>
      </div>

      <Button
        onClick={compareTeams}
        disabled={loading}
        className="w-full mb-6"
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Compare Teams
      </Button>

      {comparison && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 bg-primary/5">
              <h3 className="font-bold mb-4">{comparison.team1Stats.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Wins:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{comparison.team1Stats.wins}</span>
                    {getTrendIcon(comparison.team1Stats.wins, comparison.team2Stats.wins)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Goals For:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{comparison.team1Stats.goalsFor}</span>
                    {getTrendIcon(comparison.team1Stats.goalsFor, comparison.team2Stats.goalsFor)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Form:</span>
                  <div className="flex gap-1">
                    {comparison.team1Stats.form.map((result, i) => (
                      <Badge
                        key={i}
                        variant={result === 'W' ? 'default' : result === 'L' ? 'destructive' : 'secondary'}
                        className="text-xs w-6 h-6 flex items-center justify-center p-0"
                      >
                        {result}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-secondary/5">
              <h3 className="font-bold mb-4">{comparison.team2Stats.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Wins:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{comparison.team2Stats.wins}</span>
                    {getTrendIcon(comparison.team2Stats.wins, comparison.team1Stats.wins)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Goals For:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{comparison.team2Stats.goalsFor}</span>
                    {getTrendIcon(comparison.team2Stats.goalsFor, comparison.team1Stats.goalsFor)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Form:</span>
                  <div className="flex gap-1">
                    {comparison.team2Stats.form.map((result, i) => (
                      <Badge
                        key={i}
                        variant={result === 'W' ? 'default' : result === 'L' ? 'destructive' : 'secondary'}
                        className="text-xs w-6 h-6 flex items-center justify-center p-0"
                      >
                        {result}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* AI Analysis */}
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10">
            <h3 className="font-bold mb-2">🤖 Fluxa's Analysis</h3>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {comparison.analysis}
            </p>
          </Card>

          {/* Head to Head */}
          <Card className="p-4">
            <h3 className="font-bold mb-2">Head-to-Head Record</h3>
            <p className="text-sm text-muted-foreground">
              {comparison.headToHead}
            </p>
          </Card>
        </motion.div>
      )}
    </Card>
  );
};