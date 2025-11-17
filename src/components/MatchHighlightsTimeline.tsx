import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Goal, Clock, AlertCircle, Users } from "lucide-react";

interface MatchEvent {
  id: string;
  type: 'goal' | 'card' | 'substitution' | 'half_time' | 'full_time';
  time: string;
  team: 'home' | 'away';
  player?: string;
  description: string;
}

interface MatchHighlightsTimelineProps {
  events: MatchEvent[];
  homeTeam: string;
  awayTeam: string;
}

export const MatchHighlightsTimeline = ({ events, homeTeam, awayTeam }: MatchHighlightsTimelineProps) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal':
        return <Goal className="w-5 h-5 text-green-500" />;
      case 'card':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'substitution':
        return <Users className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'goal':
        return 'bg-green-500/10 border-green-500';
      case 'card':
        return 'bg-yellow-500/10 border-yellow-500';
      case 'substitution':
        return 'bg-blue-500/10 border-blue-500';
      default:
        return 'bg-muted/10 border-muted';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-6">Match Timeline</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
        
        <div className="space-y-4">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-start gap-4"
            >
              {/* Timeline marker */}
              <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-2 ${getEventColor(event.type)}`}>
                {getEventIcon(event.type)}
              </div>
              
              {/* Event details */}
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono">
                    {event.time}'
                  </Badge>
                  <Badge variant={event.team === 'home' ? 'default' : 'secondary'}>
                    {event.team === 'home' ? homeTeam : awayTeam}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
                
                {event.player && (
                  <p className="text-sm font-medium mt-1">
                    {event.player}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
};